import { useState, useCallback, useRef } from 'react';
import React from 'react';
import apiService from '../../services/apiService';

const newSessionId = () => 'stud_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);

/**
 * O'quvchi AI suhbati uchun umumiy mantiq (hook).
 * Ham to'liq sahifa, ham bosh sahifadagi widget shu hookdan foydalanadi.
 * Backend: /api/ai/student/chat (faqat o'quvchining o'z ma'lumotlari).
 */
export const useStudentAi = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const sendingRef = useRef(false);

  const send = useCallback(async (text) => {
    const msg = (text || '').trim();
    if (!msg || sendingRef.current) return;
    sendingRef.current = true;

    const sid = sessionId || newSessionId();
    if (!sessionId) setSessionId(sid);

    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date() }]);
    setLoading(true);
    try {
      const data = await apiService.sendStudentAiMessage(sid, msg);
      if (data?.sessionId) setSessionId(data.sessionId);
      setMessages(prev => [...prev, { role: 'assistant', content: data.message, timestamp: new Date() }]);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "AI bilan bog'lanishda xato yuz berdi";
      setMessages(prev => [...prev, { role: 'assistant', content: 'Xato: ' + errorMsg, timestamp: new Date() }]);
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }, [sessionId]);

  const reset = useCallback(() => {
    setMessages([]);
    setSessionId(null);
  }, []);

  return { messages, setMessages, loading, sessionId, setSessionId, send, reset };
};

/**
 * AI javobini xavfsiz render qiladi. AI markdown ishlatmasligi kerak, ammo
 * baribir tushib qolsa, * va # belgilarini tozalab, bullet (- ) larni ro'yxat
 * sifatida ko'rsatadi.
 */
export const renderAiContent = (content) => {
  const lines = String(content || '').split(/\r?\n/);
  const elements = [];
  let listItems = [];

  const flushList = (keyBase) => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={`ul-${keyBase}`} className="sai-list">
        {listItems.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim().replace(/\*\*/g, '').replace(/\*/g, '');
    if (!trimmed) { flushList(idx); return; }
    const bullet = trimmed.match(/^[-•]\s+(.*)$/);
    if (bullet) { listItems.push(bullet[1].trim()); return; }
    flushList(idx);
    elements.push(
      <p key={`p-${idx}`} className="sai-line">{trimmed.replace(/^#{1,6}\s+/, '')}</p>
    );
  });
  flushList('end');
  return elements;
};
