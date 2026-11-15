
import React, { useState } from 'react';
import { Lock, Delete, ChevronRight } from 'lucide-react';

interface LockScreenProps {
  onUnlock: () => void;
  pinCode: string;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, pinCode }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handlePress = (num: string) => {
    setError(false);
    if (input.length < pinCode.length) {
      const newInput = input + num;
      setInput(newInput);
      
      if (newInput.length === pinCode.length) {
        if (newInput === pinCode) {
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => setInput(''), 500);
        }
      }
    }
  };

  const handleDelete = () => {
    setInput(input.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[100] p-8">
      <div className="mb-12 flex flex-col items-center gap-4">
        <div className={`p-6 rounded-full ${error ? 'bg-red-600/20 text-red-500' : 'bg-blue-600/20 text-blue-500'}`}>
          <Lock size={48} />
        </div>
        <h2 className="text-2xl font-bold">صرف</h2>
        <p className="text-slate-400">أدخل الرمز السري للدخول</p>
      </div>

      <div className="flex gap-4 mb-12">
        {Array.from({ length: pinCode.length }).map((_, i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full border-2 transition-all ${
              i < input.length ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-slate-700'
            } ${error ? 'bg-red-500 border-red-500 animate-pulse' : ''}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 max-w-xs w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((val, i) => {
          if (val === '') return <div key={i} />;
          if (val === 'del') {
            return (
              <button 
                key={i}
                onClick={handleDelete}
                className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 active:bg-slate-800 transition-colors"
              >
                <Delete size={24} />
              </button>
            );
          }
          return (
            <button 
              key={i}
              onClick={() => handlePress(val.toString())}
              className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl font-bold active:bg-blue-600 active:text-white transition-colors tabular-nums"
            >
              {val}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LockScreen;
