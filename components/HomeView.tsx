
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Expense, Category, AppSettings } from '../types';
import { 
  CalendarDays, 
  History, 
  ChevronLeft, 
  Star, 
  Zap, 
  X, 
  Plus, 
  Check, 
  Loader2,
  PlusCircle
} from 'lucide-react';

interface HomeViewProps {
  onExpenseSelect: (exp: Expense) => void;
}

interface FloatingBubble {
  id: number;
  amount: string;
  x: number;
  y: number;
}

const HomeView: React.FC<HomeViewProps> = ({ onExpenseSelect }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  
  // حالات الإضافة السريعة
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedQuickCat, setSelectedQuickCat] = useState<Category | null>(null);
  const [quickAmount, setQuickAmount] = useState('');
  const [lastPresetUsed, setLastPresetUsed] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  
  // تأثير الفقاعات الطائرة
  const [bubbles, setBubbles] = useState<FloatingBubble[]>([]);

  const loadData = async () => {
    try {
      const cats = await db.categories.toArray();
      cats.sort((a, b) => (a.order || 0) - (b.order || 0));
      setCategories(cats);
      
      if (cats.length > 0 && !selectedQuickCat) {
        setSelectedQuickCat(cats[0]);
      }
      
      const expenses = await db.expenses.toArray();
      let dailyTotal = 0;
      const todayStr = new Date().toISOString().split('T')[0];
      expenses.forEach(exp => { 
        if (exp.date === todayStr) dailyTotal += exp.amount; 
      });
      setTodayExpenses(dailyTotal);
      
      const sorted = [...expenses].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
      setRecentExpenses(sorted);
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  useEffect(() => { 
    loadData(); 
  }, []);

  const triggerHaptic = (pattern: 'light' | 'success') => {
    if (!navigator.vibrate) return;
    if (pattern === 'light') navigator.vibrate(15);
    else navigator.vibrate([30, 50, 30]); // اهتزاز مزدوج للنجاح
  };

  const createBubble = (amount: string, e: React.MouseEvent) => {
    const newBubble = {
      id: Date.now() + Math.random(),
      amount,
      x: e.clientX,
      y: e.clientY
    };
    setBubbles(prev => [...prev, newBubble]);
    setTimeout(() => {
      setBubbles(prev => prev.filter(b => b.id !== newBubble.id));
    }, 800);
  };

  const saveQuickExpense = async (explicitAmount?: number) => {
    const finalAmount = explicitAmount || parseFloat(quickAmount);
    if (!finalAmount || finalAmount <= 0) {
      alert('الرجاء إدخال مبلغ صحيح');
      return;
    }
    
    if (!selectedQuickCat) {
      alert('الرجاء اختيار قسم');
      return;
    }

    setIsSaving(true);
    triggerHaptic('success');
    try {
      const settings = await db.settings.get('app_settings') as AppSettings;
      const nextSerial = (settings?.lastSerialNumber || 0) + 1;

      const newExpense: Expense = {
        id: Date.now().toString(),
        amount: finalAmount,
        categoryId: selectedQuickCat.id,
        date: new Date().toISOString().split('T')[0],
        createdAt: Date.now(),
        serialNumber: nextSerial,
        notes: 'إضافة سريعة'
      };

      await db.expenses.add(newExpense);
      await db.settings.update('app_settings', { lastSerialNumber: nextSerial });
      
      setIsQuickAddOpen(false);
      setQuickAmount('');
      setLastPresetUsed(0);
      await loadData();
    } catch (error) {
      console.error("Quick add save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const setPresetAmount = (amt: number, e: React.MouseEvent) => {
    triggerHaptic('light');
    setQuickAmount(amt.toString());
    setLastPresetUsed(amt);
    createBubble(`+${amt}`, e);
  };

  const handleMultiplier = (e: React.MouseEvent) => {
    if (lastPresetUsed > 0) {
      triggerHaptic('light');
      const current = parseFloat(quickAmount) || 0;
      setQuickAmount((current + lastPresetUsed).toString());
      createBubble(`+${lastPresetUsed}`, e);
    }
  };

  const getDayName = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ar-YE', { weekday: 'long' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {/* الفقاعات الطائرة (تأثير البوب) */}
      {bubbles.map(bubble => (
        <div 
          key={bubble.id}
          className="fixed pointer-events-none z-[200] font-black text-blue-500 text-xl animate-bubble-fly shadow-blue-500/20 drop-shadow-lg"
          style={{ left: bubble.x, top: bubble.y }}
        >
          {bubble.amount}
        </div>
      ))}

      {/* بطاقة الإجمالي */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] shadow-2xl shadow-blue-900/30 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl opacity-50"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CalendarDays size={16} className="text-blue-100" />
            <p className="text-blue-100 text-sm font-bold uppercase tracking-widest">إجمالي مصاريف اليوم</p>
          </div>
          <h2 className="text-5xl font-black mb-3 tabular-nums">
            {todayExpenses.toLocaleString('ar-SA')} 
            <span className="text-xl mr-2 font-normal opacity-70">ر.ي</span>
          </h2>
          <div className="inline-flex items-center px-4 py-1.5 bg-white/15 rounded-full text-[11px] font-bold backdrop-blur-sm border border-white/10">
            {new Date().toLocaleDateString('ar-YE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>

      {/* زر الإضافة السريعة المركزي */}
      <div className="px-2">
        <button 
          onClick={() => { triggerHaptic('light'); setIsQuickAddOpen(true); }}
          className="w-full bg-slate-900 border border-slate-800 p-6 rounded-[2.2rem] flex items-center justify-between group active:scale-[0.98] transition-all shadow-xl relative overflow-hidden border-b-4 border-b-blue-600/20"
        >
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-blue-600/10 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform shadow-lg border border-blue-500/20">
              <Zap size={28} fill="currentColor" />
            </div>
            <div className="text-right">
              <h3 className="text-lg font-black text-slate-100">الإضافة السريعة</h3>
              <p className="text-[10px] text-slate-500 font-bold">تسجيل فوري للمصروفات المتكررة</p>
            </div>
          </div>
          <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-900/40">
            <Plus size={20} />
          </div>
        </button>
      </div>

      {/* أحدث العمليات */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-lg font-black text-slate-300 flex items-center gap-2">
            <History size={18} className="text-blue-500" />
            أحدث العمليات
          </h3>
        </div>
        
        <div className="space-y-3">
          {recentExpenses.map((exp) => {
            const cat = categories.find(c => c.id === exp.categoryId);
            return (
              <div 
                key={exp.id} 
                onClick={() => { triggerHaptic('light'); onExpenseSelect(exp); }} 
                className="bg-slate-900/60 border border-slate-800/50 p-4 rounded-2xl flex justify-between items-center active:scale-[0.98] transition-all cursor-pointer hover:bg-slate-900 group relative overflow-hidden shadow-sm"
              >
                <div className="flex gap-3 items-center">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black shadow-lg" 
                    style={{ backgroundColor: `${cat?.color}15`, color: cat?.color, border: `1px solid ${cat?.color}30` }}
                  >
                    {cat?.name?.charAt(0) || 'ص'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm">{cat?.name || 'بدون قسم'}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">{exp.date} • {getDayName(exp.date)}</p>
                  </div>
                </div>
                <div className="text-left flex items-center gap-2">
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-blue-400 tabular-nums">{exp.amount.toLocaleString()}</span>
                    <span className="text-[8px] text-slate-600 font-bold uppercase">R.Y</span>
                  </div>
                  <ChevronLeft size={14} className="text-slate-700 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* نافذة الإضافة السريعة (المحسنة والعملية) */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-[2.5rem] p-6 space-y-6 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            
            <div className="flex justify-between items-center relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-400/10 text-yellow-400 rounded-xl border border-yellow-400/10">
                  <Zap size={22} fill="currentColor" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">إضافة سريعة</h3>
                  <p className="text-[10px] text-slate-500 font-bold">{selectedQuickCat?.name || 'اختر القسم'}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsQuickAddOpen(false)} 
                className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition-colors active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 relative z-10">
              {/* اختيار القسم - أسماء فقط لتوفير المساحة */}
              <div className="space-y-3">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">١. اختر القسم</label>
                <div className="grid grid-cols-3 gap-2 max-h-[140px] overflow-y-auto no-scrollbar p-1">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { triggerHaptic('light'); setSelectedQuickCat(cat); }}
                      className={`flex items-center justify-center py-3 px-1 rounded-xl border transition-all duration-200 ${
                        selectedQuickCat?.id === cat.id 
                          ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/40 scale-[1.02] text-white' 
                          : 'bg-slate-800/50 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-[10px] font-black truncate w-full text-center">
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* إدخال المبلغ */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <label htmlFor="quick-amount-input" className="text-[10px] text-slate-500 font-black uppercase tracking-widest block cursor-pointer">
                    ٢. حدد المبلغ
                  </label>
                  {lastPresetUsed > 0 && (
                    <button 
                      onClick={handleMultiplier}
                      className="flex items-center gap-1.5 text-blue-400 bg-blue-400/10 px-3 py-1 rounded-lg border border-blue-400/20 active:scale-90 transition-all animate-in zoom-in"
                    >
                      <PlusCircle size={14} />
                      <span className="text-[10px] font-black tabular-nums">{lastPresetUsed}+</span>
                    </button>
                  )}
                </div>
                
                {/* مبالغ جاهزة أسرع */}
                <div className="grid grid-cols-4 gap-2">
                  {[500, 1000, 2000, 5000].map(amt => (
                    <button
                      key={amt}
                      onClick={(e) => setPresetAmount(amt, e)}
                      className={`py-2.5 rounded-xl border text-[11px] font-black transition-all tabular-nums active:scale-95 ${
                        quickAmount === amt.toString() 
                          ? 'bg-blue-600 border-blue-500 text-white' 
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {amt.toLocaleString()}
                    </button>
                  ))}
                </div>

                <div className="relative group">
                  <input
                    id="quick-amount-input"
                    type="number"
                    pattern="[0-9]*"
                    inputMode="decimal"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-5 text-4xl font-black text-center text-blue-500 outline-none focus:ring-2 focus:ring-blue-600 tabular-nums shadow-inner placeholder:text-slate-800 transition-all"
                    value={quickAmount}
                    onChange={(e) => setQuickAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700 group-focus-within:text-blue-600 transition-colors">R.Y</div>
                </div>
              </div>

              {/* زر التأكيد النهائي */}
              <button 
                onClick={() => saveQuickExpense()}
                disabled={isSaving || !quickAmount}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-900/30 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {isSaving ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <>
                    <Check size={22} strokeWidth={4} />
                    <span className="text-lg">تأكيــد الإضافــة</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2">
              سند سريع • {new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bubble-fly {
          0% { transform: scale(0.5) translate(0, 0); opacity: 1; }
          100% { transform: scale(1.5) translate(-100px, -220px); opacity: 0; }
        }
        .animate-bubble-fly {
          animation: bubble-fly 0.8s cubic-bezier(0.1, 0.7, 1.0, 0.1) forwards;
        }
      `}</style>
    </div>
  );
};

export default HomeView;
