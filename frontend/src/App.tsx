import React, { useState, useEffect, useCallback } from 'react';
import SearchBar from './components/SearchBar';
import EmergencyAlert from './components/EmergencyAlert';
import ResultCard from './components/ResultCard';
import ServiceMap from './components/ServiceMap';
import ChatBot from './components/ChatBot';
import MeshBeacon from './components/MeshBeacon';
import { classifyIntent, CATEGORY_MAP } from './utils/keywords';
import { offlineSearch, type SearchResult } from './utils/offlineSearch';
import { speakResult } from './utils/voiceSOS';
import { setSOSCallback, type SOSPayload } from './utils/meshSOS';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({ lat: 12.9716, lng: 77.5946 });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [emergencyKeywords, setEmergencyKeywords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [meshAlerts, setMeshAlerts] = useState<SOSPayload[]>([]);
  const [searchDomain, setSearchDomain] = useState<string>('');
  const [demoMode, setDemoMode] = useState<boolean>(false);

  // Initialize
  useEffect(() => {
    // Get user location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}, // Keep default Bengaluru
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    // Online/offline listeners
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // P2P SOS callback
    setSOSCallback((data) => {
      setMeshAlerts(prev => [data, ...prev].slice(0, 5));
    });

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    setSelectedResult(null);

    const { intent, domain } = classifyIntent(query);
    setSearchDomain(CATEGORY_MAP[intent]?.label || domain);

    // Try online search first
    if (isOnline && !demoMode) {
      try {
        const response = await fetch(`${API_URL}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            lat: userLocation.lat,
            lng: userLocation.lng,
            radius_m: 10000,
            lang: 'en'
          }),
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            setResults(data.results);
            setIsLoading(false);
            setSearchDomain(CATEGORY_MAP[data.intent]?.label || data.domain || domain);
            const top = data.results[0];
            speakResult(`Nearest ${data.intent || intent} is ${top.name}, ${top.distance_km} kilometers away.`);
            return;
          }
        }
      } catch {
        // Fall through to offline
      }
    }

    // Offline/fallback — in-memory search
    const localResults = offlineSearch(intent, userLocation.lat, userLocation.lng, 15);
    setResults(localResults);
    setIsLoading(false);

    if (localResults.length > 0) {
      const top = localResults[0];
      speakResult(`Nearest ${intent} is ${top.name}, ${top.distance_km} kilometers away.`);
    }
  }, [userLocation, isOnline]);

  const handleAutoSearch = useCallback((category: string) => {
    const localResults = offlineSearch(category, userLocation.lat, userLocation.lng, 15);
    if (localResults.length > 0) {
      setResults(localResults);
      setSearchDomain(CATEGORY_MAP[category]?.label || 'Services');
    }
  }, [userLocation]);

  const handleQuickAction = useCallback((category: string) => {
    const localResults = offlineSearch(category, userLocation.lat, userLocation.lng, 15);
    setResults(localResults);
    setSearchDomain(CATEGORY_MAP[category]?.label || 'Services');
    // Scroll to top so results and map are visible
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  }, [userLocation]);

  return (
    <div className="app" id="app-root">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-banner" id="offline-banner">
          📡 Offline Mode — Using cached data. All core features are still active.
        </div>
      )}

      {/* Header */}
      <header className="app-header" id="app-header">
        <div className="logo">
          <div className="logo-icon">🆘</div>
          <span>CrisisConnect</span>
        </div>
        <div className="status-bar">
          <button 
            onClick={() => setDemoMode(!demoMode)}
            style={{
              background: demoMode ? 'var(--warning)' : 'transparent',
              color: demoMode ? '#000' : 'var(--text-muted)',
              border: '1px solid var(--border-glass)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.65rem',
              cursor: 'pointer'
            }}
          >
            {demoMode ? 'DEMO MODE: ON' : 'Demo'}
          </button>
          <div className={`status-dot ${isOnline && !demoMode ? '' : 'offline'}`}></div>
          <span>{demoMode ? 'Mock Data' : (isOnline ? 'Online' : 'Offline')}</span>
          <span style={{ marginLeft: 8 }}>📍 {userLocation.lat.toFixed(2)}, {userLocation.lng.toFixed(2)}</span>
        </div>
      </header>

      <main className="app-main">
        {/* Hero Section */}
        {results.length === 0 && !isLoading && (
          <div className="hero animate-in" id="hero-section">
            <h1 className="heading-1" style={{ background: 'linear-gradient(135deg,#fff 0%,var(--accent) 50%,var(--emergency) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Find help.<br />Anywhere.<br />Even offline.
            </h1>
            <p className="body" style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 20px' }}>
              AI-powered emergency resource finder. Describe your situation in your own words —
              we'll find hospitals, shelters, food banks, legal aid, and more near you.
            </p>
            <div className="hero-badges">
              <span className="hero-badge">🏥 Medical</span>
              <span className="hero-badge">🏠 Shelter</span>
              <span className="hero-badge">🍲 Food</span>
              <span className="hero-badge">👮 Police</span>
              <span className="hero-badge">🧠 Mental Health</span>
              <span className="hero-badge">⚖️ Legal Aid</span>
              <span className="hero-badge">📡 Works Offline</span>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <SearchBar
          onSearch={handleSearch}
          onEmergencyDetected={setEmergencyKeywords}
          isLoading={isLoading}
        />

        {/* Emergency Alert */}
        <EmergencyAlert
          keywords={emergencyKeywords}
          onDismiss={() => setEmergencyKeywords([])}
        />

        {/* P2P Mesh Alerts */}
        {meshAlerts.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {meshAlerts.map((alert, i) => (
              <div key={i} className="mesh-alert">
                <h4>📡 SOS from Nearby Device</h4>
                <p>{alert.message}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {new Date(alert.ts).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {results.length === 0 && !isLoading && (
          <div className="quick-actions" id="quick-actions">
            {[
              { cat: 'hospital', icon: '🏥', label: 'Hospital' },
              { cat: 'shelter', icon: '🏠', label: 'Shelter' },
              { cat: 'food_bank', icon: '🍲', label: 'Food Bank' },
              { cat: 'police', icon: '👮', label: 'Police' },
              { cat: 'mental_health', icon: '🧠', label: 'Mental Health' },
              { cat: 'legal_aid', icon: '⚖️', label: 'Legal Aid' },
            ].map(({ cat, icon, label }) => (
              <button
                key={cat}
                className="quick-action"
                onClick={() => handleQuickAction(cat)}
                id={`quick-action-${cat}`}
              >
                <div className="icon">{icon}</div>
                <div className="label">{label}</div>
              </button>
            ))}
          </div>
        )}

        {/* Demo Scenarios */}
        {results.length === 0 && !isLoading && (
          <div style={{ marginBottom: 20 }}>
            <div className="section-header">
              <h2 style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>⚡ Demo Scenarios</h2>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { q: "I'm having a heart attack", icon: '💔' },
                { q: "I need food for my family", icon: '🍲' },
                { q: "I'm scared of my partner", icon: '🛡️' },
              ].map(({ q, icon }) => (
                <button
                  key={q}
                  onClick={() => handleSearch(q)}
                  style={{
                    padding: '8px 14px', borderRadius: 'var(--radius-sm)',
                    background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.12)',
                    color: 'var(--text-secondary)', fontSize: '0.78rem', fontFamily: 'var(--mono)',
                    cursor: 'pointer', transition: 'var(--transition)'
                  }}
                >{icon} "{q}"</button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="results-grid" id="loading-indicator">
            {[1, 2, 3].map((n) => (
              <div key={n} className="result-card" style={{ pointerEvents: 'none' }}>
                <div className="result-card-header">
                  <div className="skeleton" style={{ width: '60%', height: '20px', borderRadius: '4px' }}></div>
                  <div className="skeleton" style={{ width: '15%', height: '16px', borderRadius: '4px' }}></div>
                </div>
                <div className="skeleton" style={{ width: '80%', height: '14px', borderRadius: '4px', marginBottom: '12px' }}></div>
                <div className="result-card-footer">
                  <div className="skeleton" style={{ width: '60px', height: '20px', borderRadius: '10px' }}></div>
                  <div className="skeleton" style={{ width: '100px', height: '16px', borderRadius: '4px' }}></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Map */}
        {results.length > 0 && (
          <ServiceMap
            results={results}
            userLocation={userLocation}
            selectedId={selectedResult}
          />
        )}

        {/* Results */}
        {results.length > 0 && (
          <>
            <div className="section-header" id="results-header">
              <h2>Nearby {searchDomain || 'Services'}</h2>
              <span className="count">{results.length} found</span>
            </div>
            <div className="results-grid" id="results-grid">
              {results.map((result, i) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  index={i}
                  onSelect={(r) => setSelectedResult(r.id)}
                />
              ))}
            </div>

            {/* Back to search */}
            <button
              onClick={() => { setResults([]); setSearchDomain(''); }}
              style={{
                margin: '20px auto', display: 'block',
                padding: '10px 24px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500
              }}
            >
              ← Back to Search
            </button>
          </>
        )}

        {/* Empty State */}
        {!isLoading && results.length === 0 && emergencyKeywords.length > 0 && (
          <div className="empty-state" id="empty-state">
            <div className="icon">🔍</div>
            <h3>No services found nearby</h3>
            <p>Try expanding your search or call 112 for immediate emergency help.</p>
          </div>
        )}
      </main>

      {/* Chatbot */}
      <ChatBot
        onAutoSearch={handleAutoSearch}
        userLocation={userLocation}
        isOnline={isOnline && !demoMode}
      />

      {/* Mesh SOS */}
      <MeshBeacon
        userLocation={userLocation}
        receivedAlerts={meshAlerts}
      />
    </div>
  );
}
