import Dexie, { type EntityTable } from 'dexie';

export interface Service {
  id: string;
  name: string;
  category: string;
  subtype?: string;
  address: string;
  phone: string;
  emergency_phone?: string;
  lat: number;
  lng: number;
  open_24h: boolean;
  languages?: string[];
  wheelchair?: boolean;
  capacity?: string;
}

export interface Report {
  id?: number;
  service_id: string;
  status: 'available' | 'unavailable';
  timestamp: number;
  anon_hash: string;
  lat: number;
  lng: number;
}

export interface ChatMessage {
  id?: number;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  domain?: string;
  created_at: number;
}

export interface MeshLog {
  id?: number;
  beacon_id: string;
  lat: number;
  lng: number;
  message: string;
  received_at: number;
  relayed: boolean;
}

const db = new Dexie('CrisisConnectDB') as Dexie & {
  services: EntityTable<Service, 'id'>;
  reports: EntityTable<Report, 'id'>;
  chat_history: EntityTable<ChatMessage, 'id'>;
  mesh_log: EntityTable<MeshLog, 'id'>;
};

db.version(1).stores({
  services: 'id, category, name, lat, lng',
  reports: '++id, service_id, status, timestamp',
  chat_history: '++id, session_id, created_at',
  mesh_log: '++id, beacon_id, received_at'
});

export { db };
export default db;
