import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import apiService from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import AIAvatar from './AIAvatar';
import './AIAssistant.css';
import './AIAssistant.director.css';


const createSessionId = () => 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);

const ICONS = {
  bot: (
    <>
      <path d="M12 7V4" />
      <path d="M8 4h8" />
      <rect x="4" y="8" width="16" height="12" rx="4" />
      <path d="M9 14h.01" />
      <path d="M15 14h.01" />
      <path d="M9 17h6" />
    </>
  ),
  chat: (
    <>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12 21 2" />
      <path d="m16 7 2 2" />
      <path d="m19 4 2 2" />
    </>
  ),
  usage: (
    <>
      <path d="M3 3v18h18" />
      <path d="m7 14 4-4 3 3 5-7" />
      <path d="M18 6h1v1" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6 18 20H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  attendance: (
    <>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
      <path d="m9 16 2 2 4-5" />
    </>
  ),
  wallet: (
    <>
      <path d="M20 7H5a3 3 0 0 0 0 6h15v6H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h15z" />
      <path d="M16 13h.01" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M5 5H3v2a4 4 0 0 0 4 4" />
      <path d="M19 5h2v2a4 4 0 0 1-4 4" />
    </>
  ),
  calendar: (
    <>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
    </>
  ),
  warning: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  check: (
    <>
      <path d="m20 6-11 11-5-5" />
    </>
  ),
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  gauge: (
    <>
      <path d="M21 12a9 9 0 1 0-18 0" />
      <path d="M12 12 17 7" />
      <path d="M5 19h14" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v6h6" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  copyCheck: (
    <>
      <path d="m20 6-11 11-5-5" />
    </>
  ),
  mic: (
    <>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </>
  ),
  micOff: (
    <>
      <line x1="2" x2="22" y1="2" y2="22" />
      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
      <path d="M5 10v2a7 7 0 0 0 12 5" />
      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </>
  )
};

const Icon = ({ name, size = 18, className = '' }) => (
  <svg
    className={`ai-icon ${className}`.trim()}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {ICONS[name] || ICONS.bot}
  </svg>
);

const renderInlineText = (text) => {
  const content = String(text || '');
  const parts = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const formattedText = match[2] || match[3];
    const key = `${match.index}-${formattedText}`;
    parts.push(match[2] ? (
      <strong key={key}>{formattedText}</strong>
    ) : (
      <em key={key}>{formattedText}</em>
    ));

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.map((part, index) => (
    typeof part === 'string' ? part.replace(/\*/g, '') : React.cloneElement(part, { key: part.key || index })
  ));
};

const renderMessageContent = (content) => {
  const lines = String(content || '').split(/\r?\n/);
  const elements = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    const listIndex = elements.length;
    elements.push(
      <ul key={`list-${listIndex}`} className="ai-response-list">
        {listItems.map((item, index) => (
          <li key={index}>{renderInlineText(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      if (elements.length > 0) {
        elements.push(<div key={`space-${index}`} className="message-spacer" />);
      }
      return;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      listItems.push(bulletMatch[1].trim());
      return;
    }

    flushList();
    const cleanedLine = trimmed.replace(/^#{1,6}\s+/, '');
    elements.push(
      <p key={`line-${index}`} className="ai-response-line">
        {renderInlineText(cleanedLine)}
      </p>
    );
  });

  flushList();
  return elements;
};

const SANDBOX_ROLES = [
  { role: 'admin',       label: 'Admin',        icon: '🛡️' },
  { role: 'teacher',    label: "O'qituvchi",   icon: '👨‍🏫' },
  { role: 'student',   label: "O'quvchi",     icon: '👨‍🎓' },
  { role: 'accountant', label: 'Hisobchi',      icon: '💰' },
  { role: 'hr',         label: 'HR',            icon: '📋' },
  { role: 'reception',  label: 'Reception',     icon: '🛎️' },
  { role: 'call-center',label: 'Call Markaz',   icon: '📞' }
];

const AIAssistant = () => {
  const { user } = useAuth();
  const adminName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '';
  const [activeTab, setActiveTab] = useState('chat');
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState([]);
  const [usage, setUsage] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [userAvatarError, setUserAvatarError] = useState(false);

  const isLimitReached = usage && usage.totalDailyLimit > 0 && usage.totalDailyRemaining <= 0;
  const hasNoKeys = apiKeys.length === 0;

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  // API Key form state
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [keyForm, setKeyForm] = useState({
    name: '',
    apiKey: '',
    provider: 'gemini',
    rateLimitPerDay: 1500,
    isPrimary: false
  });
  const [keyFormError, setKeyFormError] = useState('');
  const [keyFormSaving, setKeyFormSaving] = useState(false);

  // Sandbox state
  const [sandboxes, setSandboxes] = useState([]);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [selectedSandboxRole, setSelectedSandboxRole] = useState('admin');
  const [sandboxForm, setSandboxForm] = useState({ name: '', systemPrompt: '', description: '', isActive: true });
  const [sandboxSaving, setSandboxSaving] = useState(false);
  const [sandboxMsg, setSandboxMsg] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const userProfileImageUrl = useMemo(() => {
    if (!user?.profileImage) return null;
    const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com';
    const timestamp = user?._updated || Date.now();
    return `${baseUrl}${user.profileImage}?t=${timestamp}`;
  }, [user?.profileImage, user?._updated]);

  useEffect(() => {
    setUserAvatarError(false);
  }, [userProfileImageUrl]);

  const renderMessageAvatar = (role) => {
    if (role === 'user') {
      if (userProfileImageUrl && !userAvatarError) {
        const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Foydalanuvchi';
        return (
          <img
            src={userProfileImageUrl}
            alt={userName}
            className="message-avatar-img"
            onError={() => setUserAvatarError(true)}
          />
        );
      }

      return <Icon name="user" size={18} />;
    }

    return <AIAvatar isEmbedded={true} scale={0.16} />;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await apiService.getAiSessions();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Sessiyalarni yuklashda xato:', error);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const fetchApiKeys = useCallback(async () => {
    try {
      const data = await apiService.getAiApiKeys();
      setApiKeys(data.keys || []);
    } catch (error) {
      console.error('API kalitlarni yuklashda xato:', error);
    }
  }, []);

  const fetchUsage = useCallback(async () => {
    try {
      const data = await apiService.getAiUsage();
      setUsage(data);
    } catch (error) {
      console.error('Foydalanish ma\'lumotlarini yuklashda xato:', error);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchApiKeys();
    fetchUsage();
  }, [fetchSessions, fetchApiKeys, fetchUsage]);

  const loadSession = async (sessionId) => {
    try {
      const data = await apiService.getAiChatHistory(sessionId);
      setCurrentSession(sessionId);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Suhbatni yuklashda xato:', error);
    }
  };

  const newChat = () => {
    const sessionId = createSessionId();
    setCurrentSession(sessionId);
    setMessages([]);
    inputRef.current?.focus();
  };

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: null });

  const closeConfirm = () => setShowConfirm(false);

  const triggerConfirm = (config) => {
    setConfirmConfig(config);
    setShowConfirm(true);
  };

  const deleteSession = (id, sessionId, e) => {
    e.stopPropagation();
    triggerConfirm({
      title: 'Suhbatni o\'chirish',
      message: "Haqiqatan ham ushbu suhbatni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.",
      onConfirm: async () => {
        try {
          await apiService.deleteAiSession(id);
          if (currentSession === sessionId) {
            newChat();
          }
          fetchSessions();
          closeConfirm();
        } catch (error) {
          console.error('Suhbatni o\'chirishda xato:', error);
          alert('Suhbatni o\'chirishda xato yuz berdi');
        }
      }
    });
  };

  const removeApiKey = (id) => {
    triggerConfirm({
      title: 'API kalitni o\'chirish',
      message: 'Haqiqatan ham ushbu API kalitni o\'chirmoqchimisiz?',
      onConfirm: async () => {
        try {
          await apiService.deleteAiApiKey(id);
          fetchApiKeys();
          fetchUsage();
          closeConfirm();
        } catch (error) {
          alert("O'chirishda xato yuz berdi");
        }
      }
    });
  };

  const deleteAllSessions = () => {
    if (sessions.length === 0) return;
    triggerConfirm({
      title: 'Barcha suhbatlarni o\'chirish',
      message: `Haqiqatan ham barcha ${sessions.length} ta suhbatni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.`,
      onConfirm: async () => {
        try {
          await apiService.deleteAllAiSessions();
          newChat();
          fetchSessions();
          closeConfirm();
        } catch (error) {
          alert("O'chirishda xato yuz berdi");
        }
      }
    });
  };

  // ─── Sandbox funksiyalari ─────────────────────────────────────────────────
  const fetchSandboxes = useCallback(async () => {
    setSandboxLoading(true);
    try {
      const data = await apiService.getAiSandboxes();
      setSandboxes(data.sandboxes || []);
    } catch (e) {
      console.error('Sandbox yuklashda xato:', e);
    } finally {
      setSandboxLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'sandbox') fetchSandboxes();
  }, [activeTab, fetchSandboxes]);

  useEffect(() => {
    const sb = sandboxes.find(s => s.role === selectedSandboxRole);
    if (sb) {
      setSandboxForm({ name: sb.name || '', systemPrompt: sb.systemPrompt || '', description: sb.description || '', isActive: sb.isActive !== false });
    } else {
      setSandboxForm({ name: '', systemPrompt: '', description: '', isActive: true });
    }
    setSandboxMsg('');
  }, [selectedSandboxRole, sandboxes]);

  const saveSandbox = async () => {
    if (!sandboxForm.systemPrompt.trim()) { setSandboxMsg('System prompt majburiy!'); return; }
    setSandboxSaving(true); setSandboxMsg('');
    try {
      await apiService.upsertAiSandbox(selectedSandboxRole, sandboxForm);
      setSandboxMsg('✅ Saqlandi!');
      fetchSandboxes();
    } catch (e) {
      setSandboxMsg('❌ Saqlashda xato: ' + (e.response?.data?.message || e.message));
    } finally {
      setSandboxSaving(false);
    }
  };

  const resetSandbox = async () => {
    setSandboxSaving(true); setSandboxMsg('');
    try {
      await apiService.resetAiSandbox(selectedSandboxRole);
      setSandboxMsg('✅ Default ga qaytarildi!');
      fetchSandboxes();
    } catch (e) {
      setSandboxMsg('❌ Xato: ' + (e.response?.data?.message || e.message));
    } finally {
      setSandboxSaving(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const sessionId = currentSession || createSessionId();
    if (!currentSession) {
      setCurrentSession(sessionId);
    }
    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      const data = await apiService.sendAiMessage(sessionId, userMessage);
      setCurrentSession(data.sessionId || sessionId);
      setMessages(prev => [...prev, { role: 'assistant', content: data.message, timestamp: new Date() }]);
      setUsage(prev => data.usage ? { ...prev, ...data.usage } : prev);
      fetchSessions();
      fetchUsage();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'AI bilan bog\'lanishda xato yuz berdi';
      setMessages(prev => [...prev, { role: 'assistant', content: 'Xato: ' + errorMsg, timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyMessage = (content, idx) => {
    const plainText = String(content || '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .trim();
    navigator.clipboard.writeText(plainText).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = plainText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  // ====== Speech Recognition Setup ====== //
  const initSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return false; // Browser doesn't support it
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'uz-UZ'; // Primary lang: Uzbek (it usually picks up Russian/English okay if native, or we can leave default)

    recognition.onresult = (event) => {
      let finalTranscript = '';
      /* let interimTranscript = ''; */

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          /* interimTranscript += event.results[i][0].transcript; */
        }
      }

      if (finalTranscript) {
        setInputMessage((prev) => (prev ? prev + ' ' : '') + finalTranscript);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);

      if (event.error === 'not-allowed') {
        alert("Iltimos, brauzerning yuqori qismidagi (Manzil qatori oldida) qulf 🔒 belgisini bosib, mikrofonga ruxsat bering!");
      }
    };

    recognitionRef.current = recognition;
    return true;
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      if (!recognitionRef.current) {
        const supported = initSpeechRecognition();
        if (!supported) {
          alert("Kechirasiz, sizning brauzeringizda ovozli yozish funksiyasi qo'llab-quvvatlanmaydi.");
          return;
        }
      }
      setInputMessage(''); // clear previous to make it fresh
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Recording start fail', err);
      }
    }
  };
  // ===================================== //

  // API Key CRUD
  const resetKeyForm = () => {
    setEditingKey(null);
    setKeyForm({ name: '', apiKey: '', provider: 'gemini', rateLimitPerDay: 1500, isPrimary: false });
    setKeyFormError('');
    setShowKeyForm(false);
  };

  const saveApiKey = async () => {
    if (!keyForm.name.trim()) {
      setKeyFormError('Kalit nomini kiriting');
      return;
    }
    if (!editingKey && !keyForm.apiKey.trim()) {
      setKeyFormError('API kalitni kiriting');
      return;
    }
    setKeyFormSaving(true);
    setKeyFormError('');
    try {
      if (editingKey) {
        await apiService.updateAiApiKey(editingKey._id, keyForm);
      } else {
        await apiService.addAiApiKey(keyForm);
      }
      resetKeyForm();
      fetchApiKeys();
      fetchUsage();
    } catch (error) {
      setKeyFormError(error.response?.data?.message || 'API kalitni saqlashda xato');
    } finally {
      setKeyFormSaving(false);
    }
  };

  const editApiKey = (key) => {
    setEditingKey(key);
    setKeyForm({
      name: key.name,
      apiKey: '',
      provider: key.provider,
      rateLimitPerDay: key.rateLimitPerDay,
      isPrimary: key.isPrimary
    });
    setKeyFormError('');
    setShowKeyForm(true);
  };


  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getUsagePercent = (used, limit) => {
    if (!limit) return 0;
    return Math.min(Math.round((used / limit) * 100), 100);
  };

  const getUsageColor = (percent) => {
    if (percent >= 90) return '#ef4444';
    if (percent >= 70) return '#f59e0b';
    return '#22c55e';
  };
  const suggestedQuestions = [
    { text: "Maktab umumiy hisobotini ko'rsat", icon: 'trophy' },
    { text: "Qarzdor o'quvchilar ro'yxati", icon: 'warning' },
    { text: "Abbosdan 500000 so'm naqd to'lov qabul qil 2026-05 uchun", icon: 'wallet' },
    { text: "Aziz Karimov ismli yangi o'qituvchi qo'sh", icon: 'users' },
    { text: "5-A sinfiga davomat keldi deb belgila", icon: 'attendance' },
    { text: "Eng yaxshi o'quvchilar ro'yxati", icon: 'trophy' },
    { text: "Yangi lid: Anvar +998901234567", icon: 'chat' },
    { text: "Bayram qo'sh: Mustaqillik kuni 2026-09-01", icon: 'calendar' }
  ];

  const aiCapabilities = [
    {
      title: "O'quvchilar va Sinflar",
      icon: 'users',
      examples: [
        "5 ta yangi o'quvchi yarat 7-A sinfiga oylik 500000 so'm",
        "Abbos Karimov ismli o'quvchini 8-B sinfiga ko'chir",
        "Aybek ismli o'quvchini nofaollashtir",
        "9-C sinfini och, rahbar: Dilshod Rahimov",
        "Abbosga Matematikadan 5 baho qo'y",
        "5-A sinfidagi barcha o'quvchilarni keldi deb belgila"
      ]
    },
    {
      title: "Xodimlar Boshqaruvi",
      icon: 'user',
      examples: [
        "Yangi o'qituvchi qo'sh: Aziz Karimov, Matematika fani",
        "Hisobchi qo'sh: Nodira Yusupova",
        "HR xodimi qo'sh: Sanjar Aliev",
        "Reception qo'sh: Madina Karimova",
        "Aziz o'qituvchining dars narxini 80000 so'm qil",
        "Sardor ismli o'qituvchini nofaollashtir",
        "Barcha o'qituvchilar ro'yxatini ko'rsat"
      ]
    },
    {
      title: "Moliya",
      icon: 'wallet',
      examples: [
        "Abbosdan 500000 so'm naqd to'lov qabul qil 2026-05 uchun",
        "Aybek balansiga 200000 so'm qo'sh",
        "Akbarga kech qolgani uchun 50000 so'm jarima qo'y",
        "Aziz o'qituvchining maoshini ko'rsat",
        "Sardor o'qituvchining maoshini to'la",
        "Tonner uchun 250000 so'm xarajat qayd qil",
        "Bugungi moliyaviy holatni ko'rsat",
        "Qarzdorlar ro'yxatini ber"
      ]
    },
    {
      title: "Aloqa va E'lonlar",
      icon: 'chat',
      examples: [
        "Yangi lid qo'sh: Anvar, +998901234567, Instagram",
        "Yangi lidlar ro'yxatini ko'rsat",
        "Anvar lidning statusini O'quvchi bo'ldi ga o'zgartir",
        "Barcha o'quvchilarga e'lon yubor: Ertaga dars yo'q",
        "Lidlar statistikasini ko'rsat",
        "Ota-onalar bilan aloqa hisobotini ko'rsat",
        "Bu oyda ota-onalar qamrovini ber"
      ]
    },
    {
      title: "Jadval, Vazifa, Imtihon",
      icon: 'calendar',
      examples: [
        "Mustaqillik kuni 2026-09-01 sanasiga bayram qo'sh",
        "Bayramlar ro'yxatini ko'rsat",
        "5-A sinfining jadvalini ko'rsat",
        "Vazifa yarat: Matematika, 6-B sinf, Aziz o'qituvchi, muddati 2026-06-01",
        "Imtihon yarat: Fizika nazorat ishi, 9-A sinf, 2026-05-30"
      ]
    },
    {
      title: "Hisobotlar",
      icon: 'trophy',
      examples: [
        "Maktab umumiy hisobotini ko'rsat",
        "Sinflar bo'yicha hisobot",
        "O'qituvchilar yuklamasi",
        "Davomat hisobotini ber",
        "Eng yaxshi o'quvchilar ro'yxati",
        "Moliyaviy oy hisoboti 2026-05 uchun",
        "5-A sinfining to'lov holati",
        "Barcha o'qituvchilar maoshi hisobot"
      ]
    }
  ];

  return (
    <div className="ai-assistant">
      <div className="ai-header">
        <div className="ai-header-top">
          <h1 className="page-title">
            <div className="ai-title-avatar">
              <AIAvatar isEmbedded={true} scale={0.16} />
            </div>
            <span>AI Yordamchi</span>
          </h1>
          <p className="ai-subtitle">My Dream School tizimi uchun sun'iy intellekt yordamchisi</p>
        </div>
        <div className="ai-tabs">
          <button
            className={`ai-tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
            aria-pressed={activeTab === 'chat'}
          >
            <Icon name="chat" />
            <span>Suhbat</span>
          </button>
          <button
            className={`ai-tab ${activeTab === 'capabilities' ? 'active' : ''}`}
            onClick={() => setActiveTab('capabilities')}
            aria-pressed={activeTab === 'capabilities'}
            title="AI imkoniyatlari va misol buyruqlar"
          >
            <Icon name="trophy" />
            <span>Imkoniyatlar</span>
          </button>
          <button
            className={`ai-tab ${activeTab === 'keys' ? 'active' : ''}`}
            onClick={() => setActiveTab('keys')}
            aria-pressed={activeTab === 'keys'}
          >
            <Icon name="key" />
            <span>API kalitlar</span>
          </button>
          <button
            className={`ai-tab ${activeTab === 'usage' ? 'active' : ''}`}
            onClick={() => setActiveTab('usage')}
            aria-pressed={activeTab === 'usage'}
          >
            <Icon name="usage" />
            <span>Limitlar</span>
          </button>
          <button
            className={`ai-tab ${activeTab === 'sandbox' ? 'active' : ''}`}
            onClick={() => setActiveTab('sandbox')}
            aria-pressed={activeTab === 'sandbox'}
            title="Har bir rol uchun AI qoidalarini sozlash"
          >
            <Icon name="edit" />
            <span>Sandbox</span>
          </button>
        </div>
      </div>

      {activeTab === 'chat' && (
        <div className="ai-chat-container">
          <div className="ai-sessions">
            <button className="btn-new-chat" onClick={newChat}>
              <Icon name="plus" />
              <span>Yangi suhbat</span>
            </button>
            {sessions.length > 0 && (
              <button
                className="btn-delete-all-chats"
                onClick={deleteAllSessions}
                title="Barcha suhbatlarni o'chirish"
              >
                <Icon name="trash" size={14} />
                <span>Barchasini o'chirish ({sessions.length})</span>
              </button>
            )}
            <div className="sessions-list">
              {sessionsLoading ? (
                <div className="no-sessions">Yuklanmoqda...</div>
              ) : (
                sessions.map(s => (
                    <div
                      key={s.sessionId}
                      className={`session-item ${currentSession === s.sessionId ? 'active' : ''}`}
                      onClick={() => loadSession(s.sessionId)}
                    >
                      <div className="session-info">
                        <span className="session-title">{s.title || 'Yangi suhbat'}</span>
                        <span className="session-date">{formatDate(s.lastActivity || s.updatedAt || s.createdAt)}</span>
                      </div>
                      <button
                        className="session-delete"
                        onClick={(e) => deleteSession(s._id, s.sessionId, e)}
                        title="O'chirish"
                      >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                ))
              )}
              {!sessionsLoading && sessions.length === 0 && (
                <div className="no-sessions">Suhbatlar yo'q</div>
              )}
            </div>
            {usage && (
              <div className="usage-mini">
                <span className="usage-mini-label">Kunlik limit</span>
                <div className="usage-bar-mini">
                  <div
                    className="usage-fill-mini"
                    style={{
                      width: `${getUsagePercent(usage.totalDailyUsed || 0, usage.totalDailyLimit || 1)}%`,
                      background: getUsageColor(getUsagePercent(usage.totalDailyUsed || 0, usage.totalDailyLimit || 1))
                    }}
                  />
                </div>
                <div className="usage-mini-numbers">
                  <span>{usage.totalDailyUsed || 0}</span>
                  <span className="usage-remaining">Qoldi: {usage.totalDailyRemaining || 0}</span>
                </div>
              </div>
            )}
          </div>

          <div className="ai-chat-main">
            <div className="ai-messages">
              {messages.length === 0 && (
                <div className="ai-welcome">
                  <div className="ai-welcome-icon"><AIAvatar isEmbedded={true} scale={0.5} /></div>
                  <h2>Assalomu alaykum{adminName ? `, ${adminName}` : ''}!</h2>
                  <p>Men My Dream School tizimining AI yordamchisiman. Maktab ma'lumotlari asosida javob beraman va ruxsat berilgan amallarni bajaraman.</p>
                  <div className="ai-suggestions">
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        className="ai-suggestion-btn"
                        onClick={() => {
                          setInputMessage(q.text);
                          inputRef.current?.focus();
                        }}
                      >
                        <span className="suggestion-icon"><Icon name={q.icon} size={18} /></span>
                        <span>{q.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`ai-message ${msg.role}`}>
                  <div className={`message-avatar ${msg.role === 'user' && userProfileImageUrl && !userAvatarError ? 'has-image' : ''}`}>
                    {renderMessageAvatar(msg.role)}
                  </div>
                  <div className="message-content">
                    <div className="message-bubble-wrap">
                      <div className="message-text">
                        {renderMessageContent(msg.content)}
                      </div>
                      <button
                        className={`msg-copy-btn ${copiedIdx === idx ? 'copied' : ''}`}
                        onClick={() => copyMessage(msg.content, idx)}
                        title="Nusxa olish"
                      >
                        <Icon name={copiedIdx === idx ? 'copyCheck' : 'copy'} size={14} />
                      </button>
                    </div>
                    <div className="message-time">{formatTime(msg.timestamp)}</div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="ai-message assistant">
                  <div className="message-avatar"><AIAvatar isEmbedded={true} scale={0.16} /></div>
                  <div className="message-content">
                    <div className="message-text">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="ai-input-area">
              <button
                className={`ai-mic-btn ${isRecording ? 'recording' : ''}`}
                onClick={toggleRecording}
                disabled={isLoading || isLimitReached || hasNoKeys}
                title={isRecording ? "Yozishni to'xtatish" : "Ovozli xabar yozish"}
              >
                <Icon name={isRecording ? "micOff" : "mic"} size={20} />
              </button>
              <textarea
                ref={inputRef}
                className={`ai-input ${isRecording ? 'recording' : ''}`}
                value={isRecording && inputMessage.length === 0 ? "Eshitilmoqda..." : inputMessage}
                onChange={(e) => {
                  if (!isRecording) setInputMessage(e.target.value);
                }}
                onKeyPress={handleKeyPress}
                placeholder={
                  hasNoKeys 
                    ? "Iltimos, avval API kalit qo'shing (API kalitlar bo'limida)..." 
                    : isLimitReached 
                      ? "Kunlik limit tugadi. Iltimos ertaga urinib ko'ring yoki limitni oshiring." 
                      : "Savol yozing yoki mikrofonga gapiring..."
                }
                rows={1}
                disabled={isLoading || isLimitReached || hasNoKeys}
              />
              <button
                className="ai-send-btn"
                onClick={sendMessage}
                disabled={isLoading || isLimitReached || hasNoKeys || (!inputMessage.trim() && !isRecording)}
                title="Yuborish"
              >
                {isLoading ? <span className="send-loader" /> : <Icon name="send" size={20} />}
              </button>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'capabilities' && (
        <div className="ai-capabilities-container">
          <div className="ai-capabilities-header">
            <h2><Icon name="trophy" /> AI Imkoniyatlari</h2>
            <p className="ai-capabilities-subtitle">
              Direktor sifatida AI yordamchidan amalda bajara olishi mumkin bo'lgan barcha buyruqlar.
              Misol buyruqlarni bosib o'sha so'rovni darhol yuborishingiz mumkin.
            </p>
          </div>
          <div className="ai-capabilities-grid">
            {aiCapabilities.map((cap, idx) => (
              <div key={idx} className="capability-card">
                <div className="capability-header">
                  <span className="capability-icon"><Icon name={cap.icon} size={22} /></span>
                  <h3>{cap.title}</h3>
                </div>
                <ul className="capability-examples">
                  {cap.examples.map((ex, i) => (
                    <li key={i}>
                      <button
                        className="capability-example-btn"
                        onClick={() => {
                          setActiveTab('chat');
                          setInputMessage(ex);
                          setTimeout(() => inputRef.current?.focus(), 50);
                        }}
                        title="Bosib Suhbat tabiga o'tib yuborish uchun tayyorlanadi"
                      >
                        "{ex}"
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'keys' && (
        <div className="ai-keys-container">
          <div className="ai-keys-header">
            <h2><Icon name="key" /> API kalitlar</h2>
            <button
              className="btn-add-key"
              onClick={() => {
                setEditingKey(null);
                setKeyForm({ name: '', apiKey: '', provider: 'gemini', rateLimitPerDay: 1500, isPrimary: false });
                setKeyFormError('');
                setShowKeyForm(true);
              }}
            >
              <Icon name="plus" />
              <span>Yangi kalit</span>
            </button>
          </div>

          {showKeyForm && (
            <div className="key-form card">
              <h3>
                <Icon name={editingKey ? 'edit' : 'plus'} />
                <span>{editingKey ? 'Kalitni tahrirlash' : 'Yangi API kalit'}</span>
              </h3>
              {keyFormError && (
                <div className="key-form-error">{keyFormError}</div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>Kalit nomi</label>
                  <input
                    type="text"
                    value={keyForm.name}
                    onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })}
                    placeholder="Masalan: Asosiy kalit"
                  />
                </div>
                <div className="form-group">
                  <label>Provider</label>
                  <select
                    value={keyForm.provider}
                    onChange={(e) => setKeyForm({ ...keyForm, provider: e.target.value })}
                  >
                    <option value="gemini">Google Gemini</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>API Kalit</label>
                <input
                  type="password"
                  value={keyForm.apiKey}
                  onChange={(e) => setKeyForm({ ...keyForm, apiKey: e.target.value })}
                  placeholder={editingKey ? "O'zgartirish uchun kiriting..." : 'AIza...'}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Kunlik limit</label>
                  <input
                    type="number"
                    value={keyForm.rateLimitPerDay}
                    onChange={(e) => setKeyForm({ ...keyForm, rateLimitPerDay: parseInt(e.target.value) || 0 })}
                    min={1}
                  />
                </div>
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={keyForm.isPrimary}
                      onChange={(e) => setKeyForm({ ...keyForm, isPrimary: e.target.checked })}
                    />
                    Asosiy kalit sifatida belgilash
                  </label>
                </div>
              </div>
              <div className="form-actions">
                <button
                  className="btn-save"
                  onClick={saveApiKey}
                  disabled={keyFormSaving}
                >
                  {keyFormSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
                <button className="btn-cancel" onClick={resetKeyForm}>
                  Bekor qilish
                </button>
              </div>
            </div>
          )}

          <div className="api-keys-list">
            {apiKeys.map(key => (
              <div
                key={key._id}
                className={`api-key-card card ${key.isActive ? 'active' : 'inactive'}`}
              >
                <div className="key-info">
                  <div className="key-name">
                    {key.name}
                    {key.isPrimary && <span className="primary-badge"><Icon name="check" size={12} /> Asosiy</span>}
                    <span className={`status-badge ${key.isActive ? 'active' : 'inactive'}`}>
                      <Icon name={key.isActive ? 'check' : 'x'} size={12} />
                      {key.isActive ? 'Faol' : 'Nofaol'}
                    </span>
                  </div>
                  <div className="key-value">Kalit: {key.maskedKey}</div>
                  <div className="key-meta">
                    Provider: {key.provider} | Limit: {key.rateLimitPerDay}/kun
                  </div>
                  <div className="key-usage-bar">
                    <div className="usage-bar">
                      <div
                        className="usage-fill"
                        style={{
                          width: `${getUsagePercent(key.dailyUsage || 0, key.rateLimitPerDay || 1)}%`,
                          background: getUsageColor(getUsagePercent(key.dailyUsage || 0, key.rateLimitPerDay || 1))
                        }}
                      />
                    </div>
                    <div className="key-usage-numbers">
                      <span>Foydalanilgan: {key.dailyUsage || 0}</span>
                      <span>Qoldi: {key.dailyRemaining || 0} so'rov</span>
                    </div>
                  </div>
                </div>
                <div className="key-actions">
                  <button className="btn-edit" onClick={() => editApiKey(key)}>
                    <Icon name="edit" size={14} />
                    <span>Tahrirlash</span>
                  </button>
                  <button className="btn-delete" onClick={() => removeApiKey(key._id)}>
                    <Icon name="trash" size={14} />
                    <span>O'chirish</span>
                  </button>
                </div>
              </div>
            ))}
            {apiKeys.length === 0 && !showKeyForm && (
              <div className="no-keys card">
                <div className="no-keys-icon"><Icon name="key" size={44} /></div>
                <p>API kalitlar yo'q. Yangi kalit qo'shing.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'usage' && (
        <div className="ai-usage-container">
          <h2><Icon name="usage" /> API Foydalanish Statistikasi</h2>
          {usage ? (
            <>
              <div className="usage-summary-cards">
                <div className="usage-card card">
                  <div className="usage-card-icon"><Icon name="chat" size={30} /></div>
                  <div className="usage-card-value">{usage.totalDailyUsed || 0}</div>
                  <div className="usage-card-label">Bugun foydalanilgan</div>
                </div>
                <div className="usage-card card">
                  <div className="usage-card-icon"><Icon name="gauge" size={30} /></div>
                  <div className="usage-card-value">{usage.totalDailyLimit || 0}</div>
                  <div className="usage-card-label">Kunlik limit</div>
                </div>
                <div className="usage-card card">
                  <div className="usage-card-icon"><Icon name="clock" size={30} /></div>
                  <div className="usage-card-value">{usage.totalDailyRemaining || 0}</div>
                  <div className="usage-card-label">Qoldi</div>
                </div>
                <div className="usage-card card">
                  <div className="usage-card-icon"><Icon name="history" size={30} /></div>
                  <div className="usage-card-value">{usage.totalUsage || 0}</div>
                  <div className="usage-card-label">Jami so'rovlar</div>
                </div>
              </div>

              <div className="usage-daily-card card">
                <h3><Icon name="gauge" /> Kunlik foydalanish</h3>
                <div className="usage-progress-large">
                  <div className="usage-bar-large">
                    <div
                      className="usage-fill-large"
                      style={{
                        width: `${getUsagePercent(usage.totalDailyUsed || 0, usage.totalDailyLimit || 1)}%`,
                        background: getUsageColor(getUsagePercent(usage.totalDailyUsed || 0, usage.totalDailyLimit || 1))
                      }}
                    />
                  </div>
                  <div className="usage-numbers-large">
                    <span>Foydalanilgan: {usage.totalDailyUsed || 0}</span>
                    <span>Limit: {usage.totalDailyLimit || 0}</span>
                    <span>Qoldi: {usage.totalDailyRemaining || 0}</span>
                  </div>
                </div>
              </div>

              <div className="usage-keys-section">
                <h3><Icon name="key" /> Kalitlar bo'yicha statistika</h3>
                <div className="usage-keys-grid">
                  {usage.keys && usage.keys.map(k => {
                    const percent = getUsagePercent(k.dailyUsed || 0, k.dailyLimit || 1);
                    return (
                      <div key={k._id} className="usage-key-card card">
                        <div className="usage-key-header">
                          <h4>{k.name}</h4>
                          <span className={`status-badge ${k.isActive ? 'active' : 'inactive'}`}>
                            {k.isActive ? 'Faol' : 'Nofaol'}
                          </span>
                        </div>
                        <div className="usage-bar">
                          <div
                            className="usage-fill"
                            style={{
                              width: `${percent}%`,
                              background: getUsageColor(percent)
                            }}
                          />
                        </div>
                        <div className="key-usage-detail">
                          <span>Kunlik: {k.dailyUsed}/{k.dailyLimit}</span>
                          <span>Qoldi: {k.dailyRemaining}</span>
                          <span>Jami: {k.totalUsage}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {(!usage.keys || usage.keys.length === 0) && (
                  <div className="no-usage card">
                    <p>Kalitlar bo'yicha statistika mavjud emas</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-usage card">
              <p>Foydalanish statistikasi mavjud emas</p>
            </div>
          )}
        </div>
      )}
      {activeTab === 'sandbox' && (
        <div className="ai-sandbox-container">
          <div className="ai-sandbox-header">
            <h2><Icon name="edit" /> AI Sandbox — Rol qoidalari</h2>
            <p className="sandbox-subtitle">Har bir foydalanuvchi roli uchun AI ning xulq-atvori va qoidalarini sozlang. Bu qoidalar ma'lumotlar bazasida saqlanadi.</p>
          </div>
          <div className="sandbox-layout">
            <div className="sandbox-role-list">
              {SANDBOX_ROLES.map(r => {
                const sb = sandboxes.find(s => s.role === r.role);
                return (
                  <button
                    key={r.role}
                    className={`sandbox-role-btn ${selectedSandboxRole === r.role ? 'active' : ''}`}
                    onClick={() => setSelectedSandboxRole(r.role)}
                  >
                    <span className="sandbox-role-icon">{r.icon}</span>
                    <span className="sandbox-role-label">{r.label}</span>
                    {sb && !sb.isDefault && <span className="sandbox-saved-badge">✓</span>}
                  </button>
                );
              })}
            </div>
            <div className="sandbox-editor card">
              {sandboxLoading ? (
                <div className="sandbox-loading">Yuklanmoqda...</div>
              ) : (
                <>
                  <div className="sandbox-editor-header">
                    <h3>{SANDBOX_ROLES.find(r => r.role === selectedSandboxRole)?.icon} {SANDBOX_ROLES.find(r => r.role === selectedSandboxRole)?.label} AI Qoidalari</h3>
                    {sandboxes.find(s => s.role === selectedSandboxRole && !s.isDefault) && (
                      <span className="sandbox-custom-badge">Sozlangan</span>
                    )}
                  </div>
                  <div className="form-group">
                    <label>AI nomi</label>
                    <input
                      type="text"
                      value={sandboxForm.name}
                      onChange={e => setSandboxForm({...sandboxForm, name: e.target.value})}
                      placeholder="Masalan: Admin AI yordamchisi"
                    />
                  </div>
                  <div className="form-group">
                    <label>Tavsif</label>
                    <input
                      type="text"
                      value={sandboxForm.description}
                      onChange={e => setSandboxForm({...sandboxForm, description: e.target.value})}
                      placeholder="Qisqa tavsif..."
                    />
                  </div>
                  <div className="form-group">
                    <label>System Prompt — AI qoidalari <span className="required-star">*</span></label>
                    <textarea
                      className="sandbox-prompt-textarea"
                      value={sandboxForm.systemPrompt}
                      onChange={e => setSandboxForm({...sandboxForm, systemPrompt: e.target.value})}
                      rows={12}
                      placeholder="Bu AI uchun qoidalar, ko'rsatmalar va xulq-atvor talablarini yozing..."
                    />
                  </div>
                  <div className="sandbox-active-row">
                    <label>
                      <input
                        type="checkbox"
                        checked={sandboxForm.isActive}
                        onChange={e => setSandboxForm({...sandboxForm, isActive: e.target.checked})}
                      />
                      Faol (bu qoidalar AI da ishlatiladi)
                    </label>
                  </div>
                  {sandboxMsg && (
                    <div className={`sandbox-msg ${sandboxMsg.startsWith('✅') ? 'success' : 'error'}`}>
                      {sandboxMsg}
                    </div>
                  )}
                  <div className="sandbox-actions">
                    <button className="btn-save" onClick={saveSandbox} disabled={sandboxSaving}>
                      {sandboxSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                    </button>
                    <button className="btn-cancel" onClick={resetSandbox} disabled={sandboxSaving}>
                      Default ga qaytarish
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Custom Confirmation Modal */}
      {showConfirm && (

        <div className="confirm-overlay" onClick={closeConfirm}>
          <div className="confirm-modal card" onClick={e => e.stopPropagation()}>
            <div className="confirm-header">
              <div className="confirm-icon"><Icon name="trash" size={24} /></div>
              <h3>{confirmConfig.title}</h3>
            </div>
            <div className="confirm-body">
              <p>{confirmConfig.message}</p>
            </div>
            <div className="confirm-footer">
              <button className="btn-confirm-cancel" onClick={closeConfirm}>
                Bekor qilish
              </button>
              <button className="btn-confirm-ok" onClick={confirmConfig.onConfirm}>
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
};

export default AIAssistant;
