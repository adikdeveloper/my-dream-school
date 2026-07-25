import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';
import './TeacherAI.css';

/**
 * O'qituvchi AI yordamchisi.
 * Backend: /api/ai/teacher/* — kontekst faqat o'qituvchining o'z sinflari va
 * o'quvchilari bilan cheklangan, API kalit administrator tomonidan kiritilgan
 * umumiy kalitdan olinadi (o'qituvchi hech narsa kiritmaydi).
 */

const newSessionId = () => 'tchr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);

const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
];

const WEEK_DAYS = [
  { en: 'Monday', uz: 'Dushanba' },
  { en: 'Tuesday', uz: 'Seshanba' },
  { en: 'Wednesday', uz: 'Chorshanba' },
  { en: 'Thursday', uz: 'Payshanba' },
  { en: 'Friday', uz: 'Juma' },
  { en: 'Saturday', uz: 'Shanba' }
];

const CHAT_SUGGESTIONS = [
  { icon: '📊', text: "Sinflarimdagi o'quvchilarning umumiy ahvolini tahlil qilib ber" },
  { icon: '🏆', text: "Eng yaxshi natija ko'rsatayotgan o'quvchilarim kimlar?" },
  { icon: '⚠️', text: "Qaysi o'quvchilarimga ko'proq e'tibor berishim kerak?" },
  { icon: '📝', text: "Keyingi darsim uchun qiziqarli metodika tavsiya qil" },
  { icon: '📅', text: "Bu haftadagi darslarim jadvalini eslatib yubor" },
  { icon: '💡', text: "O'quvchilarni darsga qiziqtirish bo'yicha maslahat ber" }
];

/** AI javobini xavfsiz render qiladi (markdown qoldiqlarini tozalab). */
const renderAiText = (content) => {
  const lines = String(content || '').split(/\r?\n/);
  const elements = [];
  let listItems = [];

  const flushList = (keyBase) => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={`ul-${keyBase}`} className="tai-list">
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
      <p key={`p-${idx}`} className="tai-line">{trimmed.replace(/^#{1,6}\s+/, '')}</p>
    );
  });
  flushList('end');
  return elements;
};

const formatDateTimeLocal = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
};

const TABS = [
  { id: 'chat', icon: '💬', label: 'AI Suhbat' },
  { id: 'analysis', icon: '📊', label: 'Baholar tahlili' },
  { id: 'schedule', icon: '📅', label: 'Jadval generatori' },
  { id: 'test', icon: '📝', label: 'Test generatori' },
  { id: 'plan', icon: '📖', label: 'Dars reja' }
];

