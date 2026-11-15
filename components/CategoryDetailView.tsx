
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Category, Expense } from '../types';
import { ChevronRight, Search, Calendar, FileText, Image as ImageIcon, Phone, PlusCircle, ChevronDown, ListFilter, Star, Tag } from 'lucide-react';

interface CategoryDetailViewProps {
  category: Category;
  onBack: () => void;
  onExpenseSelect: (exp: Expense) => void;
  onAddExpense: () => void;
}

export default function CategoryDetailView({ category, onBack, onExpenseSelect, onAddExpense }: CategoryDetailViewProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const load = async () => {
      let exps = await db.expenses.where('categoryId').equals(category.id).toArray();
      exps.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setExpenses(exps);
      setTotal(exps.reduce((acc, curr) => acc + curr.amount, 0));
      setShowAll(false);
    };
    load();
  }, [category.id]);

  const getDayName = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ar-YE', { weekday: 'long' });
  };

  const filteredExpenses = expenses.filter(exp => 
    exp.notes?.toLowerCase().includes(search.toLowerCase()) || 
    exp.amount.toString().includes(search) ||
    exp.tags?.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
    (exp.serialNumber && `SRF-${exp.serialNumber}`.toLowerCase().includes(search.toLowerCase()))
  );

  const displayedExpenses = showAll ? filteredExpenses : filteredExpenses.slice(0, 15);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={onBack} className="p-2 bg-slate-800/50 rounded-full hover:bg-slate-700 transition-colors"><ChevronRight size={20} /></button>
        <div>
          <h2 className="text-xl font-bold text-slate-100">{category.name}</h2>
          {category.phoneNumber && <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono" dir="ltr"><Phone size={10} className="text-blue-500" /><span>+967 {category.phoneNumber}</span></div>}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] text-center relative overflow-hidden group shadow-xl">
        <div className="relative z-10"><p className="text-slate-500 text-xs mb-1 font-bold uppercase tracking-widest">إجمالي مصروفات القسم</p><h3 className="text-4xl font-black text-white tabular-nums">{total.toLocaleString('ar-SA')} <span className="text-sm text-slate-500 mr-2 font-normal">ريال يمني</span></h3></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-600/10 transition-all duration-700" />
      </div>

      <button onClick={onAddExpense} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 active:scale-95 transition-all"><PlusCircle size={22} /><span>إضافة سند لـ {category.name}</span></button>

      <div className="relative"><Search className="absolute right-3 top-3.5 text-slate-500" size={18} /><input className="w-full bg-slate-900 border border-slate-800 rounded-2xl pr-10 pl-4 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner" placeholder="بحث في الملاحظات، المبالغ، أو الوسوم (#)..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>

      <div className="space-y-3 pb-4">
        <div className="flex justify-between items-center px-1"><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2"><ListFilter size={12} className="text-blue-500"/>العمليات الأخيرة ({filteredExpenses.length})</h4>{!showAll && filteredExpenses.length > 15 && <span className="text-[9px] text-blue-500 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full">يعرض 15 من {filteredExpenses.length}</span>}</div>
        {displayedExpenses.map((exp) => (
          <div key={exp.id} className="bg-slate-900/60 border border-slate-800/40 rounded-2xl p-4 flex justify-between items-center active:bg-slate-800 transition-all cursor-pointer group relative overflow-hidden" onClick={() => onExpenseSelect(exp)}>
            {exp.isFavorite && <div className="absolute top-0 right-0 p-1.5 bg-yellow-400/10 rounded-bl-xl"><Star size={10} className="text-yellow-400 fill-yellow-400" /></div>}
            <div className="flex gap-4 items-center">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-500 font-black text-[10px] shadow-lg group-hover:border-blue-500/50 transition-colors">{exp.serialNumber ? `SRF-${exp.serialNumber}` : '---'}</div>
              <div>
                <h4 className="font-bold text-slate-200 tabular-nums">{exp.amount.toLocaleString('ar-SA')} ر.ي</h4>
                <div className="flex flex-wrap gap-2 items-center text-[9px] text-slate-500 mt-1 font-medium">
                  <Calendar size={10} className="text-slate-600" /><span>{exp.date}</span>
                  {exp.tags && exp.tags.length > 0 && <div className="flex gap-1">{exp.tags.slice(0, 2).map(t => <span key={t} className="text-blue-400 font-bold">{t}</span>)}</div>}
                </div>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-700 rotate-180 group-hover:text-blue-500 transition-colors" />
          </div>
        ))}
        {!showAll && filteredExpenses.length > 15 && <button onClick={() => setShowAll(true)} className="w-full py-4 mt-2 flex flex-col items-center justify-center gap-1 text-[11px] font-bold text-blue-500 bg-blue-600/5 border border-dashed border-blue-600/20 rounded-2xl active:scale-[0.98] transition-all"><span>إظهار جميع السندات المتبقية ({filteredExpenses.length - 15})</span><ChevronDown size={14} className="animate-bounce" /></button>}
      </div>
    </div>
  );
}
