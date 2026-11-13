import React, { useState } from 'react';
import { CATEGORY_MAP } from '../utils/keywords';
import db from '../db/schema';

interface ResultCardProps {
  result: {
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
  };
  index: number;
  onSelect: (result: any) => void;
}

export default function ResultCard({ result, index, onSelect }: ResultCardProps) {
  const [reported, setReported] = useState<string | null>(null);
  const cat = CATEGORY_MAP[result.category] || CATEGORY_MAP.general;

  const handleReport = async (status: 'available' | 'unavailable') => {
    setReported(status);
    await db.reports.add({
      service_id: result.id,
      status,
      timestamp: Date.now(),
      anon_hash: 'anon_' + Math.random().toString(36).substring(2, 8),
      lat: result.lat,
      lng: result.lng
    });
  };

  return (
    <div
      className="result-card"
      style={{ animationDelay: `${index * 0.08}s` }}
      onClick={() => onSelect(result)}
      role="button"
      tabIndex={0}
      id={`result-card-${result.id}`}
      aria-label={`${result.name}, ${result.distance_km}km away`}
    >
      <div className="result-card-header">
        <div>
          <h4>{cat.emoji} {result.name}</h4>
          <p className="address">{result.address}</p>
        </div>
        <span className="distance">{result.distance_km} km</span>
      </div>

      <div className="result-card-footer">
        <span className={`category-badge ${cat.badge}`}>
          {cat.label}
        </span>

        {result.open_24h && (
          <span className="availability available">✓ 24/7</span>
        )}

        {result.phone && (
          <a
            href={`tel:${result.phone}`}
            className="phone-link"
            onClick={(e) => e.stopPropagation()}
          >
            📞 {result.phone}
          </a>
        )}

        {result.emergency_phone && result.emergency_phone !== result.phone && (
          <a
            href={`tel:${result.emergency_phone}`}
            className="phone-link"
            onClick={(e) => e.stopPropagation()}
            style={{ color: 'var(--emergency)' }}
          >
            🆘 {result.emergency_phone}
          </a>
        )}

        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {result.source === 'offline_db' ? '💾 Cached' : '🌐 Live'}
        </span>
      </div>

      {/* Community availability reporting */}
      <div className="report-btns">
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Available right now?
        </span>
        {reported ? (
          <span style={{ fontSize: '0.75rem', color: reported === 'available' ? 'var(--success)' : 'var(--emergency)' }}>
            ✓ Reported as {reported}
          </span>
        ) : (
          <>
            <button
              className="report-btn yes"
              onClick={(e) => { e.stopPropagation(); handleReport('available'); }}
            >
              👍 Yes
            </button>
            <button
              className="report-btn no"
              onClick={(e) => { e.stopPropagation(); handleReport('unavailable'); }}
            >
              👎 No
            </button>
          </>
        )}
      </div>
    </div>
  );
}
