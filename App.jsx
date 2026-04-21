import React, { useState, useEffect, useCallback, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, query } from "firebase/firestore";

// --- FIREBASE INITIALIZATION ---
let app, auth, db;
let appId = typeof __app_id !== 'undefined' ? __app_id : 'iskcon-sadhana-tracker-108';

try {
  const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
  if (Object.keys(firebaseConfig).length > 0) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) { console.warn("Firebase config not found. Running in local memory mode."); }

// --- CONSTANTS & DATA ---
const TODAY = new Date().toISOString().split("T")[0];

const BOOKS = [
  "Bhagavad Gita As It Is", "Srimad Bhagavatam", "Caitanya Caritamrita",
  "Nectar of Devotion", "Nectar of Instruction", "Sri Isopanisad",
  "Easy Journey to Other Planets", "Krishna Book", "Perfect Questions Perfect Answers", "Other"
];

const MOODS = [
  { key: "transcendental", label: "Transcendental", emoji: "🌸" },
  { key: "peaceful", label: "Peaceful", emoji: "🕊️" },
  { key: "distracted", label: "Distracted", emoji: "🌊" },
  { key: "tired", label: "Tired", emoji: "🌙" },
  { key: "enthusiastic", label: "Enthusiastic", emoji: "🔥" },
];

const TIMETABLE = [
  { time: "04:30 AM", event: "Mangal Arati" },
  { time: "05:00 AM", event: "Narasimha Arati & Tulasi Puja" },
  { time: "05:30 AM", event: "Japa Meditation" },
  { time: "07:15 AM", event: "Darshan Arati & Guru Puja" },
  { time: "08:00 AM", event: "Srimad Bhagavatam Class" },
  { time: "09:00 AM", event: "Breakfast Prasadam" },
  { time: "01:00 PM", event: "Raj Bhoga Arati" },
  { time: "01:30 PM", event: "Lunch Prasadam" },
  { time: "04:15 PM", event: "Dhupa Arati" },
  { time: "07:00 PM", event: "Sandhya Arati (Gaura Arati)" },
  { time: "08:00 PM", event: "Bhagavad Gita Class" },
  { time: "08:30 PM", event: "Sayana Arati & Rest" }
];

const ARATIS = [
  { title: "Sri Sri Gurvastakam (Mangal Arati)", lyrics: "samsara-davanala-lidha-loka-\ntranaya karunya-ghanaghanatwam...\n\n(1) The spiritual master is receiving benediction from the ocean of mercy. Just as a cloud pours water on a forest fire to extinguish it, so the spiritual master delivers the materially afflicted world by extinguishing the blazing fire of material existence. I offer my respectful obeisances unto the lotus feet of such a spiritual master, who is an ocean of auspicious qualities." },
  { title: "Narasimha Arati", lyrics: "namas te narasimhaya\nprahladahlada-dayine\nhiranyakasipor vaksaha-\nsila-tanka-nakhalaye...\n\nI offer my obeisances to Lord Narasimha, who gives joy to Prahlada Maharaja and whose nails are like chisels on the stone-like chest of the demon Hiranyakasipu." },
  { title: "Tulasi Arati", lyrics: "namo namah tulasi krishna-preyasi namo namah\nradha-krishna-seva pabo ei abhilashi...\n\nO Tulasi, beloved of Krishna, I bow before you again and again. My desire is to obtain the service of Radha and Krishna." },
  { title: "Sri Guru Vandana (Guru Puja)", lyrics: "sri-guru-carana-padma, kevala-bhakati-sadma\nbando mui savadhana mate...\n\nThe lotus feet of our spiritual master are the only way by which we can attain pure devotional service. I bow to his lotus feet with great awe and reverence." },
  { title: "Gaura Arati", lyrics: "jaya jaya goracander aratiko sobha\njahnavi-tata-vane jaga-mana-lobha...\n\nAll glories, all glories to the beautiful arati ceremony of Lord Caitanya. This Gaura-arati is taking place in a grove on the banks of the Jahnavi [Ganges] and is attracting the minds of all living entities in the universe." }
];

