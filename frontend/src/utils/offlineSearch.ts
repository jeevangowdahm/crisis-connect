import { SERVICES_DATA } from '../data/services';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180)
    * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface SearchResult {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  emergency_phone?: string;
  distance_km: number;
  lat: number;
  lng: number;
  open_24h: boolean;
  source: string;
  availability?: string;
  availability_age_min?: number;
}

export function offlineSearch(
  category: string,
  userLat: number,
  userLng: number,
  radiusKm: number = 10
): SearchResult[] {
  let services = SERVICES_DATA;

  if (category !== 'general') {
    services = services.filter(s => s.category === category);
  }

  return services
    .map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      address: s.address,
      phone: s.phone,
      emergency_phone: s.emergency_phone,
      lat: s.lat,
      lng: s.lng,
      open_24h: s.open_24h,
      distance_km: parseFloat(haversineKm(userLat, userLng, s.lat, s.lng).toFixed(1)),
      source: 'local_cache',
      availability: 'unknown'
    }))
    .filter(s => s.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, 10);
}

export function searchAllCategories(
  userLat: number,
  userLng: number,
  radiusKm: number = 10
): SearchResult[] {
  return offlineSearch('general', userLat, userLng, radiusKm);
}
