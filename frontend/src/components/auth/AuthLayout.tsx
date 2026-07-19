import React from 'react';
import { CommunityCarousel } from './CommunityCarousel';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-black text-white flex flex-col lg:flex-row font-['Geist'] overflow-hidden">
      {/* ── Left: form ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-12 lg:px-24 py-12 lg:py-0">
        {children}
      </div>

      {/* ── Right: community carousel ── */}
      <div className="hidden lg:flex lg:w-2/5 p-5 h-full">
        <div className="w-full h-full bg-[#0a0a0a] rounded-2xl overflow-hidden relative border border-white/5">
          {/* Subtle radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,100,0,0.04)_0%,_transparent_65%)] pointer-events-none z-0" />
          <div className="relative z-10 w-full h-full">
            <CommunityCarousel />
          </div>
        </div>
      </div>
    </div>
  );
}