const TRANSLATIONS = {
  en: { appTitle: "Sadhana Tracker", dashboard: "Dashboard", morning: "Morning", routine: "Routine", seva: "Seva", reflection: "Reflection", history: "History", library: "Library", aiGuide: "AI Guide", score: "Score", timetable: "Timetable", schoolStudy: "School/College", saveCloud: "Save Progress", community: "Community", japaCounter: "Japa Counter", darshanYatra: "Darshan & Guide" },
  hi: { appTitle: "साधना ट्रैकर", dashboard: "डैशबोर्ड", morning: "सुबह", routine: "दिनचर्या", seva: "सेवा", reflection: "चिंतन", history: "इतिहास", library: "पुस्तकालय", aiGuide: "एआई गुरु", score: "स्कोर", timetable: "समय सारिणी", schoolStudy: "स्कूल / कॉलेज", saveCloud: "सहेजें", community: "समुदाय", japaCounter: "जप काउंटर", darshanYatra: "दर्शन और यात्रा" },
  bn: { appTitle: "সাধনা ট্র্যাকার", dashboard: "ড্যাশবোর্ড", morning: "সকাল", routine: "রুটিন", seva: "সেবা", reflection: "প্রতিফলন", history: "ইতিহাস", library: "গ্রন্থাগার", aiGuide: "এআই গাইড", score: "স্কোর", timetable: "সময়সূচী", schoolStudy: "স্কুল / কলেজ", saveCloud: "সংরক্ষণ", community: "সম্প্রদায়", japaCounter: "জপ কাউন্টার", darshanYatra: "দর্শন ও গাইড" },
  gu: { appTitle: "સાધના ટ્રેકર", dashboard: "ડેશબોર્ડ", morning: "સવાર", routine: "દિનચર્યા", seva: "સેવા", reflection: "ચિંતન", history: "ઇતિહાસ", library: "પુસ્તકાલય", aiGuide: "એઆઇ માર્ગદર્શક", score: "સ્કોર", timetable: "સમયપત્રક", schoolStudy: "શાળા / કૉલેજ", saveCloud: "સાચવો", community: "સમુદાય", japaCounter: "જપ કાઉન્ટર", darshanYatra: "દર્શન અને માર્ગદર્શિકા" },
  mr: { appTitle: "साधना ट्रॅकर", dashboard: "डॅशबोर्ड", morning: "सकाळ", routine: "दिनचर्या", seva: "सेवा", reflection: "चिंतन", history: "इतिहास", library: "ग्रंथालय", aiGuide: "एआय मार्गदर्शक", score: "गुण", timetable: "वेळापत्रक", schoolStudy: "शाळा / महाविद्यालय", saveCloud: "जतन करा", community: "समुदाय", japaCounter: "जप काउंटर", darshanYatra: "दर्शन आणि मार्गदर्शक" },
  ta: { appTitle: "சாதனா டிராக்கர்", dashboard: "டாஷ்போர்டு", morning: "காலை", routine: "வழக்கம்", seva: "சேவை", reflection: "பிரதிபலிப்பு", history: "வரலாறு", library: "நூலகம்", aiGuide: "AI வழிகாட்டி", score: "மதிப்பெண்", timetable: "கால அட்டவணை", schoolStudy: "பள்ளி / கல்லூரி", saveCloud: "சேமி", community: "சமூகம்", japaCounter: "ஜப கவுண்டர்", darshanYatra: "தரிசனம்" },
  te: { appTitle: "సాధన ట్రాకర్", dashboard: "డాష్‌బోర్డ్", morning: "ఉదయం", routine: "దినచర్య", seva: "సేవ", reflection: "ప్రతిబింబం", history: "చరిత్ర", library: "గ్రంథాలయం", aiGuide: "AI గైడ్", score: "స్కోర్", timetable: "టైమ్‌టేబుల్", schoolStudy: "పాఠశాల / కళాశాల", saveCloud: "సేవ్", community: "సంఘం", japaCounter: "జప కౌంటర్", darshanYatra: "దర్శనం" },
  kn: { appTitle: "ಸಾಧನಾ ಟ್ರ್ಯಾಕರ್", dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", morning: "ಬೆಳಿಗ್ಗೆ", routine: "ದಿನಚರಿ", seva: "ಸೇವೆ", reflection: "ಚಿಂತನೆ", history: "ಇತಿಹಾಸ", library: "ಗ್ರಂಥಾಲಯ", aiGuide: "AI ಮಾರ್ಗದರ್ಶಿ", score: "ಸ್ಕೋರ್", timetable: "ವೇಳಾಪಟ್ಟಿ", schoolStudy: "ಶಾಲೆ / ಕಾಲೇಜು", saveCloud: "ಉಳಿಸು", community: "ಸಮುದಾಯ", japaCounter: "ಜಪ ಕೌಂಟರ್", darshanYatra: "ದರ್ಶನ" },
  ml: { appTitle: "സാധന ട്രാക്കർ", dashboard: "ഡാഷ്‌ബോർഡ്", morning: "രാവിലെ", routine: "പതിവ്", seva: "സേവനം", reflection: "ചിന്തനം", history: "ചരിത്രം", library: "ലൈബ്രറി", aiGuide: "AI ഗൈഡ്", score: "സ്കോർ", timetable: "സമയവിവരപ്പട്ടിക", schoolStudy: "സ്കൂൾ / കോളേജ്", saveCloud: "സംരക്ഷിക്കുക", community: "സമൂഹം", japaCounter: "ജപ കൗണ്ടർ", darshanYatra: "ദർശനം" },
  pa: { appTitle: "ਸਾਧਨਾ ਟ੍ਰੈਕਰ", dashboard: "ਡੈਸ਼ਬੋਰਡ", morning: "ਸਵੇਰ", routine: "ਰੁਟੀਨ", seva: "ਸੇਵਾ", reflection: "ਪ੍ਰਤੀਬਿੰਬ", history: "ਇਤਿਹਾਸ", library: "ਲਾਇਬ੍ਰੇਰੀ", aiGuide: "AI ਗਾਈਡ", score: "ਸਕੋਰ", timetable: "ਸਮਾਂ ਸਾਰਣੀ", schoolStudy: "ਸਕੂਲ / ਕਾਲਜ", saveCloud: "ਸੇਵ ਕਰੋ", community: "ਭਾਈਚਾਰਾ", japaCounter: "ਜਾਪ ਕਾਊਂਟਰ", darshanYatra: "ਦਰਸ਼ਨ ਅਤੇ ਗਾਈਡ" },
  or: { appTitle: "ସାଧନା ଟ୍ରାକର୍", dashboard: "ଡ୍ୟାସବୋର୍ଡ", morning: "ସକାଳ", routine: "ନିତ୍ୟକର୍ମ", seva: "ସେବା", reflection: "ପ୍ରତିଫଳନ", history: "ଇତିହାସ", library: "ପାଠାଗାର", aiGuide: "AI ଗାଇଡ୍", score: "ସ୍କୋର୍", timetable: "ସମୟ ସାରଣୀ", schoolStudy: "ବିଦ୍ୟାଳୟ / କଲେଜ", saveCloud: "ସେଭ୍ କରନ୍ତୁ", community: "ସମ୍ପ୍ରଦାୟ", japaCounter: "ଜପ କାଉଣ୍ଟର", darshanYatra: "ଦର୍ଶନ ଏବଂ ଗାଇଡ୍" },
  es: { appTitle: "Sadhana Tracker", dashboard: "Inicio", morning: "Mañana", routine: "Rutina", seva: "Servicio", reflection: "Reflexión", history: "Historia", library: "Biblioteca", aiGuide: "Guía IA", score: "Puntaje", timetable: "Horario", schoolStudy: "Escuela", saveCloud: "Guardar", community: "Comunidad", japaCounter: "Contador Japa", darshanYatra: "Darshan y Guía" },
  fr: { appTitle: "Sadhana Tracker", dashboard: "Tableau", morning: "Matin", routine: "Routine", seva: "Service", reflection: "Réflexion", history: "Histoire", library: "Bibliothèque", aiGuide: "Guide IA", score: "Score", timetable: "Horaire", schoolStudy: "École", saveCloud: "Sauvegarder", community: "Communauté", japaCounter: "Compteur Japa", darshanYatra: "Darshan et Guide" },
  de: { appTitle: "Sadhana Tracker", dashboard: "Startseite", morning: "Morgen", routine: "Routine", seva: "Dienst", reflection: "Reflexion", history: "Verlauf", library: "Bibliothek", aiGuide: "KI-Leitfaden", score: "Punktzahl", timetable: "Zeitplan", schoolStudy: "Schule", saveCloud: "Speichern", community: "Gemeinschaft", japaCounter: "Japa-Zähler", darshanYatra: "Darshan & Führer" },
  it: { appTitle: "Sadhana Tracker", dashboard: "Bacheca", morning: "Mattina", routine: "Routine", seva: "Servizio", reflection: "Riflessione", history: "Cronologia", library: "Biblioteca", aiGuide: "Guida IA", score: "Punteggio", timetable: "Orario", schoolStudy: "Scuola", saveCloud: "Salva", community: "Comunità", japaCounter: "Contatore Japa", darshanYatra: "Darshan e Guida" },
  pt: { appTitle: "Sadhana Tracker", dashboard: "Painel", morning: "Manhã", routine: "Rotina", seva: "Serviço", reflection: "Reflexão", history: "História", library: "Biblioteca", aiGuide: "Guia IA", score: "Pontuação", timetable: "Horário", schoolStudy: "Escola", saveCloud: "Salvar", community: "Comunidade", japaCounter: "Contador Japa", darshanYatra: "Darshan e Guia" },
  ru: { appTitle: "Садхана Трекер", dashboard: "Панель", morning: "Утро", routine: "Режим", seva: "Служение", reflection: "Размышления", history: "История", library: "Библиотека", aiGuide: "ИИ Гид", score: "Счет", timetable: "Расписание", schoolStudy: "Школа", saveCloud: "Сохранить", community: "Община", japaCounter: "Джапа Счетчик", darshanYatra: "Даршан и гид" },
  zh: { appTitle: "修行记录", dashboard: "仪表板", morning: "早晨", routine: "日常", seva: "服务", reflection: "反思", history: "历史", library: "图书馆", aiGuide: "AI指南", score: "分数", timetable: "时间表", schoolStudy: "学校", saveCloud: "保存", community: "社区", japaCounter: "念珠计数器", darshanYatra: "达善与指南" },
  ja: { appTitle: "サダナ トラッカー", dashboard: "ダッシュボード", morning: "朝", routine: "ルーティン", seva: "奉仕", reflection: "振り返り", history: "履歴", library: "図書館", aiGuide: "AIガイド", score: "スコア", timetable: "時間割", schoolStudy: "学校", saveCloud: "保存", community: "コミュニティ", japaCounter: "ジャパカウンター", darshanYatra: "ダルシャンとガイド" },
  ko: { appTitle: "사다나 트래커", dashboard: "대시보드", morning: "아침", routine: "일과", seva: "봉사", reflection: "반성", history: "기록", library: "도서관", aiGuide: "AI 가이드", score: "점수", timetable: "시간표", schoolStudy: "학교", saveCloud: "저장", community: "커뮤니티", japaCounter: "자파 카운터", darshanYatra: "다르샨 및 가이드" },
  ar: { appTitle: "متتبع سادانا", dashboard: "لوحة القيادة", morning: "صباح", routine: "روتين", seva: "خدمة", reflection: "انعكاس", history: "تاريخ", library: "مكتبة", aiGuide: "دليل الذكاء", score: "نتيجة", timetable: "جدول زمني", schoolStudy: "مدرسة", saveCloud: "حفظ", community: "مجتمع", japaCounter: "عداد جابا", darshanYatra: "دارشان ودليل" },
  sw: { appTitle: "Sadhana Tracker", dashboard: "Dashibodi", morning: "Asubuhi", routine: "Ratiba", seva: "Huduma", reflection: "Tafakari", history: "Historia", library: "Maktaba", aiGuide: "Mwongozo wa AI", score: "Alama", timetable: "Ratiba", schoolStudy: "Shule", saveCloud: "Hifadhi", community: "Jumuiya", japaCounter: "Kaunta ya Japa", darshanYatra: "Darshan na Mwongozo" }
};

const defaultEntry = (date = TODAY) => ({
  date: date, mangalArati: false, chantingRounds: 0, beadCount: 0, wakeTime: "04:00", sleepTime: "21:30",
  sleepHours: 6.5, studyHours: 0, secularStudyHours: 0, classAttended: false, prasadamMeals: 0,
  exerciseMinutes: 0, prabhupadBook: BOOKS[0], prabhupadPages: 0, lectureTitle: "", lectureMinutes: 0,
  kirtanMinutes: 0, mangalFeedback: "", mood: "", highlights: "", savedAt: null,
});

// --- HELPER FUNCTIONS ---
function computeScore(e) {
  let s = 0;
  if (e.mangalArati) s += 20;
  s += Math.min(20, Math.round((Math.min(e.chantingRounds, 16) / 16) * 20));
  s += Math.min(15, Math.round((Math.min(e.prabhupadPages, 10) / 10) * 15));
  s += Math.min(15, Math.round((Math.min(e.lectureMinutes, 60) / 60) * 15));
  s += Math.min(15, Math.round((Math.min(e.studyHours, 4) / 4) * 15));
  s += Math.min(10, Math.round((Math.min(e.kirtanMinutes, 30) / 30) * 10));
  if (e.sleepHours >= 5.5 && e.sleepHours <= 7.5) s += 5;
  return Math.min(100, s);
}

function getScoreColor(score) {
  if (score >= 85) return "#558b2f"; // Olive Green
  if (score >= 60) return "#b8860b"; // Goldenrod
  if (score >= 35) return "#cd853f"; // Peru / Orange
  return "#a52a2a"; // Sienna / Red
}

function getScoreLabel(score) {
  if (score >= 90) return "Uttama Bhakta";
  if (score >= 75) return "Madhyama Bhakta";
  if (score >= 60) return "Sincere Sadhaka";
  if (score >= 40) return "Progressing";
  return "Needs Attention";
}

// --- GEMINI API CALLS ---
async function fetchGeminiText(prompt) {
  const apiKey = ""; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = { contents: [{ parts: [{ text: prompt }] }] };

  for (let i = 0; i < 4; i++) {
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      return result.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
    } catch (error) {
      if (i === 3) throw error;
      await new Promise(r => setTimeout(r, [1000, 2000, 4000][i]));
    }
  }
}

