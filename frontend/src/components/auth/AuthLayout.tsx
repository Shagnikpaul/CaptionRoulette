import React from 'react';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row font-['Geist']">
      <div className="flex-1 flex flex-col justify-center items-center px-12 lg:px-24 py-12 lg:py-0">
        {children}
      </div>
      <div className="hidden lg:flex lg:w-2/5 p-5">
        <div className="w-full h-full bg-[#0a0a0a] rounded-xl flex items-center justify-center relative overflow-hidden border border-white/5">
          {/* Abstract camera lens motif */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.03)_0%,_transparent_70%)]"></div>
          <svg className="w-64 h-64 text-white/5 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="14.31" y1="8" x2="20.05" y2="17.94" />
            <line x1="9.69" y1="8" x2="21.17" y2="8" />
            <line x1="7.38" y1="12" x2="13.12" y2="2.06" />
            <line x1="9.69" y1="16" x2="3.95" y2="6.06" />
            <line x1="14.31" y1="16" x2="2.83" y2="16" />
            <line x1="16.62" y1="12" x2="10.88" y2="21.94" />
          </svg>
        </div>
      </div>
    </div>
  );
}
