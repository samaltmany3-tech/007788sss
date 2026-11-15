
import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-slate-950 z-[1000] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] animate-pulse"></div>
      
      <div className="relative flex flex-col items-center animate-in zoom-in duration-700">
        {/* Logo Icon */}
        <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center font-black text-white text-5xl shadow-[0_0_50px_rgba(37,99,235,0.4)] mb-6 transform rotate-12 hover:rotate-0 transition-transform duration-500">
          ص
        </div>
        
        {/* App Name */}
        <h1 className="text-5xl font-black bg-gradient-to-l from-blue-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent mb-1">
          صرف
        </h1>
      </div>

      {/* Loading Indicator */}
      <div className="absolute bottom-16 flex flex-col items-center gap-4">
        <div className="w-16 h-1 bg-slate-900 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 w-1/2 animate-[loading_1.5s_infinite_ease-in-out]"></div>
        </div>
        <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">جاري تهيئة البيانات</p>
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-200%); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
