import React, { useState, useCallback } from 'react';
import { scanForEmergency } from '../utils/keywords';
import { startListening, stopListening, getIsListening, isVoiceSupported } from '../utils/voiceSOS';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onEmergencyDetected: (keywords: string[]) => void;
  isLoading?: boolean;
}

export default function SearchBar({ onSearch, onEmergencyDetected, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuery(text);

    // Real-time emergency keyword scanning — <1ms, no network
    const detection = scanForEmergency(text);
    if (detection.isEmergency) {
      onEmergencyDetected(detection.matchedKeywords);
    }
  }, [onEmergencyDetected]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    const searchText = query.trim() || interimText.trim();
    if (searchText) {
      onSearch(searchText);
    }
  }, [query, interimText, onSearch]);

  const toggleVoice = useCallback(() => {
    if (listening) {
      stopListening();
      setListening(false);
      if (interimText.trim()) {
        setQuery(interimText);
        onSearch(interimText);
      }
      setInterimText('');
    } else {
      const started = startListening({
        onTranscript: (text, isFinal) => {
          if (isFinal) {
            setQuery(text);
            setInterimText('');
            // Scan for emergency in voice input
            const detection = scanForEmergency(text);
            if (detection.isEmergency) {
              onEmergencyDetected(detection.matchedKeywords);
            }
            onSearch(text);
            stopListening();
            setListening(false);
          } else {
            setInterimText(text);
            // Real-time scanning during speech
            const detection = scanForEmergency(text);
            if (detection.isEmergency) {
              onEmergencyDetected(detection.matchedKeywords);
            }
          }
        },
        onError: () => setListening(false),
        onEnd: () => setListening(false)
      });
      if (started) setListening(true);
    }
  }, [listening, interimText, onSearch, onEmergencyDetected]);

  return (
    <div className="search-container">
      <form onSubmit={handleSubmit} className="search-box" id="search-box">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          id="search-input"
          value={listening ? interimText : query}
          onChange={handleInputChange}
          placeholder={listening ? 'Listening...' : 'Describe your emergency or what you need...'}
          aria-label="Search for emergency services"
          autoComplete="off"
        />
        {isVoiceSupported() && (
          <button
            type="button"
            className={`voice-btn ${listening ? 'listening' : ''}`}
            onClick={toggleVoice}
            aria-label={listening ? 'Stop listening' : 'Start voice input'}
            id="voice-btn"
          >
            {listening ? '⏹' : '🎤'}
          </button>
        )}
        <button
          type="submit"
          className="search-btn"
          disabled={isLoading}
          aria-label="Search"
          id="search-submit-btn"
        >
          {isLoading ? (
            <span className="loader" style={{ width: 18, height: 18, borderWidth: 2 }}></span>
          ) : '→'}
        </button>
      </form>
      {listening && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
          🔴 Listening — speak your emergency clearly
        </div>
      )}
    </div>
  );
}
