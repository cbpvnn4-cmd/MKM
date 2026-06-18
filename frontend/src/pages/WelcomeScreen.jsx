// src/pages/WelcomeScreen.jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * WelcomeScreen (Professional)
 * - كتابة "بسم الله نبدأ" حرف-بحرف مع صوت كيبورد طبيعي.
 * - WebAudio AudioBuffer (أفضل أداء) + Fallback HTMLAudio Pool.
 * - زر تفعيل الصوت (لتجاوز سياسات المتصفحات) + تحكم مستوى الصوت.
 * - يدعم RTL تلقائياً للنص العربي.
 */

function WelcomeScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ========= User Info =========
  const getUserGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 18) return 'مساء الخير';
    return 'مساء الخير';
  };

  const normalizeRole = (role) => {
    if (!role) return '';
    if (typeof role === 'string') return role;
    return role?.name || role?.role?.name || '';
  };

  const getRoleDisplay = (roles) => {
    if (!roles || roles.length === 0) return "غير محدد";
    const role = normalizeRole(roles[0]);
    const roleNames = {
      admin: "مدير النظام",
      manager: "مدير القسم",
      accountant: "محاسب",
      technician: "فني",
      sales: "فريق المبيعات",
      inventory: "مسؤول المخزون"
    };
    return roleNames[role] || role || "غير محدد";
  };

  const getRoleIcon = (roles) => {
    if (!roles || roles.length === 0) return "❔";
    const role = normalizeRole(roles[0]);
    const roleIcons = {
      admin: "👑",
      manager: "💼",
      accountant: "💰",
      technician: "🛠️",
      sales: "📈",
      inventory: "📦"
    };
    return roleIcons[role] || "❔";
  };

  // ========= UI =========
  const fullText = 'بسم الله نبدأ';
  const [showContent, setShowContent] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [showLine, setShowLine] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showButton, setShowButton] = useState(false);

  // ========= Audio Controls =========
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0); // 0.0 - 1.0

  // ========= WebAudio Refs =========
  const audioCtxRef = useRef(null);
  const keyBufferRef = useRef(null);
  const welcomeBufferRef = useRef(null);
  const gainNodeRef = useRef(null);

  // ========= HTMLAudio Pool Fallback =========
  const htmlAudioPoolRef = useRef([]);

  // Helpers to safely derive role name/icon from API roles array


  // ========= Helpers =========
  const isArabic = /[\u0600-\u06FF]/.test(fullText);
  const baseURL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
  const publicUrl = (typeof process !== 'undefined' && process.env && process.env.PUBLIC_URL) || '';

  // يحاول مسارات متعددة لضمان عمل الصوت على Vite/CRA/Next وأي basePath
  const resolvePublicPath = (relative) => {
    const candidates = [
      relative,                          // "sounds/keyboard.mp3"
      `${baseURL.replace(/\/+$/, '')}/${relative.replace(/^\/+/, '')}`,   // "/base/sounds/.."
      `${publicUrl.replace(/\/+$/, '')}/${relative.replace(/^\/+/, '')}`, // "/PUBLIC_URL/sounds/.."
      `/${relative.replace(/^\/+/, '')}`,                                  // "/sounds/.."
    ];
    return candidates;
  };

  // ======== Audio: WebAudio ========
  const createContext = () => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    return Ctx ? new Ctx() : null;
  };

  const resumeIfSuspended = async (ctx) => {
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') await ctx.resume();
    } catch (err) {
      // AudioContext resume failed - will retry on user interaction
    }
  };

  const fetchAsArrayBuffer = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.arrayBuffer();
  };

  const loadBufferTryCandidates = async (ctx, relPath) => {
    const candidates = resolvePublicPath(relPath);
    for (const url of candidates) {
      try {
        const arr = await fetchAsArrayBuffer(url);
        const buf = await new Promise((resolve, reject) => {
          // Safari أحياناً يعيد استخدام نفس الـ ArrayBuffer
          ctx.decodeAudioData(arr.slice(0), resolve, reject);
        });
        // نجح
        return buf;
      } catch (e) {
        // جرّب التالي
      }
    }
    throw new Error(`Failed to load any candidate for ${relPath}`);
  };

  const ensureGain = (ctx) => {
    if (!gainNodeRef.current && ctx) {
      const g = ctx.createGain();
      g.gain.value = volume;
      g.connect(ctx.destination);
      gainNodeRef.current = g;
    }
  };

  const playBuffer = (ctx, buffer, rate = 1.0, duration = 0.08) => {
    if (!ctx || !buffer) return;
    try {
      ensureGain(ctx);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate;
      src.connect(gainNodeRef.current);
      // تشغيل فوري بدون تأخير
      src.start(0);
      // إيقاف الصوت بعد مدة قصيرة (نقطع الصوت الطويل)
      src.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Error playing buffer:', e);
    }
  };

  // ======== Audio: HTMLAudio Pool (Fallback) ========
  const initHtmlAudioPool = (size = 6, relPath = 'sounds/keyboard-typing-fast-371229.mp3') => {
    const candidates = resolvePublicPath(relPath);
    // أول مسار يعمل سنستخدمه لكل عناصر المسبح
    let working = null;
    const test = new Audio();
    for (const c of candidates) {
      test.src = c;
      // ما نقدر نتحقق 100% قبل التشغيل، لكن نستخدم الأول
      working = c;
      break;
    }
    const pool = Array.from({ length: size }, () => {
      const a = new Audio(working);
      a.preload = 'auto';
      a.volume = volume;
      return a;
    });
    htmlAudioPoolRef.current = pool;
  };

  const playFromPool = () => {
    const pool = htmlAudioPoolRef.current;
    if (!pool.length) return;
    const a = pool.find(x => x.paused) || pool[0];
    try {
      a.currentTime = 0;
      a.volume = volume;
      const promise = a.play();
      // إيقاف بعد 0.08 ثانية
      if (promise) {
        promise.then(() => {
          setTimeout(() => {
            a.pause();
            a.currentTime = 0;
          }, 80);
        }).catch(() => {});
      }
    } catch (err) {
      // Pool audio play failed - non-critical
    }
  };

  // ======== تحميل الصوت تلقائياً ========
  useEffect(() => {
    const initSound = async () => {
      const ctx = createContext();
      if (ctx) {
        audioCtxRef.current = ctx;

        try {
          await ctx.resume();
        } catch (e) {
          // سيتم resume عند أول تفاعل
        }

        try {
          keyBufferRef.current = await loadBufferTryCandidates(ctx, 'sounds/keyboard-typing-fast-371229.mp3');
          setAudioReady(true);
        } catch (e) {
          console.warn('Keyboard sound failed, using fallback');
        }
      }

      // Fallback
      if (!keyBufferRef.current) {
        initHtmlAudioPool(8, 'sounds/keyboard-typing-fast-371229.mp3');
        setAudioReady(true);
      }

      setSoundEnabled(true);
    };

    initSound();
  }, []);

  const playTypingClick = () => {
    if (!soundEnabled || isMuted) return;

    // Resume AudioContext عند أول تشغيل (بدون await لتجنب التأخير)
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }

    // WebAudio
    if (audioCtxRef.current && keyBufferRef.current) {
      const rate = 1.0 + (Math.random() * 0.15 - 0.075);
      if (gainNodeRef.current) gainNodeRef.current.gain.value = volume;
      playBuffer(audioCtxRef.current, keyBufferRef.current, rate, 0.08);
      return;
    }

    // Fallback
    playFromPool();
  };

  // ========= Typing Animation =========
  useEffect(() => {
    // انتظر حتى يتم تحميل الصوت قبل البدء
    if (!audioReady) return;

    setShowContent(true);
    let i = 0;
    const interval = setInterval(() => {
      if (i <= fullText.length) {
        const next = fullText.slice(0, i);
        setTypedText(next);
        const ch = fullText[i - 1];
        if (ch && !/\s/.test(ch)) playTypingClick();
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setShowLine(true), 200);
        setTimeout(() => setShowWelcome(true), 600);
        setTimeout(() => setShowButton(true), 1100);
      }
    }, 150); // سرعة الكتابة - متناسقة مع صوت الكيبورد

    return () => clearInterval(interval);
    // ملاحظة: لا تربط بـ volume/isMuted حتى لا تعيد التشغيل
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioReady]);

  // ========= Cleanup =========
  useEffect(() => {
    return () => {
      try {
        htmlAudioPoolRef.current.forEach(a => a && a.pause && a.pause());
        htmlAudioPoolRef.current = [];
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close();
        }
      } catch (err) {
        // Cleanup error - non-critical
      }
    };
  }, []);

  // ========= Navigation =========
  const handleContinue = () => {
    // استخدام user من AuthContext بدلاً من localStorage لضمان البيانات صحيحة
    if (!user) {
      navigate('/login');
      return;
    }

    // استخراج الدور من user.roles (مصفوفة)
    const normalizeRole = (role) => {
      if (!role) return '';
      if (typeof role === 'string') return role;
      return role?.name || role?.role?.name || '';
    };

    const role = user.roles && user.roles.length > 0 ? normalizeRole(user.roles[0]) : '';

    // التوجيه بناءً على الدور
    if (role === 'admin') navigate('/admin/dashboard');
    else if (role === 'technician') navigate('/technician/dashboard');
    else if (role === 'accountant') navigate('/accountant/dashboard');
    else if (role === 'manager') navigate('/manager/dashboard');
    else navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 overflow-hidden relative" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* زر كتم الصوت */}
      {soundEnabled && (
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
              isMuted
                ? 'bg-gray-500 text-white hover:bg-gray-600'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
            title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
          >
            {isMuted ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
            <span className="text-sm font-medium">{isMuted ? 'مكتوم 🔇' : 'صوت 🔊'}</span>
          </button>
        </div>
      )}

      {/* البطاقة الرئيسية */}
      <div className="max-w-4xl w-full relative z-10">
        <div className={`bg-white rounded-3xl shadow-2xl p-12 md:p-16 text-center relative overflow-hidden border border-gray-100 transform transition-all duration-1000 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          {/* Shimmer */}
          <div className="shimmer"></div>

          {/* نص البسملة مع المؤشّر */}
          <div className="mb-10">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-8 leading-relaxed bismillah-text min-h-[80px] flex items-center justify-center select-none">
              {typedText}
              <span className="typing-cursor"></span>
            </h1>

            {/* خط زخرفي */}
            <div className="relative h-1 max-w-md mx-auto">
              <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent rounded-full transition-all duration-1000 glow-line ${showLine ? 'w-full opacity-100' : 'w-0 opacity-0'}`}></div>
            </div>
          </div>

          {/* رسالة ترحيب شخصية */}
          <div className={`mb-12 transition-all duration-1000 delay-300 ${showWelcome ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
            {user && (
              <>
                <div className="mb-4">
                  <p className="text-2xl text-indigo-600 font-semibold mb-2">
                    {getUserGreeting()} {user.full_name ? '☀️' : ''}
                  </p>
                  <h2 className="text-3xl md:text-4xl text-gray-800 font-bold mb-2">
                    مرحباً {user.full_name || user.username} 👋
                  </h2>
                  <p className="text-xl text-gray-600 flex items-center justify-center gap-2">
                    <span>{getRoleIcon(user.roles)}</span>
                    <span>{getRoleDisplay(user.roles)}</span>
                  </p>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-gray-700 text-lg font-medium">نظام السند للمصاعد المتكامل</p>
                  <p className="text-gray-500 text-base">SANAD ELEVATORS</p>
                </div>
              </>
            )}
            {!user && (
              <>
                <h2 className="text-3xl md:text-4xl text-gray-700 font-bold mb-4">مرحباً بك في نظام السند للمصاعد</h2>
                <p className="text-gray-600 text-xl">SANAD ELEVATORS - نظام إدارة متكامل</p>
              </>
            )}
          </div>

          {/* زر المتابعة */}
          {showButton && (
            <div className="button-entrance">
              <button
                onClick={handleContinue}
                className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 text-lg font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-500 button-glow overflow-hidden"
              >
                <span className="button-shimmer"></span>
                <span className="relative z-10">متابعة إلى لوحة التحكم</span>
                <svg className="w-6 h-6 relative z-10 group-hover:-translate-x-2 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* تذييل */}
        <p className={`text-center text-gray-600 mt-8 text-lg transition-all duration-1000 delay-500 ${showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          ✨ تم تسجيل الدخول بنجاح
        </p>
      </div>

      {/* CSS (مختصر ومحسّن) */}
      <style>{`
        .shimmer{position:absolute;top:-50%;left:-50%;width:200%;height:200%;
          background:linear-gradient(45deg,transparent,rgba(99,102,241,.05),transparent);
          animation:shimmer 3s infinite}
        @keyframes shimmer{0%{transform:translate(-100%,-100%) rotate(45deg)}
          100%{transform:translate(100%,100%) rotate(45deg)}}
        .bismillah-text{
          background:linear-gradient(135deg,#4f46e5,#7c3aed,#4f46e5);
          background-size:200% 200%;
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;
          background-clip:text;animation:gradientShift 4s ease infinite
        }
        @keyframes gradientShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        .glow-line{box-shadow:0 0 15px rgba(99,102,241,.4),0 0 30px rgba(99,102,241,.2);animation:lineGlow 2s ease-in-out infinite}
        @keyframes lineGlow{0%,100%{opacity:.8;box-shadow:0 0 15px rgba(99,102,241,.4),0 0 30px rgba(99,102,241,.2)}
          50%{opacity:1;box-shadow:0 0 25px rgba(99,102,241,.6),0 0 45px rgba(99,102,241,.3)}}
        .button-entrance{animation:buttonPop .6s cubic-bezier(.68,-.55,.265,1.55)}
        @keyframes buttonPop{0%{transform:scale(0) rotate(-10deg);opacity:0}50%{transform:scale(1.15) rotate(5deg)}100%{transform:scale(1) rotate(0);opacity:1}}
        .button-glow{animation:buttonGlow 2s ease-in-out infinite}
        @keyframes buttonGlow{0%,100%{box-shadow:0 10px 30px rgba(99,102,241,.3),0 0 15px rgba(168,85,247,.3)}
          50%{box-shadow:0 10px 50px rgba(99,102,241,.5),0 0 30px rgba(168,85,247,.5)}}
        .button-shimmer{position:absolute;top:-50%;left:-100%;width:50%;height:200%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);
          transform:skewX(-20deg);animation:buttonShimmer 3s infinite}
        @keyframes buttonShimmer{0%{left:-100%}50%,100%{left:200%}}
        .typing-cursor{display:inline-block;width:3px;height:1em;
          background:linear-gradient(135deg,#4f46e5,#7c3aed);
          margin-left: 6px; animation:blink 1s infinite}
        @keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
      `}</style>
    </div>
  );
}

export default WelcomeScreen;


