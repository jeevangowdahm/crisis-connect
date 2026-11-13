import React from 'react';

interface EmergencyAlertProps {
  keywords: string[];
  onDismiss: () => void;
}

export default function EmergencyAlert({ keywords, onDismiss }: EmergencyAlertProps) {
  if (keywords.length === 0) return null;

  return (
    <div className="emergency-alert" id="emergency-alert" role="alert" aria-live="assertive">
      <div className="emergency-alert-header">
        <span className="icon">🚨</span>
        <h3>Emergency Detected</h3>
        <button
          onClick={onDismiss}
          style={{
            marginLeft: 'auto', background: 'transparent', color: 'var(--text-muted)',
            fontSize: '1.1rem', padding: '4px 8px'
          }}
          aria-label="Dismiss alert"
        >✕</button>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
        Keywords detected: <strong style={{ color: 'var(--emergency)' }}>{keywords.join(', ')}</strong>
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a href="tel:112" className="emergency-call-btn" id="call-112-btn">
          📞 Call 112 (Emergency)
        </a>
        <a href="tel:108" className="emergency-call-btn" style={{ background: 'var(--accent)' }} id="call-108-btn">
          🚑 Call 108 (Ambulance)
        </a>
        <a href="tel:100" className="emergency-call-btn" style={{ background: 'var(--warning)', color: '#000' }} id="call-100-btn">
          👮 Call 100 (Police)
        </a>
      </div>
    </div>
  );
}
