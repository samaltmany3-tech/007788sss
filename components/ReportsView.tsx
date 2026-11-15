
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { Expense, Category } from '../types';
import { FileDown, TrendingUp, Calendar, MessageCircle, ChevronRight, Search, X, ExternalLink, Download, FileText, Layers, ChevronDown, Star, Tag, Hash, Clock } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { handlePdfAction } from '../utils/pdfActions';
import { calculatePageSlices, sliceCanvas } from '../utils/pdfPages';

interface ReportsViewProps { onExpenseSelect?: (exp: Expense) => void; }

const ReportsView: React.FC<ReportsViewProps> = ({ onExpenseSelect }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fromDate, setFromDate] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPdfMenu, setShowPdfMenu] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const cats = await db.categories.toArray();
      setCategories(cats);
      
      // CRITICAL FIX: Ensure dates are valid before calling .between to avoid 'bound' DataError
      if (!fromDate || !toDate) {
        setExpenses([]);
        return;
      }

      try {
        let results = await db.expenses
          .where('date')
          .between(fromDate, toDate, true, true)
          .toArray();
        
        if (selectedCategoryId !== 'all') {
          results = results.filter(e => e.categoryId === selectedCategoryId);
        }
        
        results.sort((a, b) => b.createdAt - a.createdAt);
        setExpenses(results);
        setShowAll(false);
      } catch (err) {
        console.error("Error querying expenses range:", err);
        setExpenses([]);
      }
    };
    load();
  }, [fromDate, toDate, selectedCategoryId]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const loadSuggestions = async () => {
        const allExpenses = await db.expenses.toArray();
        const tags = allExpenses.flatMap(e => e.tags || []);
        const notes = allExpenses.map(e => e.notes || '').filter(n => n.length > 0);
        
        const combined = Array.from(new Set([...tags, ...notes]));
        const filtered = combined.filter(item => 
          item.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 5);
        
        setSuggestions(filtered);
        setShowSuggestions(true);
      };
      loadSuggestions();
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDayName = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ar-YE', { weekday: 'long' });
  };

  const processPDF = async (action: 'download' | 'view') => {
    if (expenses.length === 0 || isGenerating) return;
    const element = reportRef.current;
    if (!element) return;
    const previousStyle = element.style.cssText;
    setIsGenerating(true); 
    setShowPdfMenu(false); 
    setProgress(20); 
    setStatusMessage('جاري تجهيز الكشف...');
    try {
      setProgress(40); 
      element.style.display = 'block'; 
      element.style.visibility = 'visible'; 
      element.style.position = 'fixed'; 
      element.style.left = '-10000px';
      
      await new Promise(r => setTimeout(r, 800));
      
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff' 
      });
      const elementTop = element.getBoundingClientRect().top;
      const canvasScale = canvas.height / element.scrollHeight;
      const safeBreaks = [...element.querySelectorAll<HTMLTableRowElement>('tbody tr')].map((row: HTMLTableRowElement) =>
        Math.round((row.getBoundingClientRect().bottom - elementTop) * canvasScale),
      );
      element.style.display = 'none';

      setProgress(70);
      setStatusMessage('جاري إنشاء ملف PDF...');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const slices = calculatePageSlices(canvas.width, canvas.height, pdfWidth, pdfHeight, safeBreaks);
      slices.forEach((slice, index) => {
        if (index > 0) pdf.addPage();
        const pageCanvas = sliceCanvas(canvas, slice);
        const renderedHeight = (slice.sourceHeight * pdfWidth) / canvas.width;
        pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pdfWidth, renderedHeight);
        pageCanvas.width = 0;
        pageCanvas.height = 0;
      });

      setProgress(100); 
      setStatusMessage('اكتملت العملية!');
      await new Promise(r => setTimeout(r, 500));
      
      const fileName = `تقرير_صرف_${fromDate}.pdf`;
      const result = await handlePdfAction(pdf, action, fileName);
      if (action === 'download') alert(`تم حفظ الكشف في:\n${result.displayPath}`);
    } catch (error) { alert('حدث خطأ أثناء معالجة التقرير.'); console.error(error); } 
    finally {
      element.style.cssText = previousStyle;
      setIsGenerating(false);
      setProgress(0);
      setStatusMessage('');
    }
  };

  const selectedCategory = selectedCategoryId !== 'all' ? categories.find(c => c.id === selectedCategoryId) : null;
  const canShareWhatsApp = selectedCategoryId !== 'all' && !!selectedCategory?.phoneNumber;

  const shareViaWhatsApp = () => {
    if (!canShareWhatsApp) return;

    const totalVal = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const catName = selectedCategory?.name || '';
    
    const message = `*كشف مصروفات - تطبيق صرف*\n\n` +
                    `*الفترة:* من ${fromDate} إلى ${toDate}\n` +
                    `*القسم:* ${catName}\n` +
                    (searchQuery ? `*بحث:* ${searchQuery}\n` : '') +
                    `*الإجمالي:* ${totalVal.toLocaleString()} ر.ي\n` +
                    `*عدد العمليات:* ${filteredExpenses.length}\n\n` +
                    `_تم التصدير بواسطة تطبيق صرف المالي_`;
    
    const phone = selectedCategory!.phoneNumber!.startsWith('967') ? selectedCategory!.phoneNumber : `967${selectedCategory!.phoneNumber}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const filteredExpenses = expenses.filter(exp => 
    exp.notes?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    exp.amount.toString().includes(searchQuery) ||
    exp.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const totalAmount = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const displayedExpenses = showAll ? filteredExpenses : filteredExpenses.slice(0, 15);
  const sortedExpensesForPdf = [...filteredExpenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <h2 className="text-xl font-bold mb-4">التقارير والكشوفات</h2>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 flex items-center gap-1"><Calendar size={12}/> من تاريخ</label>
          <input type="date" className="w-full bg-transparent text-sm outline-none text-blue-400 font-bold" value={fromDate} onChange={e => setFromDate(e.target.value)}/>
          <span className="text-[9px] text-slate-600 block mt-1 font-medium">{getDayName(fromDate)}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 flex items-center gap-1"><Calendar size={12}/> إلى تاريخ</label>
          <input type="date" className="w-full bg-transparent text-sm outline-none text-blue-400 font-bold" value={toDate} onChange={e => setToDate(e.target.value)}/>
          <span className="text-[9px] text-slate-600 block mt-1 font-medium">{getDayName(toDate)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1 flex items-center gap-1"><Layers size={12}/> تصفية حسب القسم</label>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button onClick={() => setSelectedCategoryId('all')} className={`flex-shrink-0 px-6 py-2 rounded-full border text-xs font-black transition-all ${selectedCategoryId === 'all' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>الكل</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategoryId(cat.id)} className={`flex-shrink-0 px-6 py-2 rounded-full border text-xs font-black transition-all ${selectedCategoryId === cat.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>{cat.name}</button>
          ))}
        </div>
      </div>

      <div className="relative" ref={searchRef}>
        <div className="absolute right-4 top-4 text-slate-500">
          <Search size={18}/>
        </div>
        <input 
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl pr-11 pl-11 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-xl placeholder:text-slate-600 transition-all" 
          placeholder="ابحث بالوصف، المبلغ، أو الوسوم (#)..." 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.length > 0 && setShowSuggestions(true)}
        />
        {searchQuery && (
          <button 
            onClick={() => { setSearchQuery(''); setShowSuggestions(false); }}
            className="absolute left-4 top-4 text-slate-500 hover:text-white transition-colors"
          >
            <X size={18}/>
          </button>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="p-2 border-b border-slate-800 flex items-center gap-2 px-4 py-3 bg-slate-900/50">
              <Clock size={14} className="text-slate-500" />
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">نتائج مقترحة</span>
            </div>
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSearchQuery(suggestion);
                  setShowSuggestions(false);
                }}
                className="w-full text-right px-4 py-3.5 hover:bg-slate-800 text-sm font-bold border-b border-slate-800/50 last:border-0 flex items-center justify-between transition-colors group"
              >
                <span className={suggestion.startsWith('#') ? 'text-blue-400' : 'text-slate-200'}>
                  {suggestion}
                </span>
                <ChevronRight size={14} className="text-slate-700 rotate-180 group-hover:text-blue-500 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-7 rounded-[2.5rem] shadow-2xl text-white flex justify-between items-center relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
        <div className="relative z-10">
          <p className="text-blue-100 text-[10px] mb-1 font-black uppercase tracking-[0.2em]">إجمالي المبلغ للفترة</p>
          <h3 className="text-4xl font-black tabular-nums">{totalAmount.toLocaleString()} <span className="text-sm font-normal opacity-70">ر.ي</span></h3>
        </div>
        <div className="p-4 bg-white/15 rounded-3xl relative z-10 backdrop-blur-xl border border-white/10 shadow-lg group-hover:rotate-12 transition-transform"><TrendingUp size={28}/></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setShowPdfMenu(true)} disabled={filteredExpenses.length === 0} className="px-4 py-5 rounded-3xl font-black flex flex-col items-center justify-center gap-2 bg-slate-900 border border-slate-800 text-white hover:border-blue-500 hover:shadow-lg hover:shadow-blue-900/10 transition-all active:scale-95 disabled:opacity-30 shadow-md">
          <div className="p-3 bg-blue-600/10 rounded-2xl"><FileDown size={24} className="text-blue-500"/></div>
          <span className="text-[11px] uppercase tracking-wider">تصدير PDF</span>
        </button>
        <button 
          onClick={shareViaWhatsApp} 
          disabled={!canShareWhatsApp || filteredExpenses.length === 0} 
          className={`px-4 py-5 rounded-3xl font-black flex flex-col items-center justify-center gap-2 border transition-all active:scale-95 shadow-md ${canShareWhatsApp ? 'bg-slate-900 border-slate-800 text-white hover:border-green-500 hover:shadow-green-900/10' : 'bg-slate-900/40 border-slate-800/50 text-slate-600 opacity-50 cursor-not-allowed'}`}
        >
          <div className={`p-3 rounded-2xl ${canShareWhatsApp ? 'bg-green-600/10 text-green-500' : 'bg-slate-800 text-slate-700'}`}>
            <MessageCircle size={24} />
          </div>
          <span className="text-[11px] uppercase tracking-wider">مشاركة واتساب</span>
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] flex items-center gap-2">
            <Layers size={12} className="text-blue-500" />
            السندات المفلترة ({filteredExpenses.length})
          </h4>
        </div>
        
        {displayedExpenses.length > 0 ? (
          <div className="space-y-3">
            {displayedExpenses.map(exp => {
              const cat = categories.find(c => c.id === exp.categoryId);
              return (
                <div 
                  key={exp.id} 
                  className="bg-slate-900/50 p-4 rounded-2xl flex justify-between items-center border border-slate-800/30 cursor-pointer active:bg-slate-800 transition-all relative overflow-hidden group hover:border-slate-700" 
                  onClick={() => onExpenseSelect?.(exp)}
                >
                  {exp.isFavorite && <div className="absolute top-0 right-0 p-2 bg-yellow-400/10 rounded-bl-2xl"><Star size={12} className="text-yellow-400 fill-yellow-400" /></div>}
                  <div className="flex gap-4 items-center">
                    <div className="w-11 h-11 rounded-2xl bg-slate-800 flex items-center justify-center text-[10px] text-blue-500 font-black border border-slate-700 group-hover:border-blue-500/50 transition-colors shadow-inner">
                      {exp.serialNumber || '0'}
                    </div>
                    <div>
                      <p className="font-black tabular-nums text-slate-200 text-base">{exp.amount.toLocaleString()} ر.ي</p>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">{exp.date} • {cat?.name}</p>
                      {exp.tags && exp.tags.length > 0 && (
                        <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar">
                          {exp.tags.map(t => <span key={t} className="text-[8px] font-black bg-blue-600/10 text-blue-400 border border-blue-600/20 px-2 py-0.5 rounded-full">{t}</span>)}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-700 rotate-180 group-hover:text-blue-500 transition-all"/>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-900/20 border border-dashed border-slate-800 rounded-[2.5rem]">
            <Search size={40} className="text-slate-800 mx-auto mb-4" />
            <p className="text-slate-500 text-sm font-bold">لا توجد نتائج تطابق بحثك</p>
            <p className="text-[10px] text-slate-700 mt-2">جرب البحث بكلمات مختلفة أو تغيير الفترة</p>
          </div>
        )}

        {!showAll && filteredExpenses.length > 15 && (
          <button 
            onClick={() => setShowAll(true)} 
            className="w-full py-5 mt-2 flex flex-col items-center justify-center gap-1 text-[11px] font-black text-blue-500 bg-blue-600/5 border border-dashed border-blue-600/20 rounded-3xl active:scale-95 transition-all"
          >
            <span>عرض كافة النتائج المتبقية ({filteredExpenses.length - 15})</span>
            <ChevronDown size={14} className="animate-bounce mt-1" />
          </button>
        )}
      </div>

      {isGenerating && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-xs space-y-8 text-center">
            <div className="relative flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin shadow-2xl shadow-blue-500/20"/>
              <FileText className="absolute text-blue-500" size={32}/>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end mb-2 px-1">
                <span className="text-blue-400 text-xs font-black uppercase tracking-widest">{statusMessage}</span>
                <span className="text-slate-500 text-[10px] font-mono font-bold">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-blue-500 transition-all duration-500 shadow-lg shadow-blue-500/50" style={{ width: `${progress}%` }}/>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPdfMenu && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600/20 text-blue-500 rounded-2xl shadow-lg">
                  <FileDown size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">تصدير الكشف</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">اختر كيفية معالجة التقرير</p>
                </div>
              </div>
              <button onClick={() => setShowPdfMenu(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                <X size={24}/>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => processPDF('view')} className="group bg-slate-800/50 hover:bg-slate-800 text-white p-7 rounded-[2.5rem] flex flex-col items-center gap-3 border border-slate-800 transition-all active:scale-95">
                <div className="p-4 bg-blue-600/10 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform">
                  <ExternalLink size={28}/>
                </div>
                <span className="font-black text-xs uppercase tracking-wider">فتح فوري</span>
              </button>
              <button onClick={() => processPDF('download')} className="group bg-blue-600 hover:bg-blue-500 text-white p-7 rounded-[2.5rem] flex flex-col items-center gap-3 shadow-2xl shadow-blue-900/20 transition-all active:scale-95 border border-blue-500/20">
                <div className="p-4 bg-white/20 text-white rounded-2xl group-hover:scale-110 transition-transform">
                  <Download size={28}/>
                </div>
                <span className="font-black text-xs uppercase tracking-wider">تحميل PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={reportRef} dir="rtl" style={{ display: 'none', width: '210mm', padding: '15mm', backgroundColor: '#ffffff', color: '#000000', fontFamily: '"Tajawal", system-ui, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
          <div><h1 style={{ margin: 0, fontSize: '24px', color: '#000000' }}>كشف مصروفات</h1><p style={{ margin: 0, fontSize: '12px', color: '#000000' }}>القسم: {selectedCategoryId === 'all' ? 'الكل' : categories.find(c => c.id === selectedCategoryId)?.name}{searchQuery ? ` | بحث: ${searchQuery}` : ''}</p></div>
          <div style={{ textAlign: 'left' }}><p style={{ margin: 0, fontSize: '10px', color: '#000000' }}>الفترة: {fromDate} إلى {toDate}</p></div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', color: '#000000' }}>
          <thead><tr style={{ backgroundColor: '#f0f0f0' }}><th style={{ border: '1px solid #000', padding: '5px' }}>رقم السند</th><th style={{ border: '1px solid #000', padding: '5px' }}>القسم</th><th style={{ border: '1px solid #000', padding: '5px' }}>المبلغ</th><th style={{ border: '1px solid #000', padding: '5px' }}>التاريخ</th><th style={{ border: '1px solid #000', padding: '5px' }}>البيان والوسوم</th></tr></thead>
          <tbody>{sortedExpensesForPdf.map(exp => (<tr key={exp.id}><td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>SRF-{exp.serialNumber}</td><td style={{ border: '1px solid #000', padding: '5px' }}>{categories.find(c => c.id === exp.categoryId)?.name}</td><td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{exp.amount.toLocaleString()}</td><td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{exp.date}</td><td style={{ border: '1px solid #000', padding: '5px' }}>{exp.notes}{exp.tags && exp.tags.length > 0 && ` [${exp.tags.join(' ')}]`}</td></tr>))}</tbody>
        </table>
        <div style={{ marginTop: '20px', textAlign: 'left', fontWeight: 'bold' }}>إجمالي المبلغ: {totalAmount.toLocaleString()} ريال يمني</div>
      </div>
    </div>
  );
};
export default ReportsView;
