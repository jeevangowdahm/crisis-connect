// Emergency keyword scanner — runs on every keystroke, zero latency
const EMERGENCY_KEYWORDS = [
  'heart attack', 'cardiac arrest', 'stroke', 'seizure', 'bleeding',
  'choking', 'unconscious', 'not breathing', 'overdose', 'poisoning',
  'drowning', 'burning', 'fire', 'stabbed', 'shot', 'gunshot',
  'accident', 'crash', 'collapsed', 'dying', 'suicide', 'kill myself',
  'end my life', 'want to die', 'hurt myself', 'self harm', 'rape',
  'assault', 'attack', 'kidnap', 'abuse', 'domestic violence',
  'earthquake', 'flood', 'tsunami', 'tornado', 'hurricane',
  'explosion', 'bomb', 'trapped', 'missing child', 'amber alert'
];

const EMERGENCY_REGEX = new RegExp(
  EMERGENCY_KEYWORDS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'i'
);

export interface EmergencyDetection {
  isEmergency: boolean;
  matchedKeywords: string[];
  urgency: 'critical' | 'high' | 'none';
}

export function scanForEmergency(text: string): EmergencyDetection {
  if (!text || text.trim().length === 0) {
    return { isEmergency: false, matchedKeywords: [], urgency: 'none' };
  }

  const lowerText = text.toLowerCase();
  const matched = EMERGENCY_KEYWORDS.filter(kw => lowerText.includes(kw));

  const criticalKeywords = [
    'heart attack', 'cardiac arrest', 'not breathing', 'dying',
    'suicide', 'kill myself', 'end my life', 'stabbed', 'shot',
    'gunshot', 'drowning', 'choking', 'unconscious'
  ];

  const isCritical = matched.some(kw => criticalKeywords.includes(kw));

  return {
    isEmergency: matched.length > 0,
    matchedKeywords: matched,
    urgency: matched.length > 0 ? (isCritical ? 'critical' : 'high') : 'none'
  };
}

export function isEmergencyQuery(text: string): boolean {
  return EMERGENCY_REGEX.test(text);
}

// Category mapping from intent to display
export const CATEGORY_MAP: Record<string, { label: string; emoji: string; badge: string }> = {
  hospital: { label: 'Hospital', emoji: '🏥', badge: 'badge-hospital' },
  shelter: { label: 'Shelter', emoji: '🏠', badge: 'badge-shelter' },
  food_bank: { label: 'Food Bank', emoji: '🍲', badge: 'badge-food' },
  police: { label: 'Police', emoji: '👮', badge: 'badge-police' },
  fire: { label: 'Fire Station', emoji: '🚒', badge: 'badge-hospital' },
  mental_health: { label: 'Mental Health', emoji: '🧠', badge: 'badge-mental' },
  legal_aid: { label: 'Legal Aid', emoji: '⚖️', badge: 'badge-legal' },
  domestic_violence: { label: 'DV Support', emoji: '🛡️', badge: 'badge-mental' },
  substance_abuse: { label: 'Rehab', emoji: '💊', badge: 'badge-mental' },
  disaster_relief: { label: 'Disaster Relief', emoji: '🆘', badge: 'badge-hospital' },
  general: { label: 'General', emoji: '📍', badge: 'badge-default' }
};

// Simple keyword-based fallback intent classifier (no API needed)
export function classifyIntent(text: string): { intent: string; domain: string } {
  const lower = text.toLowerCase();

  if (/hospital|doctor|medical|ambulance|bleed|injur|pain|hurt|fever|sick|health|medicine|fracture|bone/.test(lower))
    return { intent: 'hospital', domain: 'medical' };
  if (/shelter|homeless|sleep|roof|housing|place to stay/.test(lower))
    return { intent: 'shelter', domain: 'social' };
  if (/food|hungry|eat|meal|starv|food bank|ration/.test(lower))
    return { intent: 'food_bank', domain: 'social' };
  if (/police|theft|rob|stolen|crime|arrest|fir|complaint/.test(lower))
    return { intent: 'police', domain: 'legal' };
  if (/fire|burn|blaze|smoke/.test(lower))
    return { intent: 'fire', domain: 'disaster' };
  if (/mental|depress|anxiety|suicid|counsel|therap|stress|panic/.test(lower))
    return { intent: 'mental_health', domain: 'medical' };
  if (/legal|lawyer|bail|rights|court|advocate/.test(lower))
    return { intent: 'legal_aid', domain: 'legal' };
  if (/domestic|violence|abuse|husband|wife|partner|beat|hit me/.test(lower))
    return { intent: 'domestic_violence', domain: 'social' };
  if (/drug|alcohol|addict|rehab|substance|overdose/.test(lower))
    return { intent: 'substance_abuse', domain: 'medical' };
  if (/flood|earthquake|tsunami|disaster|evacuat|rescue|storm/.test(lower))
    return { intent: 'disaster_relief', domain: 'disaster' };

  return { intent: 'general', domain: 'general' };
}
