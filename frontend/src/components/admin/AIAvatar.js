import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AIAvatar = ({ isEmbedded = false, scale = 1 }) => {
  const [emotion, setEmotion] = useState('normal'); // normal, happy, sad, wink, angry, blush
  const [action, setAction] = useState('floating'); // floating, spin, bounce
  const navigate = useNavigate();
  const location = useLocation();
  const avatarScale = isEmbedded ? scale : 0.54;

  useEffect(() => {

    // AI "thinking" & emotions loop
    const moodInterval = setInterval(() => {
      const chance = Math.random();

      if (chance < 0.15) {
        setEmotion('happy');
        setAction('bounce');
        setTimeout(() => setAction('floating'), 1500);
        setTimeout(() => setEmotion('normal'), 4000);
      } else if (chance < 0.25) {
        setAction('spin'); // 360 spin
        setTimeout(() => setAction('floating'), 1200);
      } else if (chance < 0.35) {
        setEmotion('wink');
        setTimeout(() => setEmotion('normal'), 1000);
      } else if (chance < 0.40) {
        setEmotion('sad');
        setTimeout(() => setEmotion('normal'), 3000);
      } else if (chance < 0.48) {
        setEmotion('angry');
        setAction('angry-shake');
        setTimeout(() => setAction('floating'), 1400);
        setTimeout(() => setEmotion('normal'), 3200);
      } else if (chance < 0.58) {
        setEmotion('blush');
        setTimeout(() => setEmotion('normal'), 3500);
      } else {
        setEmotion('normal');
      }
    }, 6000);

    return () => {
      clearInterval(moodInterval);
    };
  }, [action]);

  const handleClick = () => {
    setEmotion('happy');
    setAction('spin');
    setTimeout(() => {
      // Hozirgi dashboard rolidan AI yo'lini topish (admin/director/accountant/...)
      const segments = location.pathname.split('/').filter(Boolean);
      const rolePrefix = segments[0] || 'admin';
      navigate(`/${rolePrefix}/ai`);
    }, 400);
  };

  return (
    <>
      <div
        className={`walle-bot-wrapper ${action} ${isEmbedded ? 'is-embedded' : ''}`}
        onClick={isEmbedded ? null : handleClick}
        style={{
          '--avatar-scale': avatarScale,
          '--avatar-origin': isEmbedded ? 'center' : 'bottom right'
        }}
        title={isEmbedded ? "" : "AI Yordamchini ochish"}
      >
        <div className="walle-hover-shadow"></div>

        <div className={`walle-bot-body ${action}`}>

          {/* Head */}
          <div
            className="bot-head"
            style={{
              transform: action === 'spin'
                ? 'rotateY(360deg)'
                : 'none'
            }}
          >
            <div className="bot-antenna"><div className="bulb"></div></div>
            <div className="bot-ear left"></div>
            <div className="bot-ear right"></div>

            <div className="bot-face-screen">
              <div className={`bot-face ${emotion}`}>
                <div className="bot-eye left"></div>
                <div className="bot-eye right"></div>
                <div className="bot-cheek left"></div>
                <div className="bot-cheek right"></div>
                <div className="bot-mouth"></div>
              </div>
            </div>
          </div>

          {/* Neck joint */}
          <div className="bot-neck"></div>

          {/* Torso */}
          <div className="bot-torso">
            <div className="torso-line line-1"></div>
            <div className="torso-line line-2"></div>
          </div>

          {/* Arms */}
          <div className="bot-arm left">
            <div className="hand">
              <div className="fingers"></div>
            </div>
          </div>

          <div className="bot-arm right">
            <div className="hand">
              <div className="fingers"></div>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .walle-bot-wrapper {
          position: fixed;
          bottom: 24px;
          right: 26px;
          width: 140px;
          height: 180px;
          z-index: 9999;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          perspective: 1000px;
          transition: all 0.3s ease;
          transform: scale(var(--avatar-scale, 0.54));
          transform-origin: var(--avatar-origin, bottom right);
          will-change: transform;
        }

        .walle-bot-wrapper.is-embedded {
          position: relative;
          bottom: auto;
          right: auto;
          cursor: default;
          z-index: 1;
          width: 140px;
          height: 180px;
          margin: -20px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* Telefon */
        @media (max-width: 575px) {
          .walle-bot-wrapper:not(.is-embedded) {
            right: 12px;
            bottom: 12px;
            transform: scale(0.34);
          }
        }

        @media (max-width: 420px) {
          .walle-bot-wrapper:not(.is-embedded) {
            right: 10px;
            bottom: 10px;
            transform: scale(0.3);
          }
        }

        @media (min-width: 576px) and (max-width: 767px) {
          .walle-bot-wrapper:not(.is-embedded) {
            right: 14px;
            bottom: 14px;
            transform: scale(0.38);
          }
        }

        /* Tablet */
        @media (min-width: 768px) and (max-width: 991px) {
          .walle-bot-wrapper:not(.is-embedded) {
            right: 18px;
            bottom: 18px;
            transform: scale(0.42);
          }
        }

        /* Laptop */
        @media (min-width: 992px) and (max-width: 1199px) {
          .walle-bot-wrapper:not(.is-embedded) {
            right: 22px;
            bottom: 20px;
            transform: scale(0.48);
          }
        }

        /* Desktop */
        @media (min-width: 1200px) {
          .walle-bot-wrapper:not(.is-embedded) {
            right: 26px;
            bottom: 24px;
            transform: scale(0.54);
          }
        }

        .walle-bot-body {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
        }

        /* Floating animation */
        .walle-bot-body.floating {
          animation: floatBot 4s ease-in-out infinite;
        }
        @keyframes floatBot {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }

        /* Bounce animation */
        .walle-bot-body.bounce {
          animation: bounceJoy 1.2s cubic-bezier(0.28, 0.84, 0.42, 1) infinite;
        }
        @keyframes bounceJoy {
          0%, 100% { transform: translateY(0) scale(1, 1); }
          30% { transform: translateY(-30px) scale(0.9, 1.1); }
          70% { transform: translateY(0) scale(1.1, 0.9); }
        }

        .walle-bot-body.spin .bot-head {
          transition: transform 1.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .walle-bot-body.angry-shake {
          animation: angryShake 0.16s ease-in-out 7;
        }
        @keyframes angryShake {
          0%, 100% { transform: translateX(0) rotate(0); }
          25% { transform: translateX(-4px) rotate(-2deg); }
          75% { transform: translateX(4px) rotate(2deg); }
        }

        /* Shadow */
        .walle-hover-shadow {
          position: absolute;
          bottom: -10px;
          left: 30px;
          width: 80px;
          height: 15px;
          background: radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 70%);
          border-radius: 50%;
          filter: blur(2px);
          animation: floatShadow 4s ease-in-out infinite;
        }
        @keyframes floatShadow {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(0.6); opacity: 0.05; }
        }

        /* === HEAD === */
        .bot-head {
          position: absolute;
          top: 20px;
          left: 20px;
          width: 100px;
          height: 80px;
          background: linear-gradient(135deg, #ffffff 0%, #dfeafe 50%, #b6d0e8 100%);
          border-radius: 50px 50px 35px 35px;
          box-shadow: 
            inset -5px -5px 15px rgba(0,0,0,0.1), 
            inset 5px 5px 10px rgba(255,255,255,1),
            0 8px 15px rgba(0,0,0,0.15);
          z-index: 5;
          transform-style: preserve-3d;
          transition: transform 0.1s linear;
        }

        .bot-antenna {
          position: absolute;
          top: -15px;
          left: 48px;
          width: 4px;
          height: 15px;
          background: #1e293b;
          border-radius: 2px;
        }
        .bot-antenna .bulb {
          position: absolute;
          top: -8px;
          left: -3px;
          width: 10px;
          height: 10px;
          background: #1e293b;
          border-radius: 50%;
        }

        .bot-ear {
          position: absolute;
          top: 30px;
          width: 12px;
          height: 26px;
          background: #1e293b;
          border-radius: 6px;
          box-shadow: inset 2px 2px 4px rgba(255,255,255,0.2);
        }
        .bot-ear.left { left: -6px; }
        .bot-ear.right { right: -6px; }

        /* Black Screen Visor */
        .bot-face-screen {
          position: absolute;
          top: 15px;
          left: 10px;
          width: 80px;
          height: 48px;
          background: linear-gradient(135deg, #020617 0%, #0f172a 100%);
          border-radius: 16px 16px 20px 20px;
          box-shadow: 
            inset 0 4px 6px rgba(255,255,255,0.2),
            inset 0 -4px 6px rgba(0,0,0,0.8),
            0 2px 4px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        /* Glossy reflection on screen */
        .bot-face-screen::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 5px;
          width: 70px;
          height: 12px;
          background: linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%);
          border-radius: 10px 10px 0 0;
          pointer-events: none;
        }

        .bot-face {
          position: relative;
          width: 100%;
          height: 100%;
        }

        /* Glowing Eyes */
        .bot-eye {
          position: absolute;
          width: 8px;
          height: 20px;
          background: #38bdf8;
          border-radius: 4px;
          top: 10px;
          box-shadow: 0 0 10px #7dd3fc, 0 0 20px #0ea5e9;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .bot-eye.left { left: 24px; }
        .bot-eye.right { right: 24px; }

        /* Happiness Mouth */
        .bot-mouth {
          position: absolute;
          width: 14px;
          height: 8px;
          border-bottom: 3px solid #38bdf8;
          border-radius: 0 0 14px 14px;
          bottom: 10px;
          left: 33px;
          box-shadow: 0 5px 8px -2px #0ea5e9;
          opacity: 1; /* Always smile */
          transition: all 0.2s;
        }

        .bot-cheek {
          position: absolute;
          top: 28px;
          width: 13px;
          height: 7px;
          border-radius: 50%;
          background: #fb7185;
          box-shadow: 0 0 8px #fb7185, 0 0 14px rgba(244, 63, 94, 0.65);
          opacity: 0;
          transform: scale(0.5);
          transition: opacity 0.25s ease, transform 0.25s ease;
        }
        .bot-cheek.left { left: 10px; }
        .bot-cheek.right { right: 10px; }

        /* === EMOTIONS === */
        .bot-face.normal .bot-eye { animation: eveBlink 4s infinite; }
        @keyframes eveBlink {
          0%, 96%, 100% { transform: scaleY(1); }
          98% { transform: scaleY(0.1); }
        }

        /* Happy */
        .bot-face.happy .bot-eye {
          height: 8px;
          border-radius: 12px 12px 0 0;
          top: 16px;
        }

        /* Sad */
        .bot-face.sad .bot-eye {
          height: 8px;
          border-radius: 0 0 12px 12px;
          background: #f87171;
          box-shadow: 0 0 10px #fca5a5;
        }
        .bot-face.sad .bot-mouth {
          border-bottom: none;
          border-top: 3px solid #f87171;
          border-radius: 14px 14px 0 0;
          bottom: 6px;
          box-shadow: 0 -5px 8px -2px #ef4444;
        }

        /* Wink */
        .bot-face.wink .bot-eye.left {
           height: 2px;
           top: 19px;
        }
        .bot-face.wink .bot-mouth {
           width: 18px;
           transform: rotate(-10deg);
        }

        /* Angry — red visor, slanted eyes and a tense mouth */
        .bot-face-screen:has(.bot-face.angry) {
          background: linear-gradient(135deg, #260506 0%, #450a0a 55%, #7f1d1d 100%);
          box-shadow:
            inset 0 4px 6px rgba(255,255,255,0.12),
            inset 0 -4px 8px rgba(0,0,0,0.85),
            0 0 14px rgba(239,68,68,0.6);
          animation: angryScreenPulse 0.55s ease-in-out infinite alternate;
        }
        @keyframes angryScreenPulse {
          from { filter: saturate(1); }
          to { filter: saturate(1.35) brightness(1.15); }
        }
        .bot-face.angry .bot-eye {
          top: 12px;
          width: 17px;
          height: 6px;
          border-radius: 5px 5px 2px 2px;
          background: #ef4444;
          box-shadow: 0 0 9px #f87171, 0 0 18px #dc2626;
        }
        .bot-face.angry .bot-eye.left {
          left: 16px;
          transform: rotate(18deg);
        }
        .bot-face.angry .bot-eye.right {
          right: 16px;
          transform: rotate(-18deg);
        }
        .bot-face.angry .bot-mouth {
          width: 18px;
          height: 7px;
          left: 31px;
          bottom: 7px;
          border: 0;
          border-top: 3px solid #f87171;
          border-radius: 14px 14px 0 0;
          box-shadow: 0 -4px 8px -2px #dc2626;
        }
        .bot-face.angry .bot-cheek {
          background: #ef4444;
          box-shadow: 0 0 9px #ef4444;
          opacity: 0.75;
          transform: scale(1);
        }

        /* Blush — rosy cheeks and a shy expression */
        .bot-face-screen:has(.bot-face.blush) {
          box-shadow:
            inset 0 4px 6px rgba(255,255,255,0.2),
            inset 0 -4px 6px rgba(0,0,0,0.8),
            0 0 12px rgba(244,63,94,0.3);
        }
        .bot-face.blush .bot-eye {
          top: 13px;
          height: 11px;
          border-radius: 8px 8px 2px 2px;
          background: #7dd3fc;
        }
        .bot-face.blush .bot-cheek {
          opacity: 0.95;
          transform: scale(1);
          animation: cheekGlow 0.9s ease-in-out infinite alternate;
        }
        .bot-face.blush .bot-mouth {
          width: 10px;
          height: 6px;
          left: 35px;
          bottom: 7px;
          border-bottom-color: #fb7185;
          box-shadow: 0 4px 7px -2px #e11d48;
        }
        @keyframes cheekGlow {
          from { opacity: 0.65; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1.1); }
        }

        /* === BODY / TORSO === */
        .bot-neck {
          position: absolute;
          top: 98px;
          left: 45px;
          width: 50px;
          height: 8px;
          background: #94a3b8;
          border-radius: 4px;
          z-index: 2;
        }

        .bot-torso {
          position: absolute;
          top: 104px;
          left: 30px;
          width: 80px;
          height: 60px;
          background: linear-gradient(135deg, #ffffff 0%, #dfeafe 60%, #b6d0e8 100%);
          border-radius: 20px 20px 40px 40px;
          box-shadow: 
            inset -5px -5px 15px rgba(0,0,0,0.1),
            inset 5px 5px 10px rgba(255,255,255,1),
            0 8px 15px rgba(0,0,0,0.1);
          z-index: 3;
          overflow: hidden;
        }

        /* Horizontal lines on torso */
        .torso-line {
          position: absolute;
          width: 100%;
          height: 2px;
          background: rgba(148, 163, 184, 0.3);
          box-shadow: 0 1px 1px rgba(255,255,255,0.7);
        }
        .torso-line.line-1 { top: 25px; }
        .torso-line.line-2 { top: 40px; }

        /* === ARMS === */
        .bot-arm {
          position: absolute;
          top: 110px;
          width: 5px;
          height: 40px;
          background: #1e293b;
          z-index: 1;
          transform-origin: top center;
          border-radius: 2px;
        }
        .bot-arm.left {
          left: 35px;
          transform: rotate(30deg);
        }
        
        /* Right arm waves by default */
        .bot-arm.right {
          right: 35px;
          transform: rotate(-30deg);
          animation: waveArm 4s ease-in-out infinite;
        }

        .bot-arm .hand {
          position: absolute;
          bottom: -22px;
          left: -7px;
          width: 20px;
          height: 28px;
          background: linear-gradient(135deg, #ffffff, #dfeafe);
          border-radius: 10px;
          box-shadow: inset -2px -2px 5px rgba(0,0,0,0.15), 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .bot-arm .hand .fingers {
          position: absolute;
          bottom: -6px;
          left: 4px;
          width: 12px;
          height: 8px;
          background: #1e293b;
          border-radius: 3px;
        }
        .bot-arm .hand .fingers::after {
          content: '';
          position: absolute;
          top: 0;
          left: 4px;
          width: 4px;
          height: 10px;
          background: #f8fafc;
        } /* Separation between fingers */

        @keyframes waveArm {
          0%, 100% { transform: rotate(-30deg); }
          25% { transform: rotate(-130deg) translate(8px, -15px); }
          40% { transform: rotate(-100deg) translate(5px, -10px); }
          55% { transform: rotate(-140deg) translate(8px, -15px); }
          75% { transform: rotate(-30deg); }
        }

      `}</style>
    </>
  );
};

export default AIAvatar;
