import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

interface MapResult {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  phone: string;
  distance_km: number;
}

interface ServiceMapProps {
  results: MapResult[];
  userLocation: { lat: number; lng: number } | null;
  selectedId?: string | null;
  reports?: Array<{ lat: number; lng: number; status: string; timestamp: number }>;
}

const CATEGORY_COLORS: Record<string, string> = {
  hospital: '#ef4444',
  shelter: '#3b82f6',
  food_bank: '#22c55e',
  police: '#f59e0b',
  fire: '#f97316',
  mental_health: '#a855f7',
  legal_aid: '#06b6d4',
  domestic_violence: '#ec4899',
  substance_abuse: '#8b5cf6',
  disaster_relief: '#ef4444',
  general: '#94a3b8'
};

function createMarkerIcon(color: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      width: 24px; height: 24px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    className: ''
  });
}

const userIcon = L.divIcon({
  html: `<div style="
    width: 18px; height: 18px; border-radius: 50%;
    background: #3b82f6; border: 3px solid white;
    box-shadow: 0 0 12px rgba(59,130,246,0.6);
    animation: pulse-ring 2s infinite;
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  className: ''
});

export default function ServiceMap({ results, userLocation, selectedId, reports }: ServiceMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center = userLocation
      ? [userLocation.lat, userLocation.lng] as [number, number]
      : [12.9716, 77.5946] as [number, number]; // Default: Bengaluru

    mapRef.current = L.map(containerRef.current, {
      center,
      zoom: 13,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19
    }).addTo(mapRef.current);

    markersRef.current = L.layerGroup().addTo(mapRef.current);

    // Add user location
    if (userLocation) {
      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(mapRef.current)
        .bindPopup('<strong>📍 Your Location</strong>');
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when results change
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    markersRef.current.clearLayers();
    const bounds: [number, number][] = [];

    results.forEach(r => {
      const color = CATEGORY_COLORS[r.category] || CATEGORY_COLORS.general;
      const icon = createMarkerIcon(color);
      const marker = L.marker([r.lat, r.lng], { icon })
        .bindPopup(`
          <div style="font-family:Inter,system-ui;font-size:13px;">
            <strong>${r.name}</strong><br/>
            <span style="color:${color};">${r.category}</span> · ${r.distance_km}km<br/>
            <a href="tel:${r.phone}" style="color:#3b82f6;">📞 ${r.phone}</a>
          </div>
        `);

      markersRef.current!.addLayer(marker);
      bounds.push([r.lat, r.lng]);

      if (r.id === selectedId) {
        marker.openPopup();
      }
    });

    // Add crowd report heatmap
    if (reports && reports.length > 0) {
      const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
      const heatPoints = reports
        .filter(r => r.timestamp > sixHoursAgo)
        .map(r => [
          r.lat, 
          r.lng, 
          r.status === 'available' ? 1.0 : 0.1 // intensity
        ] as [number, number, number]);

      if (heatPoints.length > 0) {
        // @ts-ignore - leaflet.heat adds L.heatLayer
        if (L.heatLayer) {
          // @ts-ignore
          const heat = L.heatLayer(heatPoints, {
            radius: 25,
            blur: 15,
            maxZoom: 15,
            gradient: { 0.4: 'red', 0.65: 'yellow', 1: 'green' }
          });
          markersRef.current!.addLayer(heat);
        }
      }
    }

    // Fit bounds if we have results
    if (bounds.length > 0) {
      if (userLocation) bounds.push([userLocation.lat, userLocation.lng]);
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [results, selectedId, reports, userLocation]);

  return (
    <div className="map-section" id="service-map">
      <div ref={containerRef} className="map-wrapper" />
    </div>
  );
}
