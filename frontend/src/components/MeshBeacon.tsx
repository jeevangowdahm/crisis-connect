import React, { useState, useCallback } from 'react';
import { broadcastSOS, isMeshSupported, getPeerCount } from '../utils/meshSOS';

interface MeshBeaconProps {
  userLocation: { lat: number; lng: number } | null;
  receivedAlerts: Array<{
    lat: number;
    lng: number;
    message: string;
    ts: number;
    sender_id: string;
  }>;
}

export default function MeshBeacon({ userLocation, receivedAlerts }: MeshBeaconProps) {
  const [broadcasting, setBroadcasting] = useState(false);
  const [message, setMessage] = useState('');

  const handleBroadcast = useCallback(() => {
    if (!userLocation) return;

    const sosMessage = message.trim() || 'SOS — Emergency help needed at this location';
    broadcastSOS(userLocation.lat, userLocation.lng, sosMessage);
    setBroadcasting(true);
    setMessage('');

    setTimeout(() => setBroadcasting(false), 3000);
  }, [userLocation, message]);

  if (!isMeshSupported()) return null;

  return (
    <>
      {/* SOS Broadcast Button */}
      <button
        className="sos-btn"
        onClick={handleBroadcast}
        id="sos-btn"
        aria-label="Broadcast SOS to nearby devices"
        title="P2P SOS Beacon — broadcasts to nearby devices"
      >
        SOS
      </button>

      {/* Received P2P Alerts */}
      {receivedAlerts.map((alert, i) => (
        <div key={i} className="mesh-alert" id={`mesh-alert-${i}`}>
          <h4>📡 SOS Received from Nearby Device</h4>
          <p>{alert.message}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {new Date(alert.ts).toLocaleTimeString()} · {getPeerCount()} peer(s) connected
          </p>
        </div>
      ))}

      {broadcasting && (
        <div className="mesh-alert" style={{
          position: 'fixed', bottom: 90, left: 24, zIndex: 200,
          background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)'
        }}>
          <h4 style={{ color: 'var(--emergency)' }}>📡 SOS Broadcasting...</h4>
          <p>Your distress signal is being sent to {getPeerCount()} nearby device(s)</p>
        </div>
      )}
    </>
  );
}