async function fetchGeminiChat(chatHistory) {
  const apiKey = ""; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const systemPrompt = `You are an inspiring ISKCON spiritual mentor. Answer questions based on Srila Prabhupada's teachings. Keep responses concise and use relevant verses. Use markdown.`;
  const payload = {
    contents: chatHistory.map(msg => ({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.text }] })),
    systemInstruction: { parts: [{ text: systemPrompt }] }
  };

  for (let i = 0; i < 4; i++) {
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      return result.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
    } catch (error) {
      if (i === 3) throw error;
      await new Promise(r => setTimeout(r, [1000, 2000, 4000][i]));
    }
  }
}

function formatGeminiText(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <div key={i} style={{ minHeight: "14px", marginBottom: "4px" }}>
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**') ? <strong key={j} style={{ color: "#8b4513" }}>{part.slice(2, -2)}</strong> : part
        )}
      </div>
    );
  });
}

// --- LIGHT THEME COMPONENTS ---
function Toggle({ value, onChange, label, icon }) {
  return (
    <button onClick={() => onChange(!value)} className="clean-card" style={{
      display: "flex", alignItems: "center", gap: 14, padding: "16px 20px",
      background: value ? "#f1f8e9" : "#ffffff",
      border: `1px solid ${value ? "#81c784" : "#e0d4c3"}`,
      cursor: "pointer", width: "100%", transition: "all 0.25s",
    }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ flex: 1, textAlign: "left", color: "#4a2c11", fontFamily: "'Crimson Pro', serif", fontSize: 18, fontWeight: 600 }}>{label}</span>
      <div style={{ width: 44, height: 24, borderRadius: 12, background: value ? "#558b2f" : "#d7ccc8", position: "relative", transition: "all 0.25s" }}>
        <div style={{ position: "absolute", top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "all 0.25s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </div>
    </button>
  );
}

function NumberInput({ label, value, onChange, max, unit, icon }) {
  return (
    <div className="clean-card" style={{ padding: 16 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#8b5a2b", fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>} {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => onChange(Math.max(0, value - 1))} className="btn-circle">−</button>
        <input type="number" min="0" max={max} value={value}
          onChange={e => onChange(Math.max(0, Math.min(max, parseFloat(e.target.value) || 0)))}
          style={{ flex: 1, background: "#fdfbf7", border: "1px solid #d5c8b5", borderRadius: 8, color: "#4a2c11", fontSize: 20, fontWeight: 700, fontFamily: "serif", textAlign: "center", padding: "8px 0" }} />
        <button onClick={() => onChange(Math.min(max, value + 1))} className="btn-circle">+</button>
        {unit && <span style={{ color: "#8b5a2b", fontSize: 13 }}>{unit}</span>}
      </div>
    </div>
  );
}

function ProfileModal({ onSave, lang }) {
  const [name, setName] = useState("");
  const [temple, setTemple] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(62,39,35,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div className="clean-card" style={{ maxWidth: 380, width: "100%", padding: "32px 28px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🪷</div>
        <h2 style={{ color: "#4a2c11", fontFamily: "'Crimson Pro', serif", fontSize: 26, margin: 0, marginBottom: 6 }}>Hare Krishna!</h2>
        <p style={{ color: "#8b5a2b", fontSize: 14, margin: "0 0 24px 0" }}>Please enter your details to begin</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input placeholder="Your Name (e.g. Prabhu das)" value={name} onChange={e => setName(e.target.value)} className="clean-input" />
          <input placeholder="Temple / Ashram / School" value={temple} onChange={e => setTemple(e.target.value)} className="clean-input" />
          <button onClick={() => name.trim() && onSave(name.trim(), temple.trim())} className="btn-primary" style={{ marginTop: 8 }}>
            Jai Srila Prabhupada! →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [lang, setLang] = useState("en");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  
  const [currentDate, setCurrentDate] = useState(TODAY);
  const [entry, setEntry] = useState(defaultEntry());
  const [history, setHistory] = useState([]);
  const [historyDetail, setHistoryDetail] = useState(null);
  const [communityData, setCommunityData] = useState([]);
  const [saveStatus, setSaveStatus] = useState("");
  
  const [japaInspiration, setJapaInspiration] = useState(null);
  const [loadingJapaInsp, setLoadingJapaInsp] = useState(false);
  
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([{ role: "ai", text: "Hare Krishna! I am your AI Spiritual Guide based on Srila Prabhupada's teachings. How can I assist your sadhana today?" }]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.error("Auth error:", e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const fetchData = async () => {
      try {
        const profSnap = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'));
        if (profSnap.exists()) setProfile(profSnap.data()); else setShowProfile(true);
      } catch (e) { setShowProfile(true); }

      try {
        const unsubscribeSadhana = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'sadhana_entries'), (snapshot) => {
          const entries = [];
          snapshot.forEach((doc) => { entries.push(doc.data()); });
          entries.sort((a, b) => b.date.localeCompare(a.date));
          setHistory(entries);
        });
        return () => unsubscribeSadhana();
      } catch (e) { console.error(e); }
    };
    fetchData();

    try {
      const unsubPublic = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'community_checkins'), (snapshot) => {
        const pubEntries = [];
        snapshot.forEach(doc => pubEntries.push(doc.data()));
        setCommunityData(pubEntries.filter(p => p.date === TODAY).sort((a,b) => b.score - a.score));
      });
      return () => unsubPublic();
    } catch(e) {}
  }, [user]);

  useEffect(() => {
    const existing = history.find(e => e.date === currentDate);
    setEntry(existing || defaultEntry(currentDate));
  }, [currentDate, history]);

  useEffect(() => {
    if (entry.wakeTime && entry.sleepTime) {
      const [wH, wM] = entry.wakeTime.split(":").map(Number);
      const [sH, sM] = entry.sleepTime.split(":").map(Number);
      let wake = wH * 60 + wM, sleep = sH * 60 + sM;
      if (wake <= sleep) wake += 1440;
      setEntry(e => ({ ...e, sleepHours: parseFloat(((wake - sleep) / 60).toFixed(1)) }));
    }
  }, [entry.wakeTime, entry.sleepTime]);

  const upd = useCallback((field, value) => setEntry(e => ({ ...e, [field]: value })), []);

  const handleSave = async () => {
    if (!user || !db) return;
    setSaveStatus("saving");
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sadhana_entries', entry.date), { ...entry, savedAt: new Date().toISOString() });
      if (profile) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'community_checkins', user.uid), {
          userId: user.uid, name: profile.name, temple: profile.temple, date: entry.date,
          score: computeScore(entry), rounds: entry.chantingRounds, updatedAt: new Date().toISOString()
        });
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (e) { setSaveStatus("error"); setTimeout(() => setSaveStatus(""), 3000); }
  };

  const handleProfileSave = async (name, temple) => {
    if (!user || !db) return;
    const p = { name, temple };
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), p);
    setProfile(p);
    setShowProfile(false);
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const newHistory = [...chatHistory, { role: "user", text: chatInput }];
    setChatHistory(newHistory);
    setChatInput("");
    setChatLoading(true);
    const reply = await fetchGeminiChat(newHistory);
    setChatHistory([...newHistory, { role: "ai", text: reply }]);
    setChatLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const score = computeScore(entry);
  
  const tabs = [
    { key: "dashboard", label: t.dashboard, icon: "🏠" },
    { key: "morning", label: t.morning, icon: "🌅" },
    { key: "japa", label: t.japaCounter, icon: "📿" },
    { key: "routine", label: t.routine, icon: "⏰" },
    { key: "seva", label: t.seva, icon: "📚" },
    { key: "darshan", label: t.darshanYatra, icon: "🛕" },
    { key: "reflection", label: t.reflection, icon: "🙏" },
    { key: "history", label: t.history, icon: "📊" },
    { key: "timetable", label: t.timetable, icon: "⏰" },
    { key: "library", label: t.library, icon: "📖" },
    { key: "aichat", label: t.aiGuide, icon: "✨" },
  ];

  return (
    <div className="app-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600&display=swap');
        
        :root {
          --bg-paper: #f9f6f0;
          --bg-sidebar: #f2ebd9;
          --bg-card: #ffffff;
          --header-bg: #3e2723;
          --text-main: #4a2c11;
          --text-muted: #8b5a2b;
          --border: #e0d4c3;
          --primary: #c25e1a;
          --primary-hover: #a04815;
          --accent-green: #558b2f;
          --accent-blue: #4682b4;
          --shadow: 0 4px 12px rgba(139, 69, 19, 0.08);
        }

        * { box-sizing: border-box; }
        body, html { margin: 0; padding: 0; background-color: var(--bg-paper); font-family: 'Inter', sans-serif; color: var(--text-main); }
        
        /* Layout */
        .app-container { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
        .header { background: var(--header-bg); color: #f5deb3; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; height: 64px; flex-shrink: 0; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
        .main-layout { display: flex; flex: 1; overflow: hidden; background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E"); }
        .sidebar { width: 260px; background: var(--bg-sidebar); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 20px 0; overflow-y: auto; }
        .content-area { flex: 1; padding: 32px; overflow-y: auto; }
        
        @media (max-width: 800px) {
          .main-layout { flex-direction: column; }
          .sidebar { width: 100%; flex-direction: row; height: auto; padding: 10px; overflow-x: auto; border-right: none; border-bottom: 1px solid var(--border); }
          .content-area { padding: 16px; }
        }

        /* Components */
        .logo-text { font-family: 'Crimson Pro', serif; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; display: flex; align-items: center; gap: 10px; color: #fff; }
        .header-actions { display: flex; align-items: center; gap: 16px; }
        
        .tab-btn { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 24px; background: transparent; border: none; text-align: left; font-size: 15px; color: var(--text-muted); cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; font-weight: 500; }
        .tab-btn:hover { background: rgba(194, 94, 26, 0.05); color: var(--primary); }
        .tab-btn.active { background: rgba(194, 94, 26, 0.1); color: var(--primary); border-left: 4px solid var(--primary); font-weight: 600; padding-left: 20px; }
        @media (max-width: 800px) { .tab-btn { width: auto; border-left: none; border-bottom: 3px solid transparent; padding: 8px 16px; border-radius: 20px; } .tab-btn.active { border-left: none; border-bottom: none; background: rgba(194, 94, 26, 0.15); padding: 8px 16px; } }

        .clean-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow); }
        .dash-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
        @media (max-width: 1000px) { .dash-grid { grid-template-columns: 1fr; } }

        .stat-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 10px; text-align: center; }
        .stat-header { background: var(--text-muted); color: white; width: 100%; padding: 8px; font-size: 13px; font-weight: 600; text-transform: uppercase; border-top-left-radius: 11px; border-top-right-radius: 11px; display: flex; justify-content: center; gap: 8px; align-items: center; }
        .stat-body { padding: 20px; font-size: 24px; font-weight: 700; color: var(--text-main); display: flex; flex-direction: column; align-items: center; gap: 6px; }
        
        .section-title { position: relative; text-align: center; margin: 30px 0 20px; }
        .section-title span { background: var(--bg-paper); padding: 0 16px; color: var(--text-muted); font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; position: relative; z-index: 1; }
        .section-title::before { content: ""; position: absolute; left: 0; top: 50%; width: 100%; height: 1px; background: var(--border); z-index: 0; }

        .btn-primary { background: var(--accent-green); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 6px rgba(85, 139, 47, 0.3); }
        .btn-primary:hover { background: #4a7a27; }
        .btn-primary:disabled { opacity: 0.6; cursor: wait; }
        
        .btn-circle { width: 36px; height: 36px; border-radius: 50%; background: var(--bg-sidebar); border: 1px solid var(--border); color: var(--primary); font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .btn-circle:hover { background: #e0d4c3; }

        .clean-input { width: 100%; background: #fdfbf7; border: 1px solid var(--border); border-radius: 8px; color: var(--text-main); font-family: 'Inter', sans-serif; font-size: 15px; padding: 12px; outline: none; transition: 0.2s; }
        .clean-input:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(194, 94, 26, 0.1); }

        .quote-card { background: linear-gradient(to right, #fdfbf7, #f2ebd9); border: 1px solid var(--border); border-radius: 12px; padding: 24px; display: flex; gap: 20px; align-items: center; }
        .quote-text { flex: 1; font-family: 'Crimson Pro', serif; font-size: 18px; font-style: italic; color: var(--text-main); line-height: 1.6; }
        .quote-img { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #fff; box-shadow: var(--shadow); background: var(--primary); display: flex; align-items: center; justify-content: center; color: white; font-size: 40px; }
      `}</style>

      {/* HEADER */}
      <header className="header">
        <div className="logo-text">
          <span style={{ fontSize: '24px' }}>🪷</span> {t.appTitle}
        </div>
        <div className="header-actions">
          <input 
            type="date" value={currentDate} max={TODAY} onChange={e => setCurrentDate(e.target.value)}
            style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, padding: "6px 10px", fontSize: 14, colorScheme: "dark" }}
          />
          <select value={lang} onChange={e => setLang(e.target.value)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.3)", color: "white", padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, outline: "none" }}>
            {Object.keys(TRANSLATIONS).map(k => <option key={k} value={k}>{k.toUpperCase()}</option>)}
          </select>
          {profile && <div style={{ fontSize: 14, fontWeight: 600, padding: "0 10px", borderLeft: "1px solid rgba(255,255,255,0.2)" }}>{profile.name.split(' ')[0]}</div>}
          <button onClick={handleSave} disabled={saveStatus === "saving"} className="btn-primary" style={{ padding: "6px 16px" }}>
            {saveStatus === "saving" ? "..." : saveStatus === "saved" ? "✓" : t.saveCloud}
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="main-layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          {tabs.map(tb => (
            <button key={tb.key} className={`tab-btn ${tab === tb.key ? 'active' : ''}`} onClick={() => setTab(tb.key)}>
              <span style={{ fontSize: '18px' }}>{tb.icon}</span> 
              <span>{tb.label}</span>
            </button>
          ))}
        </aside>

        {/* CONTENT */}
        <main className="content-area">
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            
            {/* DASHBOARD */}
            {tab === "dashboard" && (
              <div className="dash-grid">
                
                {/* Left Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <h2 style={{ margin: 0, fontFamily: "'Crimson Pro', serif", fontSize: 28, color: "var(--text-main)" }}>Daily Sadhana Tracker</h2>
                  
                  {/* Top 3 Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
                    <div className="clean-card stat-box" style={{ padding: 0 }}>
                      <div className="stat-header" style={{ background: "#8b5a2b" }}>🌅 Mangal Arati</div>
                      <div className="stat-body" style={{ color: entry.mangalArati ? "var(--accent-green)" : "var(--text-main)" }}>
                        {entry.mangalArati ? "✓ Attended" : "Missed"}
                      </div>
                    </div>
                    <div className="clean-card stat-box" style={{ padding: 0 }}>
                      <div className="stat-header" style={{ background: "#c25e1a" }}>📿 Chanting Rounds</div>
                      <div className="stat-body">
                        {entry.chantingRounds}/16 <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: "normal" }}>Rounds</span>
                      </div>
                    </div>
                    <div className="clean-card stat-box" style={{ padding: 0 }}>
                      <div className="stat-header" style={{ background: "#c2b280", color: "#4a2c11" }}>⏰ Wake Up Time</div>
                      <div className="stat-body">{entry.wakeTime}</div>
                    </div>
                  </div>

                  <div className="section-title"><span>Daily Routine Progress</span></div>

                  {/* Routine 4 Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 16 }}>
                    <div className="clean-card stat-box" style={{ padding: 0 }}>
                      <div className="stat-header" style={{ background: "#6b4423" }}>🌙 Sleep</div>
                      <div className="stat-body">{entry.sleepHours} <span style={{fontSize: 12, fontWeight: 'normal', color: 'var(--text-muted)'}}>Hours</span></div>
                    </div>
                    <div className="clean-card stat-box" style={{ padding: 0 }}>
                      <div className="stat-header" style={{ background: "#4682b4" }}>📖 Study</div>
                      <div className="stat-body">{entry.studyHours} <span style={{fontSize: 12, fontWeight: 'normal', color: 'var(--text-muted)'}}>Hours</span></div>
                    </div>
                    <div className="clean-card stat-box" style={{ padding: 0 }}>
                      <div className="stat-header" style={{ background: "#558b2f" }}>📚 Prabhupada</div>
                      <div className="stat-body">{entry.prabhupadPages} <span style={{fontSize: 12, fontWeight: 'normal', color: 'var(--text-muted)'}}>Pages</span></div>
                    </div>
                    <div className="clean-card stat-box" style={{ padding: 0 }}>
                      <div className="stat-header" style={{ background: "#5f9ea0" }}>🎧 Lectures</div>
                      <div className="stat-body">{(entry.lectureMinutes / 60).toFixed(1)} <span style={{fontSize: 12, fontWeight: 'normal', color: 'var(--text-muted)'}}>Hours</span></div>
                    </div>
                  </div>

                  {/* Quote of the day */}
                  <div className="section-title" style={{ marginTop: 40 }}><span>Srila Prabhupada Quote of the Day</span></div>
                  <div className="quote-card">
                    <div className="quote-text">
                      "Chant Hare Krishna and be happy. That is all. Simply chant and hear, become pure, and get ready to go back to Godhead."
                      <div style={{ display: "block", marginTop: 12, fontSize: 14, fontWeight: "bold", fontStyle: "normal" }}>— Srila Prabhupada</div>
                    </div>
                    <div className="quote-img">🪷</div>
                  </div>
                </div>

                {/* Right Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  
                  {/* Reflection Card */}
                  <div className="clean-card" style={{ padding: 24 }}>
                    <h3 style={{ margin: "0 0 16px 0", fontFamily: "'Crimson Pro', serif", fontSize: 20 }}>Today's Reflection</h3>
                    <input 
                      value={entry.highlights} onChange={e => upd("highlights", e.target.value)} 
                      placeholder="Reflections for Today..." className="clean-input" style={{ marginBottom: 12, background: "#f9f6f0" }} 
                    />
                    <input 
                      value={entry.mangalFeedback} onChange={e => upd("mangalFeedback", e.target.value)} 
                      placeholder="Improve Tomorrow..." className="clean-input" style={{ background: "#f9f6f0" }} 
                    />
                  </div>

                  {/* Stats Card */}
                  <div className="clean-card" style={{ padding: 24, background: "#fdfbf7" }}>
                    <h3 style={{ margin: "0 0 16px 0", fontFamily: "'Crimson Pro', serif", fontSize: 20 }}>Daily Stats</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 24 }}>☁️</span>
                        <div><div style={{ fontSize: 13, color: "var(--text-muted)" }}>Total Japa</div><div style={{ fontWeight: 600 }}>{entry.chantingRounds} Rounds</div></div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 24 }}>📊</span>
                        <div><div style={{ fontSize: 13, color: "var(--text-muted)" }}>Sadhana Score</div><div style={{ fontWeight: 600, color: getScoreColor(score) }}>{score}% - {getScoreLabel(score)}</div></div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 24 }}>🎶</span>
                        <div><div style={{ fontSize: 13, color: "var(--text-muted)" }}>Kirtan Time</div><div style={{ fontWeight: 600 }}>{entry.kirtanMinutes} Minutes</div></div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* MORNING */}
            {tab === "morning" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 600 }}>
                <h2 style={{ fontFamily: "'Crimson Pro', serif", fontSize: 28, margin: 0 }}>🌅 Morning Program</h2>
                <Toggle value={entry.mangalArati} onChange={v => upd("mangalArati", v)} label="Mangal Arati Attendance" icon="🌅" />
                <Toggle value={entry.classAttended} onChange={v => upd("classAttended", v)} label="SB Class / Lecture Attended" icon="📖" />
                <div className="clean-card" style={{ padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                    <span style={{ fontWeight: 600 }}>Chanting Rounds</span>
                    <span style={{ color: "var(--primary)", fontSize: 22, fontWeight: 700 }}>{entry.chantingRounds}/16</span>
                  </div>
                  <input type="range" min="0" max="32" step="1" value={entry.chantingRounds} onChange={e => upd("chantingRounds", parseInt(e.target.value))} style={{ width: "100%", accentColor: "var(--primary)", height: 6 }} />
                </div>
              </div>
            )}

            {/* JAPA COUNTER */}
            {tab === "japa" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
                <h2 style={{ fontFamily: "'Crimson Pro', serif", fontSize: 28, margin: 0, alignSelf: "flex-start" }}>📿 Japa Counter</h2>
                <div className="clean-card" style={{ padding: "40px 20px", width: "100%", maxWidth: 400, textAlign: "center" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Current Round</div>
                  <div style={{ fontSize: 72, fontWeight: 700, fontFamily: "'Crimson Pro', serif", color: "var(--primary)", lineHeight: 1 }}>
                    {entry.beadCount || 0}<span style={{ fontSize: 24, color: "var(--border)" }}>/108</span>
                  </div>
                  <div style={{ marginTop: 24, marginBottom: 40 }}>
                    <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Completed Rounds</div>
                    <div style={{ fontSize: 32, fontWeight: "bold", color: "var(--accent-green)" }}>{entry.chantingRounds || 0}</div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      let newBeads = (entry.beadCount || 0) + 1;
                      let newRounds = entry.chantingRounds || 0;
                      if (newBeads >= 108) { newBeads = 0; newRounds += 1; }
                      setEntry(e => ({ ...e, beadCount: newBeads, chantingRounds: newRounds }));
                    }}
                    style={{
                      width: 180, height: 180, borderRadius: "50%", background: "linear-gradient(135deg, var(--primary), var(--primary-hover))",
                      border: "8px solid #fdfbf7", color: "white", fontSize: 26, fontWeight: "bold", fontFamily: "serif",
                      cursor: "pointer", boxShadow: "0 10px 30px rgba(194, 94, 26, 0.3)", transition: "transform 0.1s"
                    }}
                    onPointerDown={e => e.currentTarget.style.transform = "scale(0.95)"}
                    onPointerUp={e => e.currentTarget.style.transform = "scale(1)"}
                    onPointerLeave={e => e.currentTarget.style.transform = "scale(1)"}
                  >
                    TAP <br/><span style={{fontSize: 14, fontWeight: 'normal'}}>Hare Krishna</span>
                  </button>
                  
                  <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <button onClick={() => setEntry(e => ({...e, beadCount: Math.max(0, (e.beadCount || 0) - 1)}))} style={{ flex: 1, padding: "12px", background: "var(--bg-sidebar)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-main)", cursor: "pointer", fontWeight: 600 }}>-1 Bead</button>
                    <button onClick={() => setEntry(e => ({...e, beadCount: 0}))} style={{ flex: 1, padding: "12px", background: "#ffebee", border: "1px solid #ffcdd2", borderRadius: 8, color: "#c62828", cursor: "pointer", fontWeight: 600 }}>Reset Bead</button>
                  </div>
                </div>
              </div>
            )}

            {/* ROUTINE */}
            {tab === "routine" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 600 }}>
                <h2 style={{ fontFamily: "'Crimson Pro', serif", fontSize: 28, margin: 0 }}>⏰ Daily Routine</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="clean-card" style={{ padding: 20 }}>
                    <label style={{ display: "block", color: "var(--text-muted)", fontSize: 14, fontWeight: 600, marginBottom: 10 }}>🌙 Sleep Time</label>
                    <input type="time" value={entry.sleepTime} onChange={e => upd("sleepTime", e.target.value)} className="clean-input" style={{ fontSize: 20, fontWeight: "bold" }} />
                  </div>
                  <div className="clean-card" style={{ padding: 20 }}>
                    <label style={{ display: "block", color: "var(--text-muted)", fontSize: 14, fontWeight: 600, marginBottom: 10 }}>🌄 Wake Time</label>
                    <input type="time" value={entry.wakeTime} onChange={e => upd("wakeTime", e.target.value)} className="clean-input" style={{ fontSize: 20, fontWeight: "bold" }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                  <NumberInput label="Shastra Study" value={entry.studyHours} onChange={v => upd("studyHours", v)} max={24} unit="hrs" icon="📖" />
                  <NumberInput label="School / College" value={entry.secularStudyHours} onChange={v => upd("secularStudyHours", v)} max={24} unit="hrs" icon="🏫" />
                  <NumberInput label="Exercise/Yoga" value={entry.exerciseMinutes} onChange={v => upd("exerciseMinutes", v)} max={240} unit="min" icon="🏃" />
                </div>
              </div>
            )}

            {/* SEVA / STUDY */}
            {tab === "seva" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 600 }}>
                <h2 style={{ fontFamily: "'Crimson Pro', serif", fontSize: 28, margin: 0 }}>📚 Spiritual Seva</h2>
                <div className="clean-card" style={{ padding: 24 }}>
                  <label style={{ display: "block", color: "var(--text-muted)", fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Book Reading Today</label>
                  <select value={entry.prabhupadBook} onChange={e => upd("prabhupadBook", e.target.value)} className="clean-input" style={{ marginBottom: 16 }}>
                    {BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <NumberInput label="Pages Read Today" value={entry.prabhupadPages} onChange={v => upd("prabhupadPages", v)} max={200} unit="pages" icon="📄" />
                </div>
                <div className="clean-card" style={{ padding: 24 }}>
                   <label style={{ display: "block", color: "var(--text-muted)", fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Lectures & Kirtans</label>
                  <input value={entry.lectureTitle} onChange={e => upd("lectureTitle", e.target.value)} placeholder="Lecture / Class Title" className="clean-input" style={{ marginBottom: 16 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <NumberInput label="Lecture" value={entry.lectureMinutes} onChange={v => upd("lectureMinutes", v)} max={480} unit="min" icon="🎧" />
                    <NumberInput label="Kirtan" value={entry.kirtanMinutes} onChange={v => upd("kirtanMinutes", v)} max={240} unit="min" icon="🎶" />
                  </div>
                </div>
              </div>
            )}

            {/* REFLECTION */}
            {tab === "reflection" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 600 }}>
                <h2 style={{ fontFamily: "'Crimson Pro', serif", fontSize: 28, margin: 0 }}>🙏 {t.reflection}</h2>
                <div className="clean-card" style={{ padding: 24 }}>
                  <div style={{ color: "var(--text-muted)", fontSize: 14, fontWeight: 600, marginBottom: 16 }}>How was your spiritual mood today?</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {MOODS.map(m => (
                      <button key={m.key} onClick={() => upd("mood", m.key)} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 24, cursor: "pointer", transition: "all 0.2s",
                        background: entry.mood === m.key ? "var(--bg-sidebar)" : "transparent",
                        border: `1px solid ${entry.mood === m.key ? "var(--primary)" : "var(--border)"}`,
                        color: entry.mood === m.key ? "var(--primary)" : "var(--text-main)", fontSize: 14, fontWeight: 500
                      }}>
                        <span style={{ fontSize: 18 }}>{m.emoji}</span> {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="clean-card" style={{ padding: 24 }}>
                  <label style={{ display: "block", color: "var(--text-muted)", fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Highlights & Realizations</label>
                  <textarea value={entry.highlights} onChange={e => upd("highlights", e.target.value)} placeholder="Any special realization today..." rows={3} className="clean-input" style={{ resize: "vertical" }} />
                </div>
                <div className="clean-card" style={{ padding: 24 }}>
                  <label style={{ display: "block", color: "var(--text-muted)", fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Full Day Feedback</label>
                  <textarea value={entry.mangalFeedback || ""} onChange={e => upd("mangalFeedback", e.target.value)} placeholder="Write your daily reflection, challenges..." rows={4} className="clean-input" style={{ resize: "vertical" }} />
                </div>
              </div>
            )}

            {/* DARSHAN & YATRA GUIDE */}
            {tab === "darshan" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 800 }}>
                <h2 style={{ fontFamily: "'Crimson Pro', serif", fontSize: 28, margin: 0 }}>🛕 {t.darshanYatra}</h2>

                <div className="clean-card" style={{ padding: 24 }}>
                  <div style={{ color: "var(--primary)", fontWeight: "bold", marginBottom: 12, fontSize: 18 }}>🔴 24/7 Live Darshan</div>
                  <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 20 }}>Experience live darshan from major ISKCON temples globally.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <a href="https://www.youtube.com/@iskconvrindavan/live" target="_blank" rel="noreferrer" style={{ background: "var(--bg-sidebar)", color: "var(--text-main)", border: "1px solid var(--border)", padding: "14px 20px", borderRadius: 10, textDecoration: "none", fontWeight: 600, fontSize: 15, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>🛕 ISKCON Vrindavan (Krishna Balaram)</span> <span style={{fontSize: 13, color: "var(--primary)"}}>Watch Live ↗</span>
                    </a>
                    <a href="https://www.mayapur.tv/" target="_blank" rel="noreferrer" style={{ background: "var(--bg-sidebar)", color: "var(--text-main)", border: "1px solid var(--border)", padding: "14px 20px", borderRadius: 10, textDecoration: "none", fontWeight: 600, fontSize: 15, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>🛕 ISKCON Mayapur (Chandrodaya)</span> <span style={{fontSize: 13, color: "var(--primary)"}}>Watch Live ↗</span>
                    </a>
                  </div>
                </div>

                <div className="clean-card" style={{ padding: 24 }}>
                  <div style={{ color: "var(--accent-green)", fontWeight: "bold", marginBottom: 12, fontSize: 18 }}>🗺️ Digital Tourist Guide (Vrindavan)</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <details style={{ background: "var(--bg-sidebar)", borderRadius: 10, padding: 14, border: "1px solid var(--border)" }}>
                      <summary style={{ fontWeight: 600, cursor: "pointer", fontSize: 15, color: "var(--text-main)" }}>📍 Top Places to Visit</summary>
                      <ul style={{ color: "var(--text-main)", fontSize: 14, marginTop: 12, lineHeight: 1.6, paddingLeft: 24 }}>
                        <li style={{marginBottom: 8}}><b>Krishna Balaram Mandir (ISKCON):</b> The focal point for international devotees. Srila Prabhupada's Samadhi.</li>
                        <li style={{marginBottom: 8}}><b>Banke Bihari Temple:</b> One of the holiest and most famous temples of Thakur Ji in India.</li>
                        <li style={{marginBottom: 8}}><b>Prem Mandir:</b> A massive white marble temple intricately carved.</li>
                      </ul>
                    </details>
                  </div>
                </div>
              </div>
            )}

            {/* TIMETABLE */}
            {tab === "timetable" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 600 }}>
                 <h2 style={{ fontFamily: "'Crimson Pro', serif", fontSize: 28, margin: 0 }}>⏰ {t.timetable}</h2>
                 <div className="clean-card" style={{ padding: 24 }}>
                    <div style={{ color: "var(--primary)", fontWeight: "bold", marginBottom: 20, fontSize: 18 }}>Standard Temple Timetable</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {TIMETABLE.map((tItem, i) => (
                        <div key={i} style={{ display: "flex", borderBottom: i < TIMETABLE.length-1 ? "1px solid var(--border)" : "none", paddingBottom: 12 }}>
                          <div style={{ width: "100px", color: "var(--text-muted)", fontSize: 14, fontWeight: 600 }}>{tItem.time}</div>
                          <div style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{tItem.event}</div>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
            )}

            {/* LIBRARY */}
            {tab === "library" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 800 }}>
                 <h2 style={{ fontFamily: "'Crimson Pro', serif", fontSize: 28, margin: 0 }}>📖 Parampara Library & Resources</h2>
                 <div className="clean-card" style={{ padding: 24 }}>
                    <div style={{ color: "var(--primary)", fontWeight: "bold", marginBottom: 16, fontSize: 18 }}>🎶 Essential Arati & Bhajans</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {ARATIS.map((a, i) => (
                        <details key={i} style={{ background: "var(--bg-sidebar)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
                          <summary style={{ fontWeight: 600, cursor: "pointer", fontSize: 15 }}>{a.title}</summary>
                          <div style={{ marginTop: 12, color: "var(--text-main)", fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.6, fontStyle: "italic", background: "#fff", padding: 16, borderRadius: 8, border: "1px solid var(--border)" }}>
                            {a.lyrics}
                          </div>
                        </details>
                      ))}
                    </div>
                 </div>
                 
                 <div className="clean-card" style={{ padding: 24 }}>
                    <div style={{ color: "var(--accent-blue)", fontWeight: "bold", marginBottom: 12, fontSize: 18 }}>📚 Prabhupada Books Online</div>
                    <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 16 }}>Read all of Srila Prabhupada's books, letters, and conversations for free.</p>
                    <a href="https://vedabase.io/en/" target="_blank" rel="noreferrer" className="btn-primary" style={{ display: "inline-block", textDecoration: "none", background: "var(--accent-blue)" }}>Visit Vedabase.io ↗</a>
                 </div>
              </div>
            )}

            {/* HISTORY */}
            {tab === "history" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <h2 style={{ fontFamily: "'Crimson Pro', serif", fontSize: 28, margin: 0 }}>📊 {t.history}</h2>
                {history.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
                    <p>No history yet. Save your first entry!</p>
                  </div>
                ) : (
                  <>
                    {historyDetail ? (
                      <div style={{ maxWidth: 600 }}>
                        <button onClick={() => setHistoryDetail(null)} className="clean-card" style={{ padding: "8px 16px", cursor: "pointer", marginBottom: 16, fontWeight: 600 }}>← Back</button>
                        <div className="clean-card" style={{ padding: 24 }}>
                          <div style={{ color: "var(--primary)", fontFamily: "'Crimson Pro', serif", fontSize: 24, fontWeight: 700, marginBottom: 20 }}>
                            {new Date(historyDetail.date).toLocaleDateString()}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            {[
                              ["Mangal Arati", historyDetail.mangalArati ? "✓ Yes" : "✗ No"],
                              ["Chanting", `${historyDetail.chantingRounds} rounds`],
                              ["Sleep", `${historyDetail.sleepHours?.toFixed(1)} hrs`],
                              ["Shastra", `${historyDetail.studyHours} hrs`],
                              ["Book Pages", `${historyDetail.prabhupadPages} pgs`],
                              ["Score", `${computeScore(historyDetail)}%`],
                            ].map(([label, val]) => (
                              <div key={label} style={{ background: "var(--bg-sidebar)", borderRadius: 10, padding: "16px 20px", border: "1px solid var(--border)" }}>
                                <div style={{ color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>{label}</div>
                                <div style={{ color: "var(--text-main)", fontSize: 18, fontWeight: 700, fontFamily: "'Crimson Pro', serif" }}>{val}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                        {history.map(h => {
                          const hScore = computeScore(h);
                          return (
                            <div key={h.date} onClick={() => setHistoryDetail(h)} className="clean-card" style={{ padding: 20, cursor: "pointer", transition: "transform 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform="none"}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                <div style={{ color: "var(--text-main)", fontFamily: "serif", fontSize: 16, fontWeight: 700 }}>{new Date(h.date).toLocaleDateString()}</div>
                                <div style={{ background: "var(--bg-sidebar)", padding: "4px 10px", borderRadius: 20, color: getScoreColor(hScore), fontSize: 14, fontWeight: 700 }}>{hScore}%</div>
                              </div>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>
                                {h.mangalArati && <span>🌅 Arati</span>}
                                {h.chantingRounds > 0 && <span>📿 {h.chantingRounds}R</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* AI CHAT GUIDE */}
            {tab === "aichat" && (
              <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", maxWidth: 800, margin: "0 auto" }}>
                 <h2 style={{ fontFamily: "'Crimson Pro', serif", fontSize: 28, margin: "0 0 20px 0", color: "var(--text-main)" }}>✨ Spiritual AI Guide</h2>
                 
                 <div className="clean-card" style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, background: "#fdfbf7" }}>
                    {chatHistory.map((msg, i) => (
                      <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: "85%" }}>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                          {msg.role === 'user' ? profile?.name || 'Devotee' : 'Parampara AI'}
                        </div>
                        <div style={{ 
                          background: msg.role === 'user' ? "var(--bg-sidebar)" : "#ffffff", 
                          border: `1px solid var(--border)`,
                          padding: "14px 18px", borderRadius: 16, fontSize: 15, lineHeight: 1.6,
                          borderBottomRightRadius: msg.role === 'user' ? 0 : 16, borderBottomLeftRadius: msg.role === 'ai' ? 0 : 16,
                          boxShadow: "0 2px 5px rgba(0,0,0,0.02)"
                        }}>
                          {formatGeminiText(msg.text)}
                        </div>
                      </div>
                    ))}
                    {chatLoading && <div style={{ color: "var(--text-muted)", fontSize: 14, fontStyle: "italic", alignSelf: "flex-start" }}>Guide is typing...</div>}
                    <div ref={chatEndRef} />
                 </div>

                 <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                    <input 
                      value={chatInput} onChange={e => setChatInput(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleChatSend()}
                      placeholder="Ask a spiritual question..." 
                      className="clean-input"
                      style={{ borderRadius: 24, padding: "16px 20px" }} 
                    />
                    <button onClick={handleChatSend} disabled={chatLoading} className="btn-primary" style={{ borderRadius: 24, padding: "0 24px" }}>Send</button>
                 </div>
              </div>
            )}
            
          </div>
        </main>
      </div>
    </div>
  );
}