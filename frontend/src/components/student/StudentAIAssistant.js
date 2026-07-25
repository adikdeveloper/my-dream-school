import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';
import { useStudentAi, renderAiContent } from './useStudentAi';
import './StudentAIAssistant.css';

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

const SUGGESTIONS = [
  { icon: '📘', text: "Bugungi dars mavzularimni tushuntirib ber" },
  { icon: '➗', text: "Matematikadan kasrlarni misol bilan tushuntir" },
  { icon: '📝', text: "Uy vazifamni qanday bajaray? Yo'l ko'rsat" },
  { icon: '🔬', text: "Fizikadan Nyuton qonunlarini sodda tushuntir" },
  { icon: '🎯', text: "Imtihonga qanday tayyorlansam bo'ladi?" },
  { icon: '🇬🇧', text: "Ingliz tilidan Present Simple ni tushuntir" }
];

const StudentAIAssistant = () => {
  const { user } = useAuth();
  const firstName = user?.firstName || '';
  const { messages, setMessages, loading, sessionId, setSessionId, send, reset } = useStudentAi();

  const [sessions, setSessions] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await apiService.getStudentAiSessions();
      setSessions(data.sessions || []);
    } catch (e) {
      // sessiyalarni yuklab bo'lmadi — jim o'tkazamiz
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Javob kelgach sessiyalar ro'yxatini yangilaymiz
  const prevLoading = useRef(false);
  useEffect(() => {
    if (prevLoading.current && !loading) fetchSessions();
    prevLoading.current = loading;
  }, [loading, fetchSessions]);

  const loadSession = async (sid) => {
    try {
      const data = await apiService.getStudentAiChatHistory(sid);
      setSessionId(sid);
      setMessages(data.messages || []);
      inputRef.current?.focus();
    } catch (e) {
      // ignore
    }
  };

  const newChat = () => {
    reset();
    setInput('');
    inputRef.current?.focus();
  };

  const deleteSession = async (id, sid, e) => {
    e.stopPropagation();
    try {
      await apiService.deleteStudentAiSession(id);
      if (sessionId === sid) newChat();
      fetchSessions();
    } catch (err) {
      // ignore
    }
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;
    send(input);
    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="sai-page">
      <div className="sai-page-header">
        <div className="sai-bot-badge">🤖</div>
        <div>
          <h1>AI Yordamchi</h1>
          <p>Shaxsiy o'qituvchi-yordamchingiz — dars mavzularini tushuntiradi va o'qishga yordam beradi</p>
        </div>
      </div>

      <div className="sai-layout">
        <aside className="sai-sessions">
          <button className="sai-new-btn" onClick={newChat}>➕ Yangi suhbat</button>
          {sessions.length === 0 ? (
            <div className="sai-sessions-empty">Suhbatlar yo'q</div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.sessionId}
                className={`sai-session-item ${sessionId === s.sessionId ? 'active' : ''}`}
                onClick={() => loadSession(s.sessionId)}
              >
                <span className="sai-session-title">{s.title || 'Suhbat'}</span>
                <button
                  className="sai-session-del"
                  onClick={(e) => deleteSession(s._id, s.sessionId, e)}
                  title="O'chirish"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </aside>

        <main className="sai-main">
          <div className="sai-messages">
            {messages.length === 0 && (
              <div className="sai-welcome">
                <div className="sai-welcome-bot">🤖</div>
                <h2>Assalomu alaykum{firstName ? `, ${firstName}` : ''}! 👋</h2>
                <p>
                  Men sizning shaxsiy AI yordamchingizman. Dars mavzularini tushuntiraman,
                  fanlardan savollaringizga javob beraman va o'qishga yordam beraman.
                  Quyidagilardan birini tanlang yoki o'z savolingizni yozing:
                </p>
                <div className="sai-suggestions">
                  {SUGGESTIONS.map((q, i) => (
                    <button
                      key={i}
                      className="sai-suggestion"
                      onClick={() => { send(q.text); }}
                    >
                      <span className="sai-sug-icon">{q.icon}</span>
                      <span>{q.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`sai-msg ${msg.role}`}>
                <div className="sai-avatar">{msg.role === 'assistant' ? '🤖' : '🧑‍🎓'}</div>
                <div className="sai-bubble">{renderAiContent(msg.content)}</div>
              </div>
            ))}

            {loading && (
              <div className="sai-msg assistant">
                <div className="sai-avatar">🤖</div>
                <div className="sai-bubble">
                  <div className="sai-typing"><span></span><span></span><span></span></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="sai-input-area">
            <textarea
              ref={inputRef}
              className="sai-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Savolingizni yozing yoki dars mavzusini so'rang..."
              rows={1}
              disabled={loading}
            />
            <button className="sai-send" onClick={handleSend} disabled={loading || !input.trim()} title="Yuborish">
              <SendIcon />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentAIAssistant;
