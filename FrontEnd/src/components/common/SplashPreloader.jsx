import React, { useState, useEffect } from 'react';

/**
 * SplashPreloader Component
 * Clean Corporate Preloader for PT DEA GLOBAL NIAGA
 * Features:
 * - Solid clean light theme (no dark/futuristic/AI elements)
 * - Smooth morphing & 3D rotation entrance for DEA logo
 * - Delayed sequential typography reveal: "DEA GLOBAL NIAGA"
 * - No loading/progress bar
 * - Seamless exit dissolve
 */
export default function SplashPreloader({ onFinish, minDuration = 1500 }) {
  const [logoEntered, setLogoEntered] = useState(false);
  const [textRevealed, setTextRevealed] = useState(false);
  const [phase, setPhase] = useState('init'); // 'init' | 'logo' | 'text' | 'exit'
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // 1. Logo morph/rotate entrance immediately
    const tLogo = setTimeout(() => {
      setLogoEntered(true);
      setPhase('logo');
    }, 100);

    // 2. Sequential Text Reveal disusul setelah logo muncul
    const tText = setTimeout(() => {
      setTextRevealed(true);
      setPhase('text');
    }, 450);

    // 3. Smooth exit fadeout
    const tExit = setTimeout(() => {
      setPhase('exit');
    }, minDuration);

    // 4. Unmount component
    const tUnmount = setTimeout(() => {
      setVisible(false);
      if (onFinish) onFinish();
    }, minDuration + 400);

    return () => {
      clearTimeout(tLogo);
      clearTimeout(tText);
      clearTimeout(tExit);
      clearTimeout(tUnmount);
    };
  }, [minDuration, onFinish]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white text-slate-900 select-none transition-all duration-400 ease-out ${
        phase === 'exit' ? 'opacity-0 pointer-events-none scale-105 filter blur-xs' : 'opacity-100 scale-100'
      }`}
    >
      <style>{`
        @keyframes morphRotate {
          0% {
            transform: scale(0.35) rotate(-35deg);
            opacity: 0;
            filter: blur(8px);
          }
          60% {
            transform: scale(1.08) rotate(4deg);
            opacity: 1;
            filter: blur(0px);
          }
          85% {
            transform: scale(0.97) rotate(-1.5deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
            filter: blur(0px);
          }
        }
        @keyframes auraGlow {
          0%, 100% {
            transform: scale(0.92);
            opacity: 0.35;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.7;
          }
        }
        @keyframes textSlideUp {
          0% {
            opacity: 0;
            transform: translateY(16px);
            letter-spacing: 0.05em;
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            letter-spacing: 0.12em;
          }
        }
      `}</style>

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo Container with Morph & 3D Rotation Animation */}
        <div className="relative flex items-center justify-center">
          {/* Subtle soft red/rose aura glow */}
          <div
            className={`absolute w-36 h-36 rounded-full bg-gradient-to-tr from-rose-200/60 to-red-100/40 filter blur-xl transition-all duration-700 ${
              logoEntered ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            }`}
            style={{ animation: logoEntered ? 'auraGlow 3s ease-in-out infinite' : 'none' }}
          />

          {/* Logo Card */}
          <div
            className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-3.5 bg-white border border-slate-200/90 shadow-2xl shadow-slate-200/80 flex items-center justify-center transition-all duration-700"
            style={{
              animation: logoEntered ? 'morphRotate 0.85s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
              opacity: logoEntered ? 1 : 0
            }}
          >
            <img
              src="/dea.png"
              alt="PT DEA GLOBAL NIAGA"
              className="w-full h-full object-contain filter drop-shadow-sm select-none pointer-events-none"
            />
          </div>
        </div>

        {/* Company Title Disusul Setelah Logo */}
        <div
          className="mt-6 text-center transition-all duration-700"
          style={{
            animation: textRevealed ? 'textSlideUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
            opacity: textRevealed ? 1 : 0
          }}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl sm:text-2xl font-black text-slate-950 font-sans tracking-wide">
              DEA
            </span>
            <span className="text-xl sm:text-2xl font-black text-red-700 font-sans tracking-wide">
              GLOBAL NIAGA
            </span>
          </div>

          <p className="text-[10px] sm:text-[11px] font-extrabold tracking-[0.25em] text-slate-400 uppercase mt-1">
            PT DEA GLOBAL NIAGA
          </p>
        </div>
      </div>
    </div>
  );
}
