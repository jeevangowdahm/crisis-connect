// Offline chatbot fallback scripts — stored in IndexedDB at install
// Used when Claude API is unavailable (offline mode)

export interface OfflineScript {
  opener: string;
  steps: string[];
  hotlines: string[];
}

export const offlineChatScripts: Record<string, OfflineScript> = {
  mental_health: {
    opener: "You matter, and I'm glad you reached out. Here are immediate resources:",
    steps: [
      "Find a quiet, safe place right now",
      "Call a trusted person and tell them where you are",
      "If in crisis, reach the nearest hospital emergency ward"
    ],
    hotlines: [
      "iCall: 9152987821 (free, anonymous)",
      "Vandrevala Foundation: 1860-2662-345 (24/7)",
      "AASRA: 9820466726"
    ]
  },
  medical: {
    opener: "Call 108 for ambulance immediately if this is life-threatening.",
    steps: [
      "Keep the person still and comfortable",
      "Do not give food or water if unconscious",
      "Stay on the line with 108 dispatcher"
    ],
    hotlines: [
      "Ambulance: 108",
      "Medical Emergency: 112",
      "Blood Bank Helpline: 104"
    ]
  },
  shelter: {
    opener: "You and your family deserve safety tonight.",
    steps: [
      "Call local police (100) — they can refer to emergency shelters",
      "Contact local NGO helpline for your city",
      "Go to nearest government hospital — they must provide basic shelter info"
    ],
    hotlines: [
      "Police: 100",
      "Women Helpline: 1091",
      "Child Helpline: 1098"
    ]
  },
  legal: {
    opener: "You have rights, and help is available.",
    steps: [
      "Do not sign any document without understanding it fully",
      "Request a lawyer — it's your constitutional right",
      "Contact your nearest Legal Services Authority for free legal aid"
    ],
    hotlines: [
      "NALSA Helpline: 15100",
      "Police: 100",
      "Human Rights Commission: 011-23385368"
    ]
  },
  disaster: {
    opener: "Stay calm. Your safety is the priority right now.",
    steps: [
      "Move to higher ground if flooding, open ground if earthquake",
      "Signal for help — use flashlight, whistle, or bright cloth",
      "Do not touch downed power lines or enter damaged buildings"
    ],
    hotlines: [
      "NDRF: 011-24363260",
      "Emergency: 112",
      "Fire: 101"
    ]
  },
  financial: {
    opener: "Financial crises are temporary. Resources are available.",
    steps: [
      "Visit your nearest District Social Welfare Office",
      "Apply for emergency government welfare schemes",
      "Contact local food banks for immediate food assistance"
    ],
    hotlines: [
      "PM Helpline: 011-23389012",
      "Food helpline: 1967",
      "Labour Helpline: 14434"
    ]
  },
  domestic_violence: {
    opener: "You are not alone, and you deserve to be safe.",
    steps: [
      "If in immediate danger, call 100 (police) or 112",
      "Pack essentials (ID, medicines, phone charger) if safe to do so",
      "Go to nearest police station — they must register your complaint"
    ],
    hotlines: [
      "Women Helpline: 181",
      "NCW Helpline: 7827-170-170",
      "Police: 100"
    ]
  },
  general: {
    opener: "I'm here to help. Let me connect you with the right resources.",
    steps: [
      "Describe your situation in a few words",
      "I'll find the nearest services for you",
      "All emergency numbers: 112 (Universal), 100 (Police), 108 (Ambulance)"
    ],
    hotlines: [
      "Universal Emergency: 112",
      "Police: 100",
      "Ambulance: 108"
    ]
  }
};

export function getOfflineResponse(domain: string): string {
  const script = offlineChatScripts[domain] || offlineChatScripts.general;
  let response = script.opener + '\n\n';
  response += '**Immediate steps:**\n';
  script.steps.forEach((step, i) => {
    response += `${i + 1}. ${step}\n`;
  });
  response += '\n**Helplines:**\n';
  script.hotlines.forEach(h => {
    response += `📞 ${h}\n`;
  });
  return response;
}
