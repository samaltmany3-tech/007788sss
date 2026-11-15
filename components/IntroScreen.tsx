
import React, { useEffect, useState } from 'react';

const IntroScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // تفعيل حركة الظهور
    const startTimer = setTimeout(() => setIsVisible(true), 100);
    
    // تفعيل حركة الخروج قبل انتهاء الوقت المخصص في App.tsx
    const exitTimer = setTimeout(() => setIsExiting(true), 1400);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(exitTimer);
    };
  }, []);

  return (
    <div className={`fixed inset-0 z-[1001] flex items-center justify-center transition-all duration-1000 ease-in-out ${isExiting ? 'opacity-0 backdrop-blur-0' : 'opacity-100 backdrop-blur-2xl'}`}>
      {/* طبقة لونية خفيفة جداً لتعزيز القراءة */}
      <div className="absolute inset-0 bg-slate-950/20"></div>
      
      <div className={`relative flex flex-col items-center transition-all duration-1000 ease-out transform ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'} ${isExiting ? 'scale-110 blur-md' : ''}`}>
        
        {/* كلمة Hello بتصميم Serif فاخر */}
        <h2 className="text-8xl md:text-9xl font-serif font-light text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
          <span className="bg-gradient-to-b from-white via-slate-200 to-slate-400 bg-clip-text text-transparent italic">
            Hello
          </span>
        </h2>
        
        {/* خط تزييني يتمدد من المركز */}
        <div className={`h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent mt-6 transition-all duration-[1500ms] ease-in-out ${isVisible ? 'w-48 opacity-100' : 'w-0 opacity-0'}`}></div>
        
        {/* نص فرعي صغير جداً */}
        <p className={`text-[10px] text-blue-400/60 uppercase tracking-[0.5em] mt-4 font-light transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          Welcome to Sarf
        </p>
      </div>
    </div>
  );
};

export default IntroScreen;
