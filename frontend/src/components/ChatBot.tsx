import React, { useState, useRef, useEffect, useCallback } from 'react';
import { classifyIntent } from '../utils/keywords';
import { getOfflineResponse } from '../utils/offlineChatScripts';
import db from '../db/schema';

interface ChatBotProps {
  onAutoSearch: (category: string) => void;
  userLocation: { lat: number; lng: number } | null;
  isOnline: boolean;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ChatBot({ onAutoSearch, userLocation, isOnline }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: '🆘 CrisisConnect AI — I can help with medical, legal, mental health, shelter, disaster, and financial emergencies.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId] = useState(() => 'session_' + Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history from IndexedDB
  useEffect(() => {
    db.chat_history
      .where('session_id').equals(sessionId)
      .sortBy('created_at')
      .then(history => {
        if (history.length > 0) {
          setMessages(prev => [
            prev[0], // Keep system message
            ...history.map(h => ({ role: h.role, content: h.content }))
          ]);
        }
      });
  }, [sessionId]);

  // Parse [SEARCH: category] from response
  const parseAutoSearch = useCallback((text: string): string => {
    const match = text.match(/\[SEARCH:\s*(\w+)\]/i);
    if (match) {
      const category = match[1].toLowerCase();
      onAutoSearch(category);
      return text.replace(match[0], '').trim();
    }
    return text;
  }, [onAutoSearch]);

  const saveMessage = useCallback(async (role: Message['role'], content: string) => {
    await db.chat_history.add({
      session_id: sessionId,
      role,
      content,
      created_at: Date.now()
    });
  }, [sessionId]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    await saveMessage('user', text);

    // Try online chat first
    if (isOnline) {
      try {
        const response = await fetch(`${API_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages.filter(m => m.role !== 'system'), userMsg].map(m => ({
              role: m.role,
              content: m.content
            })),
            lat: userLocation?.lat || 12.9716,
            lng: userLocation?.lng || 77.5946,
            city: 'Bengaluru'
          }),
          signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
          const reader = response.body?.getReader();
          if (reader) {
            let accumulated = '';
            const decoder = new TextDecoder();

            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') break;
                  try {
                    const parsed = JSON.parse(data);
                    accumulated += parsed.text;
                    setMessages(prev => {
                      const updated = [...prev];
                      updated[updated.length - 1] = { role: 'assistant', content: accumulated };
                      return updated;
                    });
                  } catch {
                    // Skip malformed chunks
                  }
                }
              }
            }

            const cleanText = parseAutoSearch(accumulated);
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: cleanText };
              return updated;
            });
            await saveMessage('assistant', cleanText);
            setIsStreaming(false);
            return;
          }
        }
      } catch {
        // Fall through to offline
      }
    }

    // Offline fallback — decision tree
    const { intent, domain } = classifyIntent(text);
    const offlineResponse = getOfflineResponse(domain || intent);
    const cleanResponse = parseAutoSearch(offlineResponse + `\n\n[SEARCH: ${intent}]`);

    setMessages(prev => [...prev, { role: 'assistant', content: cleanResponse }]);
    await saveMessage('assistant', cleanResponse);
    setIsStreaming(false);
  }, [input, isStreaming, messages, isOnline, userLocation, parseAutoSearch, saveMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        className={`chatbot-fab ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        id="chatbot-fab"
        aria-label="Open AI triage chatbot"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="chatbot-panel" id="chatbot-panel">
          <div className="chatbot-header">
            <div>
              <h3>🆘 CrisisConnect AI</h3>
              <span className="subtitle">
                {isOnline ? '🟢 AI Triage Active' : '🟡 Offline Mode — Using cached guidance'}
              </span>
            </div>
          </div>

          <div className="chatbot-messages" id="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                {msg.content.split('\n').map((line, j) => (
                  <React.Fragment key={j}>
                    {line}
                    {j < msg.content.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            ))}

            {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="chat-msg assistant">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your situation..."
              id="chatbot-input"
              aria-label="Chat message input"
            />
            <button
              className="chat-send-btn"
              onClick={sendMessage}
              disabled={isStreaming || !input.trim()}
              id="chat-send-btn"
              aria-label="Send message"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
