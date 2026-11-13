# CrisisConnect — Emergency Resource Finder

> **AI-powered emergency resource finder** — Find hospitals, shelters, food banks, legal aid, and more near you. Works offline, with voice input, P2P SOS beacon, and AI triage chatbot.

## 🚀 Quick Start

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
# → http://localhost:8000/docs
```

## ✨ Features

| Feature | Technology | Description |
|---------|-----------|-------------|
| 🔍 Natural Language Search | AI Intent Classification | "I need a shelter for tonight with my kids" |
| 🚨 Emergency Detection | Client-side regex (<1ms) | Instant alert with Call 112/108/100 buttons |
| 🗺️ Interactive Map | Leaflet + OpenStreetMap | Colored pins per category, distance sorting |
| 🤖 AI Triage Chatbot | Claude Sonnet + Streaming | Multi-domain crisis support with auto-search |
| 🎤 Voice SOS | Web Speech API | Speak your emergency, hear results spoken back |
| 📡 P2P Mesh Beacon | WebRTC DataChannel | Broadcast SOS to nearby devices — no server needed |
| 👥 Community Heatmap | Crowd reports + 6hr decay | Real-time availability reporting |
| 📱 Offline-First PWA | Service Worker + IndexedDB | Full functionality with zero internet |

## 🏗️ Architecture

```
crisis-connect/
├── frontend/               # React + Vite + TypeScript
│   ├── src/
│   │   ├── App.tsx          # Main app
│   │   ├── components/      # SearchBar, EmergencyAlert, ResultCard, ServiceMap, ChatBot, MeshBeacon
│   │   ├── utils/           # keywords, offlineSearch, voiceSOS, meshSOS, offlineChatScripts
│   │   ├── data/            # services.ts (62 Bengaluru services)
│   │   └── db/              # Dexie IndexedDB schema
│   └── public/
│       └── services.json    # Pre-loaded services dataset
│
└── backend/                 # Python FastAPI
    ├── main.py              # /search, /chat, /report, /health
    ├── data/services.json   # Services database
    └── requirements.txt
```

## 🔐 Environment Variables

### backend/.env
```
ANTHROPIC_API_KEY=sk-ant-api03-...   # Optional — works without in demo mode
GOOGLE_API_KEY=AIzaSy...             # Optional
ALLOWED_ORIGINS=http://localhost:5173
```

### frontend/.env
```
VITE_API_URL=http://localhost:8000
```

## 🛡️ Three-Layer Fallback Architecture

| Layer | Trigger | Latency |
|-------|---------|---------|
| **Spinal Reflex** — Client-side keyword regex | Always active | <1ms |
| **Local Cache** — In-memory Haversine search on 62+ services | Backend timeout or offline | <50ms |
| **P2P Mesh SOS** — WebRTC broadcast to nearby devices | Total network isolation | <2s |

## 📱 Demo Scenarios

1. **"I'm having a heart attack"** → Emergency alert + Call 112 + nearby hospitals
2. **"I need food for my family"** → Food banks sorted by distance
3. **"I'm scared of my partner"** → DV shelters + Women helpline 181

## 📄 License

MIT