const TeacherAI = () => {
  const { user } = useAuth();
  const firstName = user?.firstName || '';

  const [activeTab, setActiveTab] = useState('chat');

  // ─── Umumiy scope (sinflar/fanlar) ───
  const [scopeClasses, setScopeClasses] = useState([]);
  const [scopeLoaded, setScopeLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiService.getTeacherAiScope();
        setScopeClasses(data.classes || []);
      } catch (e) {
        // scope yuklanmasa ham chat ishlayveradi
      } finally {
        setScopeLoaded(true);
      }
    })();
  }, []);

  // ═══════════════════════ CHAT ═══════════════════════
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const sendingRef = useRef(false);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await apiService.getTeacherAiSessions();
      setSessions(data.sessions || []);
    } catch (e) { /* jim */ }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const sendMessage = useCallback(async (text) => {
    const msg = (text || '').trim();
    if (!msg || sendingRef.current) return;
    sendingRef.current = true;

    const sid = sessionId || newSessionId();
    if (!sessionId) setSessionId(sid);

    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);
    try {
      const data = await apiService.sendTeacherAiMessage(sid, msg);
      if (data?.sessionId) setSessionId(data.sessionId);
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      fetchSessions();
    } catch (error) {
      const errorMsg = error.response?.data?.message || "AI bilan bog'lanishda xato yuz berdi";
      setMessages(prev => [...prev, { role: 'assistant', content: 'Xato: ' + errorMsg }]);
    } finally {
      setChatLoading(false);
      sendingRef.current = false;
    }
  }, [sessionId, fetchSessions]);

  const handleSend = () => {
    if (!input.trim() || chatLoading) return;
    sendMessage(input);
    setInput('');
  };

  const loadSession = async (sid) => {
    try {
      const data = await apiService.getTeacherAiChatHistory(sid);
      setSessionId(sid);
      setMessages(data.messages || []);
      inputRef.current?.focus();
    } catch (e) { /* jim */ }
  };

  const newChat = () => {
    setMessages([]);
    setSessionId(null);
    setInput('');
    inputRef.current?.focus();
  };

  const deleteSession = async (id, sid, e) => {
    e.stopPropagation();
    try {
      await apiService.deleteTeacherAiSession(id);
      if (sessionId === sid) newChat();
      fetchSessions();
    } catch (err) { /* jim */ }
  };

  // ═══════════════════════ BAHOLAR TAHLILI ═══════════════════════
  const now = useMemo(() => new Date(), []);
  const [anClassId, setAnClassId] = useState('');
  const [anSubjectId, setAnSubjectId] = useState('');
  const [anMonth, setAnMonth] = useState(now.getMonth() + 1);
  const [anYear, setAnYear] = useState(now.getFullYear());
  const [anLoading, setAnLoading] = useState(false);
  const [anError, setAnError] = useState('');
  const [anResult, setAnResult] = useState(null);

  const anClass = scopeClasses.find(c => c._id === anClassId);

  const runAnalysis = async () => {
    if (!anClassId) { setAnError('Sinfni tanlang'); return; }
    setAnLoading(true);
    setAnError('');
    setAnResult(null);
    try {
      const data = await apiService.teacherAiAnalyzeGrades({
        classId: anClassId,
        subjectId: anSubjectId || undefined,
        month: anMonth || undefined,
        year: anYear || undefined
      });
      setAnResult(data);
    } catch (error) {
      setAnError(error.response?.data?.message || 'Tahlil qilishda xato yuz berdi');
    } finally {
      setAnLoading(false);
    }
  };

  // ═══════════════════════ JADVAL GENERATORI ═══════════════════════
  const [schClassId, setSchClassId] = useState('');
  const [schDays, setSchDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [schLessons, setSchLessons] = useState(5);
  const [schStart, setSchStart] = useState('08:30');
  const [schDuration, setSchDuration] = useState(45);
  const [schBreak, setSchBreak] = useState(10);
  const [schWishes, setSchWishes] = useState('');
  const [schLoading, setSchLoading] = useState(false);
  const [schError, setSchError] = useState('');
  const [schResult, setSchResult] = useState(null);

  const toggleDay = (day) => {
    setSchDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const runScheduleGen = async () => {
    if (!schClassId) { setSchError('Sinfni tanlang'); return; }
    if (schDays.length === 0) { setSchError('Kamida bitta kun tanlang'); return; }
    setSchLoading(true);
    setSchError('');
    setSchResult(null);
    try {
      const data = await apiService.teacherAiGenerateSchedule({
        classId: schClassId,
        days: WEEK_DAYS.map(d => d.en).filter(d => schDays.includes(d)),
        lessonsPerDay: schLessons,
        startTime: schStart,
        lessonDuration: schDuration,
        breakDuration: schBreak,
        wishes: schWishes
      });
      setSchResult(data);
    } catch (error) {
      setSchError(error.response?.data?.message || 'Jadval yaratishda xato yuz berdi');
    } finally {
      setSchLoading(false);
    }
  };

  // ═══════════════════════ TEST GENERATORI ═══════════════════════
  const [tsClassId, setTsClassId] = useState('');
  const [tsSubjectId, setTsSubjectId] = useState('');
  const [tsTopic, setTsTopic] = useState('');
  const [tsCount, setTsCount] = useState(10);
  const [tsDifficulty, setTsDifficulty] = useState("o'rta");
  const [tsType, setTsType] = useState('single');
  const [tsLoading, setTsLoading] = useState(false);
  const [tsError, setTsError] = useState('');
  const [tsResult, setTsResult] = useState(null);

  // Saqlash formasi
  const [tsSaveOpen, setTsSaveOpen] = useState(false);
  const [tsSaving, setTsSaving] = useState(false);
  const [tsSaveError, setTsSaveError] = useState('');
  const [tsSaveSuccess, setTsSaveSuccess] = useState('');
  const [tsSaveForm, setTsSaveForm] = useState({
    title: '', month: now.getMonth() + 1, year: now.getFullYear(),
    startTime: '', endTime: '', duration: 45
  });

  const tsClass = scopeClasses.find(c => c._id === tsClassId);
  const tsMySubjects = (tsClass?.subjects || []).filter(s => s.isMine);

  const runTestGen = async () => {
    if (!tsClassId || !tsSubjectId) { setTsError('Sinf va fanni tanlang'); return; }
    setTsLoading(true);
    setTsError('');
    setTsResult(null);
    setTsSaveSuccess('');
    setTsSaveOpen(false);
    try {
      const data = await apiService.teacherAiGenerateTest({
        classId: tsClassId,
        subjectId: tsSubjectId,
        topic: tsTopic,
        questionCount: tsCount,
        difficulty: tsDifficulty,
        questionType: tsType
      });
      setTsResult(data);
      const startDefault = new Date(Date.now() + 60 * 60 * 1000);
      const endDefault = new Date(startDefault.getTime() + 60 * 60 * 1000);
      setTsSaveForm({
        title: data.title || '',
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        startTime: formatDateTimeLocal(startDefault),
        endTime: formatDateTimeLocal(endDefault),
        duration: 45
      });
    } catch (error) {
      setTsError(error.response?.data?.message || 'Test yaratishda xato yuz berdi');
    } finally {
      setTsLoading(false);
    }
  };

  const removeQuestion = (index) => {
    setTsResult(prev => {
      if (!prev) return prev;
      const questions = prev.questions.filter((_, i) => i !== index);
      return {
        ...prev,
        questions,
        totalPoints: Math.round(questions.reduce((s, q) => s + (q.points || 0), 0) * 10) / 10
      };
    });
  };

  const saveTest = async () => {
    if (!tsResult || tsResult.questions.length === 0) return;
    if (!tsSaveForm.title.trim()) { setTsSaveError('Test nomini kiriting'); return; }
    if (!tsSaveForm.startTime || !tsSaveForm.endTime) { setTsSaveError('Boshlanish va tugash vaqtini kiriting'); return; }
    setTsSaving(true);
    setTsSaveError('');
    try {
      await apiService.createTest({
        title: tsSaveForm.title,
        description: `AI yordamida yaratilgan test${tsTopic ? ' — mavzu: ' + tsTopic : ''}`,
        subject: tsSubjectId,
        classId: tsClassId,
        month: Number(tsSaveForm.month),
        year: Number(tsSaveForm.year),
        testDate: tsSaveForm.startTime,
        startTime: tsSaveForm.startTime,
        endTime: tsSaveForm.endTime,
        duration: Number(tsSaveForm.duration) || 45,
        questions: tsResult.questions
      });
      setTsSaveSuccess("✅ Test muvaffaqiyatli saqlandi! Uni \"Testlar\" bo'limida ko'rishingiz mumkin.");
      setTsSaveOpen(false);
    } catch (error) {
      setTsSaveError(error.response?.data?.message || 'Testni saqlashda xato yuz berdi');
    } finally {
      setTsSaving(false);
    }
  };

  // ═══════════════════════ DARS REJA GENERATORI ═══════════════════════
  const [plClassId, setPlClassId] = useState('');
  const [plSubjectId, setPlSubjectId] = useState('');
  const [plTopic, setPlTopic] = useState('');
  const [plDuration, setPlDuration] = useState(45);
  const [plLessons, setPlLessons] = useState(1);
  const [plLoading, setPlLoading] = useState(false);
  const [plError, setPlError] = useState('');
  const [plResult, setPlResult] = useState(null);
  const [plCopied, setPlCopied] = useState(false);

  const plClass = scopeClasses.find(c => c._id === plClassId);
  const plMySubjects = (plClass?.subjects || []).filter(s => s.isMine);

  const runPlanGen = async () => {
    if (!plClassId || !plSubjectId) { setPlError('Sinf va fanni tanlang'); return; }
    if (!plTopic.trim()) { setPlError('Dars mavzusini kiriting'); return; }
    setPlLoading(true);
    setPlError('');
    setPlResult(null);
    setPlCopied(false);
    try {
      const data = await apiService.teacherAiGenerateLessonPlan({
        classId: plClassId,
        subjectId: plSubjectId,
        topic: plTopic,
        duration: plDuration,
        lessonsCount: plLessons
      });
      setPlResult(data);
    } catch (error) {
      setPlError(error.response?.data?.message || 'Dars reja yaratishda xato yuz berdi');
    } finally {
      setPlLoading(false);
    }
  };

  const copyPlan = async () => {
    if (!plResult?.plan) return;
    try {
      await navigator.clipboard.writeText(plResult.plan);
      setPlCopied(true);
      setTimeout(() => setPlCopied(false), 2500);
    } catch (e) { /* clipboard ruxsati yo'q */ }
  };

  const downloadPlan = () => {
    if (!plResult?.plan) return;
    const header = `DARS REJA\nFan: ${plResult.subjectName}\nSinf: ${plResult.className}\nMavzu: ${plResult.topic}\n${'='.repeat(40)}\n\n`;
    const blob = new Blob([header + plResult.plan], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dars-reja-${(plResult.subjectName || 'fan').toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ═══════════════════════ RENDER ═══════════════════════
  const renderClassOptions = () =>
    scopeClasses.map(c => (
      <option key={c._id} value={c._id}>
        {c.name} ({c.studentsCount} o'quvchi{c.isClassTeacher ? ', siz rahbarsiz' : ''})
      </option>
    ));

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="tai-page">
      {/* ─── Sarlavha ─── */}
      <div className="tai-hero">
        <div className="tai-hero-icon">🤖</div>
        <div className="tai-hero-text">
          <h1>AI Yordamchi</h1>
          <p>Baholar tahlili, dars jadvali va test generatori — faqat sizning sinflaringiz ma'lumotlari asosida</p>
        </div>
        <div className="tai-hero-badge">
          <span className="tai-dot" /> Himoyalangan rejim
        </div>
      </div>

      {/* ─── Tablar ─── */}
      <div className="tai-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tai-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tai-tab-icon">{tab.icon}</span>
            <span className="tai-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {scopeLoaded && scopeClasses.length === 0 && activeTab !== 'chat' && (
        <div className="tai-warn">
          Sizga hali sinf biriktirilmagan. Administrator sizni sinfga (rahbar yoki fan o'qituvchisi sifatida) biriktirgach, bu bo'limlar ishlaydi.
        </div>
      )}

      {/* ═══════════ CHAT TAB ═══════════ */}
      {activeTab === 'chat' && (
        <div className="tai-chat-layout">
          <aside className="tai-sessions">
            <button className="tai-new-btn" onClick={newChat}>➕ Yangi suhbat</button>
            {sessions.length === 0 ? (
              <div className="tai-sessions-empty">Suhbatlar yo'q</div>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.sessionId}
                  className={`tai-session-item ${sessionId === s.sessionId ? 'active' : ''}`}
                  onClick={() => loadSession(s.sessionId)}
                >
                  <span className="tai-session-title">{s.title || 'Suhbat'}</span>
                  <button
                    className="tai-session-del"
                    onClick={(e) => deleteSession(s._id, s.sessionId, e)}
                    title="O'chirish"
                  >✕</button>
                </div>
              ))
            )}
          </aside>

          <main className="tai-chat-main">
            <div className="tai-messages">
              {messages.length === 0 && (
                <div className="tai-welcome">
                  <div className="tai-welcome-bot">🤖</div>
                  <h2>Assalomu alaykum{firstName ? `, ${firstName}` : ''}! 👋</h2>
                  <p>
                    Men sizning AI yordamchingizman. Sinflaringiz va o'quvchilaringiz
                    bo'yicha tahlil qilaman, metodik maslahatlar beraman.
                    Quyidagilardan birini tanlang yoki savolingizni yozing:
                  </p>
                  <div className="tai-suggestions">
                    {CHAT_SUGGESTIONS.map((q, i) => (
                      <button key={i} className="tai-suggestion" onClick={() => sendMessage(q.text)}>
                        <span className="tai-sug-icon">{q.icon}</span>
                        <span>{q.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`tai-msg ${msg.role}`}>
                  <div className="tai-avatar">{msg.role === 'assistant' ? '🤖' : '👨‍🏫'}</div>
                  <div className="tai-bubble">{renderAiText(msg.content)}</div>
                </div>
              ))}

              {chatLoading && (
                <div className="tai-msg assistant">
                  <div className="tai-avatar">🤖</div>
                  <div className="tai-bubble">
                    <div className="tai-typing"><span></span><span></span><span></span></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="tai-input-area">
              <textarea
                ref={inputRef}
                className="tai-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="Savolingizni yozing..."
                rows={1}
                disabled={chatLoading}
              />
              <button className="tai-send" onClick={handleSend} disabled={chatLoading || !input.trim()} title="Yuborish">
                ➤
              </button>
            </div>
          </main>
        </div>
      )}

      {/* ═══════════ BAHOLAR TAHLILI TAB ═══════════ */}
      {activeTab === 'analysis' && (
        <div className="tai-panel">
          <div className="tai-panel-head">
            <h2>📊 Baholar tahlili</h2>
            <p>O'quvchilaringiz baholarini AI yordamida chuqur tahlil qiling</p>
          </div>

          <div className="tai-form-grid">
            <label className="tai-field">
              <span>Sinf</span>
              <select value={anClassId} onChange={(e) => { setAnClassId(e.target.value); setAnSubjectId(''); }}>
                <option value="">— Sinfni tanlang —</option>
                {renderClassOptions()}
              </select>
            </label>
            <label className="tai-field">
              <span>Fan</span>
              <select value={anSubjectId} onChange={(e) => setAnSubjectId(e.target.value)} disabled={!anClassId}>
                <option value="">{anClass?.isClassTeacher ? 'Barcha fanlar' : 'Barcha fanlarim'}</option>
                {(anClass?.subjects || []).map(s => (
                  <option key={s._id} value={s._id}>{s.name}{s.isMine ? '' : ' (sinf fani)'}</option>
                ))}
              </select>
            </label>
            <label className="tai-field">
              <span>Oy</span>
              <select value={anMonth} onChange={(e) => setAnMonth(Number(e.target.value))}>
                <option value={0}>Barcha oylar</option>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </label>
            <label className="tai-field">
              <span>Yil</span>
              <select value={anYear} onChange={(e) => setAnYear(Number(e.target.value))}>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
          </div>

          {anError && <div className="tai-error">{anError}</div>}

          <button className="tai-action-btn" onClick={runAnalysis} disabled={anLoading || !anClassId}>
            {anLoading ? <span className="tai-spinner" /> : '✨'} {anLoading ? 'Tahlil qilinmoqda...' : 'Tahlil qilish'}
          </button>

          {anResult && (
            <div className="tai-result">
              {anResult.stats && anResult.stats.totalGrades > 0 && (
                <>
                  <div className="tai-stat-cards">
                    <div className="tai-stat-card">
                      <span className="tai-stat-value">{anResult.stats.totalGrades}</span>
                      <span className="tai-stat-label">Jami baholar</span>
                    </div>
                    <div className="tai-stat-card">
                      <span className="tai-stat-value">{anResult.stats.students.length}</span>
                      <span className="tai-stat-label">O'quvchilar</span>
                    </div>
                    <div className="tai-stat-card">
                      <span className="tai-stat-value">{anResult.stats.className}</span>
                      <span className="tai-stat-label">Sinf</span>
                    </div>
                    <div className="tai-stat-card">
                      <span className="tai-stat-value">{anResult.stats.period}</span>
                      <span className="tai-stat-label">Davr</span>
                    </div>
                  </div>

                  <div className="tai-table-wrap">
                    <table className="tai-table">
                      <thead>
                        <tr>
                          <th>#</th><th>O'quvchi</th><th>Kunlik ballar</th><th>Baholar soni</th><th>Imtihon o'zlashtirishi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anResult.stats.students.map((st, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td className="tai-td-name">{st.name}</td>
                            <td>{st.dailySum}</td>
                            <td>{st.dailyCount + st.examCount}</td>
                            <td>
                              {st.examPercent != null ? (
                                <span className={`tai-pct ${st.examPercent >= 80 ? 'good' : st.examPercent >= 60 ? 'mid' : 'low'}`}>
                                  {st.examPercent}%
                                </span>
                              ) : <span className="tai-pct none">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="tai-ai-box">
                <div className="tai-ai-box-head">🤖 AI tahlili</div>
                <div className="tai-ai-box-body">{renderAiText(anResult.analysis)}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ JADVAL GENERATORI TAB ═══════════ */}
      {activeTab === 'schedule' && (
        <div className="tai-panel">
          <div className="tai-panel-head">
            <h2>📅 Dars jadvali generatori</h2>
            <p>Sinfingiz fanlari asosida AI optimal haftalik jadval loyihasini tuzib beradi</p>
          </div>

          <div className="tai-form-grid">
            <label className="tai-field">
              <span>Sinf</span>
              <select value={schClassId} onChange={(e) => setSchClassId(e.target.value)}>
                <option value="">— Sinfni tanlang —</option>
                {renderClassOptions()}
              </select>
            </label>
            <label className="tai-field">
              <span>Kuniga darslar soni</span>
              <select value={schLessons} onChange={(e) => setSchLessons(Number(e.target.value))}>
                {[3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} ta</option>)}
              </select>
            </label>
            <label className="tai-field">
              <span>Birinchi dars boshlanishi</span>
              <input type="time" value={schStart} onChange={(e) => setSchStart(e.target.value)} />
            </label>
            <label className="tai-field">
              <span>Dars davomiyligi (daqiqa)</span>
              <select value={schDuration} onChange={(e) => setSchDuration(Number(e.target.value))}>
                {[30, 35, 40, 45, 60, 80, 90].map(n => <option key={n} value={n}>{n} daqiqa</option>)}
              </select>
            </label>
            <label className="tai-field">
              <span>Tanaffus (daqiqa)</span>
              <select value={schBreak} onChange={(e) => setSchBreak(Number(e.target.value))}>
                {[0, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n} daqiqa</option>)}
              </select>
            </label>
          </div>

          <div className="tai-field">
            <span className="tai-field-label">Hafta kunlari</span>
            <div className="tai-day-chips">
              {WEEK_DAYS.map(d => (
                <button
                  key={d.en}
                  type="button"
                  className={`tai-chip ${schDays.includes(d.en) ? 'active' : ''}`}
                  onClick={() => toggleDay(d.en)}
                >
                  {d.uz}
                </button>
              ))}
            </div>
          </div>

          <label className="tai-field">
            <span>Istaklaringiz (ixtiyoriy)</span>
            <textarea
              className="tai-textarea"
              value={schWishes}
              onChange={(e) => setSchWishes(e.target.value)}
              placeholder="Masalan: matematika har kuni birinchi dars bo'lsin, jismoniy tarbiya juma kuni..."
              rows={2}
              maxLength={500}
            />
          </label>

          {schError && <div className="tai-error">{schError}</div>}

          <button className="tai-action-btn" onClick={runScheduleGen} disabled={schLoading || !schClassId}>
            {schLoading ? <span className="tai-spinner" /> : '✨'} {schLoading ? 'Yaratilmoqda...' : 'Jadval yaratish'}
          </button>

          {schResult?.draft && (
            <div className="tai-result">
              <div className="tai-note">ℹ️ {schResult.note}</div>
              <div className="tai-table-wrap">
                <table className="tai-table tai-sch-table">
                  <thead>
                    <tr>
                      <th>Vaqt</th>
                      {schResult.draft.days.map(d => <th key={d.day}>{d.dayUz}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(schResult.draft.days[0]?.periods || []).map((_, slotIdx) => (
                      <tr key={slotIdx}>
                        <td className="tai-td-time">
                          {schResult.draft.days[0].periods[slotIdx].startTime}–{schResult.draft.days[0].periods[slotIdx].endTime}
                        </td>
                        {schResult.draft.days.map(d => (
                          <td key={d.day}>
                            <div className="tai-sch-cell">
                              <strong>{d.periods[slotIdx]?.subject || '—'}</strong>
                              {d.periods[slotIdx]?.teacher && <small>{d.periods[slotIdx].teacher}</small>}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ TEST GENERATORI TAB ═══════════ */}
      {activeTab === 'test' && (
        <div className="tai-panel">
          <div className="tai-panel-head">
            <h2>📝 Oylik test generatori</h2>
            <p>AI siz o'qitadigan fan bo'yicha sinf darajasiga mos test savollarini tuzib beradi</p>
          </div>

          <div className="tai-form-grid">
            <label className="tai-field">
              <span>Sinf</span>
              <select value={tsClassId} onChange={(e) => { setTsClassId(e.target.value); setTsSubjectId(''); }}>
                <option value="">— Sinfni tanlang —</option>
                {renderClassOptions()}
              </select>
            </label>
            <label className="tai-field">
              <span>Fan (siz o'qitadigan)</span>
              <select value={tsSubjectId} onChange={(e) => setTsSubjectId(e.target.value)} disabled={!tsClassId}>
                <option value="">— Fanni tanlang —</option>
                {tsMySubjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </label>
            <label className="tai-field">
              <span>Savollar soni</span>
              <select value={tsCount} onChange={(e) => setTsCount(Number(e.target.value))}>
                {[5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>{n} ta</option>)}
              </select>
            </label>
            <label className="tai-field">
              <span>Qiyinlik darajasi</span>
              <select value={tsDifficulty} onChange={(e) => setTsDifficulty(e.target.value)}>
                <option value="oson">Oson</option>
                <option value="o'rta">O'rta</option>
                <option value="qiyin">Qiyin</option>
                <option value="aralash">Aralash</option>
              </select>
            </label>
            <label className="tai-field">
              <span>Savol turi</span>
              <select value={tsType} onChange={(e) => setTsType(e.target.value)}>
                <option value="single">Bir variantli</option>
                <option value="multiple">Ko'p variantli</option>
                <option value="text">Yozma javob</option>
                <option value="mixed">Aralash</option>
              </select>
            </label>
          </div>

          <label className="tai-field">
            <span>Mavzu(lar)</span>
            <textarea
              className="tai-textarea"
              value={tsTopic}
              onChange={(e) => setTsTopic(e.target.value)}
              placeholder="Masalan: Kasrlar, o'nli kasrlar ustida amallar. Bo'sh qoldirsangiz — sinf dasturining asosiy mavzulari olinadi."
              rows={2}
              maxLength={600}
            />
          </label>

          {tsClassId && tsMySubjects.length === 0 && (
            <div className="tai-warn">Bu sinfda siz o'qitadigan fan yo'q. Test faqat o'zingiz o'qitadigan fan bo'yicha yaratiladi.</div>
          )}
          {tsError && <div className="tai-error">{tsError}</div>}

          <button className="tai-action-btn" onClick={runTestGen} disabled={tsLoading || !tsClassId || !tsSubjectId}>
            {tsLoading ? <span className="tai-spinner" /> : '✨'} {tsLoading ? 'Savollar yaratilmoqda...' : 'Test yaratish'}
          </button>

          {tsSaveSuccess && <div className="tai-success">{tsSaveSuccess}</div>}

          {tsResult && (
            <div className="tai-result">
              <div className="tai-test-head">
                <div>
                  <h3>{tsResult.title}</h3>
                  <p>{tsResult.subjectName} • {tsResult.className} • {tsResult.questions.length} ta savol • {tsResult.totalPoints} ball</p>
                </div>
                <button className="tai-save-btn" onClick={() => { setTsSaveOpen(!tsSaveOpen); setTsSaveError(''); }}>
                  💾 Testlarga saqlash
                </button>
              </div>

              {tsSaveOpen && (
                <div className="tai-save-form">
                  <div className="tai-form-grid">
                    <label className="tai-field tai-field-wide">
                      <span>Test nomi</span>
                      <input
                        type="text"
                        value={tsSaveForm.title}
                        onChange={(e) => setTsSaveForm(f => ({ ...f, title: e.target.value }))}
                        maxLength={120}
                      />
                    </label>
                    <label className="tai-field">
                      <span>Oy</span>
                      <select value={tsSaveForm.month} onChange={(e) => setTsSaveForm(f => ({ ...f, month: Number(e.target.value) }))}>
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                    </label>
                    <label className="tai-field">
                      <span>Yil</span>
                      <select value={tsSaveForm.year} onChange={(e) => setTsSaveForm(f => ({ ...f, year: Number(e.target.value) }))}>
                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </label>
                    <label className="tai-field">
                      <span>Boshlanish vaqti</span>
                      <input
                        type="datetime-local"
                        value={tsSaveForm.startTime}
                        onChange={(e) => setTsSaveForm(f => ({ ...f, startTime: e.target.value }))}
                      />
                    </label>
                    <label className="tai-field">
                      <span>Tugash vaqti</span>
                      <input
                        type="datetime-local"
                        value={tsSaveForm.endTime}
                        onChange={(e) => setTsSaveForm(f => ({ ...f, endTime: e.target.value }))}
                      />
                    </label>
                    <label className="tai-field">
                      <span>Davomiyligi (daqiqa)</span>
                      <input
                        type="number"
                        min={5}
                        max={240}
                        value={tsSaveForm.duration}
                        onChange={(e) => setTsSaveForm(f => ({ ...f, duration: e.target.value }))}
                      />
                    </label>
                  </div>
                  {tsSaveError && <div className="tai-error">{tsSaveError}</div>}
                  <button className="tai-action-btn" onClick={saveTest} disabled={tsSaving}>
                    {tsSaving ? <span className="tai-spinner" /> : '💾'} {tsSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                  </button>
                </div>
              )}

              <div className="tai-questions">
                {tsResult.questions.map((q, i) => (
                  <div key={i} className="tai-question">
                    <div className="tai-q-head">
                      <span className="tai-q-num">{i + 1}</span>
                      <span className="tai-q-text">{q.questionText}</span>
                      <span className="tai-q-meta">
                        {q.questionType === 'single' ? '○ bir variantli' : q.questionType === 'multiple' ? '☐ ko\'p variantli' : '✎ yozma'} • {q.points} ball
                      </span>
                      <button className="tai-q-del" onClick={() => removeQuestion(i)} title="Savolni o'chirish">✕</button>
                    </div>
                    {q.options.length > 0 ? (
                      <div className="tai-q-options">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className={`tai-q-option ${opt.isCorrect ? 'correct' : ''}`}>
                            <span className="tai-q-letter">{String.fromCharCode(65 + oi)}</span>
                            <span>{opt.text}</span>
                            {opt.isCorrect && <span className="tai-q-check">✓</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="tai-q-answer">
                        <strong>Namunaviy javob:</strong> {q.correctAnswer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {/* ═══════════ DARS REJA TAB ═══════════ */}
      {activeTab === 'plan' && (
        <div className="tai-panel">
          <div className="tai-panel-head">
            <h2>📖 Dars reja generatori</h2>
            <p>Darslaringizni oldindan rejalashtiring — AI professional dars ishlanmasini tuzib beradi</p>
          </div>

          <div className="tai-form-grid">
            <label className="tai-field">
              <span>Sinf</span>
              <select value={plClassId} onChange={(e) => { setPlClassId(e.target.value); setPlSubjectId(''); }}>
                <option value="">— Sinfni tanlang —</option>
                {renderClassOptions()}
              </select>
            </label>
            <label className="tai-field">
              <span>Fan (siz o'qitadigan)</span>
              <select value={plSubjectId} onChange={(e) => setPlSubjectId(e.target.value)} disabled={!plClassId}>
                <option value="">— Fanni tanlang —</option>
                {plMySubjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </label>
            <label className="tai-field">
              <span>Dars davomiyligi</span>
              <select value={plDuration} onChange={(e) => setPlDuration(Number(e.target.value))}>
                {[30, 35, 40, 45, 60, 80, 90].map(n => <option key={n} value={n}>{n} daqiqa</option>)}
              </select>
            </label>
            <label className="tai-field">
              <span>Darslar soni</span>
              <select value={plLessons} onChange={(e) => setPlLessons(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} ta dars</option>)}
              </select>
            </label>
          </div>

          <label className="tai-field">
            <span>Dars mavzusi</span>
            <textarea
              className="tai-textarea"
              value={plTopic}
              onChange={(e) => setPlTopic(e.target.value)}
              placeholder="Masalan: Kvadrat tenglamalar va ularni yechish usullari"
              rows={2}
              maxLength={600}
            />
          </label>

          {plClassId && plMySubjects.length === 0 && (
            <div className="tai-warn">Bu sinfda siz o'qitadigan fan yo'q. Dars reja faqat o'zingiz o'qitadigan fan bo'yicha tuziladi.</div>
          )}
          {plError && <div className="tai-error">{plError}</div>}

          <button className="tai-action-btn" onClick={runPlanGen} disabled={plLoading || !plClassId || !plSubjectId}>
            {plLoading ? <span className="tai-spinner" /> : '✨'} {plLoading ? 'Reja tuzilmoqda...' : 'Dars reja tuzish'}
          </button>

          {plResult && (
            <div className="tai-result">
              <div className="tai-test-head">
                <div>
                  <h3>📖 {plResult.topic}</h3>
                  <p>{plResult.subjectName} • {plResult.className} • {plResult.duration} daqiqa • {plResult.lessonsCount} ta dars</p>
                </div>
                <div className="tai-plan-actions">
                  <button className="tai-plan-btn" onClick={copyPlan}>
                    {plCopied ? '✅ Nusxalandi' : '📋 Nusxalash'}
                  </button>
                  <button className="tai-plan-btn" onClick={downloadPlan}>
                    ⬇️ Yuklab olish
                  </button>
                </div>
              </div>
              <div className="tai-ai-box">
                <div className="tai-ai-box-head">📖 Dars ishlanmasi</div>
                <div className="tai-ai-box-body">{renderAiText(plResult.plan)}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherAI;
