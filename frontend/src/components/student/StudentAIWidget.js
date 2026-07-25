import React, { useState, useRef, useEffect } from 'react';
import { useStudentAi, renderAiContent } from './useStudentAi';
import './StudentAIAssistant.css';

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

const QUICK = [
  { icon: '📘', text: "Bugungi dars mavzularimni tushuntir" },
  { icon: '📝', text: "Uy vazifamga yordam ber" },
  { icon: '🎯', text: "Imtihonga tayyorgarlik maslahati ber" }
];

/**
 * Bosh sahifadagi suzuvchi AI yordamchi.
 * To'liq sahifa bilan bir xil backend (useStudentAi) — faqat o'quvchining
 * o'z ma'lumotlari asosida ishlaydi.
 */
const StudentAIWidget = () => {
  const [open, setOpen] = useState(false);
  const { messages, loading, send } = useStudentAi();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

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

  if (!open) {
    return (
      <button
        className="sai-fab"
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
        title="AI Yordamchi"
        aria-label="AI Yordamchini ochish"
      >
        🤖
      </button>
    );
  }

  return (
    <div className="sai-panel" role="dialog" aria-label="AI Yordamchi">
      <div className="sai-panel-header">
        <span className="sai-ph-icon">🤖</span>
        <div>
          <div className="sai-ph-title">AI Yordamchi</div>
          <div className="sai-ph-sub">Dars mavzularini tushuntiraman</div>
        </div>
        <span className="sai-ph-spacer" />
        <button className="sai-panel-close" onClick={() => setOpen(false)} aria-label="Yopish">✕</button>
      </div>

      <main className="sai-main">
        <div className="sai-messages">
          {messages.length === 0 && (
            <div className="sai-welcome">
              <div className="sai-welcome-bot">🤖</div>
              <h2>Savolingiz bormi?</h2>
              <p>Dars mavzusini tushuntirib beraman yoki o'qishga yordam beraman.</p>
              <div className="sai-suggestions">
                {QUICK.map((q, i) => (
                  <button key={i} className="sai-suggestion" onClick={() => send(q.text)}>
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
            placeholder="Savolingizni yozing..."
            rows={1}
            disabled={loading}
          />
          <button className="sai-send" onClick={handleSend} disabled={loading || !input.trim()} title="Yuborish">
            <SendIcon />
          </button>
        </div>
      </main>
    </div>
  );
};

export default StudentAIWidget;
