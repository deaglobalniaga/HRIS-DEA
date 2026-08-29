import React from 'react';

const AuthTransitionOverlay = () => {
  return (
    <div className="fixed inset-0 z-[999999] bg-white flex items-center justify-center select-none animate-in fade-in duration-200">
      <div className="relative flex items-center justify-center">
        {/* Orbit Ring 1 - Rounded Polygon 1 */}
        <div 
          className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-[38%] border-2 border-red-600/30 animate-orbit-1 pointer-events-none" 
        />

        {/* Orbit Ring 2 - Rounded Polygon 2 (Counter-Rotating) */}
        <div 
          className="absolute w-40 h-40 sm:w-48 sm:h-48 rounded-[44%] border border-rose-500/35 animate-orbit-2 pointer-events-none" 
        />

        {/* Orbit Ring 3 - Subtle Outer Halo */}
        <div 
          className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-[34%] border border-red-800/15 animate-orbit-3 pointer-events-none" 
        />

        {/* Ambient Glow */}
        <div className="absolute w-24 h-24 sm:w-28 sm:h-28 bg-red-500/10 rounded-full blur-xl pointer-events-none" />

        {/* DEA GLOBAL NIAGA Center Logo */}
        <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
          <img 
            src="/dea.png" 
            alt="DEA Global Niaga" 
            className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-500" 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      </div>
    </div>
  );
};

export default AuthTransitionOverlay;
