"""
CrisisConnect — FastAPI Backend
Endpoints: /search, /chat, /report, /health
"""
import os
import json
import math
import time
import hashlib
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

app = FastAPI(
    title="CrisisConnect API",
    description="Emergency Resource Finder Backend",
    version="1.0.0"
)

# CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load services data
SERVICES_PATH = Path(__file__).parent / "data" / "services.json"
services_data: list[dict] = []

def load_services():
    global services_data
    if SERVICES_PATH.exists():
        with open(SERVICES_PATH, "r", encoding="utf-8") as f:
            services_data = json.load(f)
    else:
        services_data = []

load_services()

# In-memory reports store (would be a database in production)
reports_store: list[dict] = []


# --- Models ---
class SearchRequest(BaseModel):
    query: str
    lat: float = 12.9716
    lng: float = 77.5946
    radius_m: int = 10000
    lang: str = "en"

class ChatRequest(BaseModel):
    messages: list[dict]
    lat: float = 12.9716
    lng: float = 77.5946
    city: str = "Bengaluru"

class ReportRequest(BaseModel):
    service_id: str
    status: str  # "available" or "unavailable"
    lat: float
    lng: float


# --- Helpers ---
def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) *
         math.sin(d_lng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# Simple keyword-based intent classifier (fallback when Anthropic is unavailable)
INTENT_MAP = {
    "hospital": ["hospital", "doctor", "medical", "ambulance", "bleed", "injur", "pain", "hurt", "fever", "sick", "health", "medicine", "fracture", "bone"],
    "shelter": ["shelter", "homeless", "sleep", "roof", "housing", "place to stay"],
    "food_bank": ["food", "hungry", "eat", "meal", "starv", "food bank", "ration"],
    "police": ["police", "theft", "rob", "stolen", "crime", "arrest", "fir", "complaint"],
    "fire": ["fire", "burn", "blaze", "smoke"],
    "mental_health": ["mental", "depress", "anxiety", "suicid", "counsel", "therap", "stress", "panic"],
    "legal_aid": ["legal", "lawyer", "bail", "rights", "court", "advocate"],
    "domestic_violence": ["domestic", "violence", "abuse", "husband", "wife", "partner", "beat", "hit me"],
    "substance_abuse": ["drug", "alcohol", "addict", "rehab", "substance", "overdose"],
    "disaster_relief": ["flood", "earthquake", "tsunami", "disaster", "evacuat", "rescue", "storm"],
}

URGENCY_KEYWORDS = [
    "heart attack", "cardiac arrest", "not breathing", "dying", "suicide",
    "kill myself", "stabbed", "shot", "gunshot", "drowning", "choking", "unconscious"
]

DOMAIN_MAP = {
    "hospital": "medical", "shelter": "social", "food_bank": "social",
    "police": "legal", "fire": "disaster", "mental_health": "medical",
    "legal_aid": "legal", "domestic_violence": "social",
    "substance_abuse": "medical", "disaster_relief": "disaster"
}


def classify_intent(query: str) -> dict:
    lower = query.lower()
    for intent, keywords in INTENT_MAP.items():
        if any(kw in lower for kw in keywords):
            is_urgent = any(kw in lower for kw in URGENCY_KEYWORDS)
            return {
                "intent": intent,
                "urgency": "high" if is_urgent else "low",
                "domain": DOMAIN_MAP.get(intent, "general"),
                "keywords_detected": [kw for kw in keywords if kw in lower]
            }
    return {
        "intent": "general",
        "urgency": "low",
        "domain": "general",
        "keywords_detected": []
    }


def try_anthropic_classify(query: str) -> Optional[dict]:
    """Try to classify using Anthropic API. Returns None if unavailable."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        system_prompt = """You are an emergency service intent classifier.
Return ONLY valid JSON, no other text, no markdown, no explanation.

From the user message, return this exact structure:
{
  "intent": one of [hospital, shelter, food_bank, police, fire, mental_health, legal_aid, domestic_violence, substance_abuse, disaster_relief, general],
  "urgency": "high" | "low",
  "domain": "medical" | "social" | "legal" | "disaster" | "general",
  "keywords_detected": ["array", "of", "matched", "terms"]
}"""

        response = client.messages.create(
            model="claude-haiku-4-5-20241022",
            max_tokens=200,
            system=system_prompt,
            messages=[{"role": "user", "content": query}],
        )

        return json.loads(response.content[0].text)
    except Exception:
        return None


# --- Endpoints ---

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": time.time(), "services_loaded": len(services_data)}


@app.post("/search")
async def search(body: SearchRequest):
    # Step 1: Classify intent
    classification = try_anthropic_classify(body.query)
    if not classification:
        classification = classify_intent(body.query)

    intent = classification["intent"]
    radius_km = body.radius_m / 1000

    # Step 2: Filter services by category + radius
    if intent == "general":
        nearby = services_data
    else:
        nearby = [s for s in services_data if s["category"] == intent]

    results = []
    for s in nearby:
        dist = haversine_km(body.lat, body.lng, s["lat"], s["lng"])
        if dist <= radius_km:
            # Check reports for availability
            availability = "unknown"
            age_min = None
            six_hours_ago = time.time() * 1000 - 6 * 3600 * 1000
            relevant_reports = [
                r for r in reports_store
                if r["service_id"] == s["id"] and r["timestamp"] > six_hours_ago
            ]
            if relevant_reports:
                latest = max(relevant_reports, key=lambda r: r["timestamp"])
                availability = f"reported_{latest['status']}"
                age_min = int((time.time() * 1000 - latest["timestamp"]) / 60000)

            results.append({
                "id": s["id"],
                "name": s["name"],
                "category": s["category"],
                "address": s.get("address", ""),
                "phone": s.get("phone", ""),
                "emergency_phone": s.get("emergency_phone"),
                "distance_km": round(dist, 1),
                "lat": s["lat"],
                "lng": s["lng"],
                "open_24h": s.get("open_24h", False),
                "source": "local_db",
                "availability": availability,
                "availability_age_min": age_min,
            })

    results.sort(key=lambda x: x["distance_km"])
    results = results[:10]

    return {
        "intent": classification["intent"],
        "urgency": classification["urgency"],
        "domain": classification["domain"],
        "results": results,
        "offline_fallback": False
    }


@app.post("/chat")
async def chat(body: ChatRequest):
    api_key = os.getenv("ANTHROPIC_API_KEY")

    # Offline / no-key fallback
    if not api_key:
        # Return a simple helpful response
        query = body.messages[-1]["content"] if body.messages else ""
        classification = classify_intent(query)
        from_scripts = get_offline_chat_response(classification["domain"])
        return StreamingResponse(
            iter([f"data: {json.dumps({'text': from_scripts})}\n\ndata: [DONE]\n\n"]),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
        )

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        system = f"""You are CrisisConnect, an emergency triage assistant.
You help people in any crisis: medical, legal, financial, mental health,
domestic violence, natural disaster, homelessness, substance abuse.

RULES:
1. Always ask one clarifying question to narrow the exact resource needed.
2. Give 2-3 concrete immediate steps the person can take RIGHT NOW.
3. If situation is life-threatening, say "Call 112 immediately" FIRST.
4. When you identify a specific service type needed, end your message with:
   [SEARCH: {{category}}] — the app will auto-trigger a search.
5. Never give medical diagnoses. Always recommend professional help.
6. Be warm, calm, non-judgmental. Assume the worst case.
7. User location: {body.lat}, {body.lng}. Nearest city: {body.city}.
8. Keep responses under 150 words. Use plain language."""

        async def stream_response():
            with client.messages.stream(
                model="claude-sonnet-4-20250514",
                max_tokens=300,
                system=system,
                messages=body.messages,
            ) as stream:
                for text_chunk in stream.text_stream:
                    yield f"data: {json.dumps({'text': text_chunk})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            stream_response(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
        )
    except Exception as e:
        # Fallback
        query = body.messages[-1]["content"] if body.messages else ""
        classification = classify_intent(query)
        from_scripts = get_offline_chat_response(classification["domain"])
        return StreamingResponse(
            iter([f"data: {json.dumps({'text': from_scripts})}\n\ndata: [DONE]\n\n"]),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
        )


@app.post("/report")
async def report(body: ReportRequest):
    report_entry = {
        "service_id": body.service_id,
        "status": body.status,
        "timestamp": time.time() * 1000,
        "anon_hash": hashlib.sha256(f"{time.time()}{body.lat}".encode()).hexdigest()[:12],
        "lat": body.lat,
        "lng": body.lng
    }
    reports_store.append(report_entry)

    # Clean up old reports (>6 hours)
    six_hours_ago = time.time() * 1000 - 6 * 3600 * 1000
    reports_store[:] = [r for r in reports_store if r["timestamp"] > six_hours_ago]

    return {"status": "ok", "report_id": report_entry["anon_hash"]}


def get_offline_chat_response(domain: str) -> str:
    scripts = {
        "medical": "Call 108 for ambulance immediately if this is life-threatening.\n\n**Immediate steps:**\n1. Keep the person still and comfortable\n2. Do not give food or water if unconscious\n3. Stay on the line with 108 dispatcher\n\n📞 Ambulance: 108\n📞 Emergency: 112\n\n[SEARCH: hospital]",
        "social": "You and your family deserve safety tonight.\n\n**Immediate steps:**\n1. Call local police (100) — they can refer to emergency shelters\n2. Contact local NGO helpline for your city\n3. Go to nearest government hospital — they can provide basic shelter info\n\n📞 Women Helpline: 181\n📞 Child Helpline: 1098\n\n[SEARCH: shelter]",
        "legal": "You have rights, and help is available.\n\n**Immediate steps:**\n1. Do not sign any document without understanding it fully\n2. Request a lawyer — it's your constitutional right\n3. Contact NALSA Helpline: 15100 for free legal aid\n\n📞 NALSA: 15100\n📞 Police: 100\n\n[SEARCH: legal_aid]",
        "disaster": "Stay calm. Your safety is the priority.\n\n**Immediate steps:**\n1. Move to higher ground if flooding, open ground if earthquake\n2. Signal for help — use flashlight, whistle, or bright cloth\n3. Call 112 for emergency services\n\n📞 NDRF: 011-24363260\n📞 Emergency: 112\n\n[SEARCH: disaster_relief]",
        "general": "I'm here to help. Let me connect you with the right resources.\n\n**Emergency numbers:**\n📞 Universal Emergency: 112\n📞 Police: 100\n📞 Ambulance: 108\n📞 Fire: 101\n\nPlease describe your situation so I can find the nearest help.\n\n[SEARCH: general]"
    }
    return scripts.get(domain, scripts["general"])
