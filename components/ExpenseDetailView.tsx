
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { Expense, Category } from '../types';
import { 
  ChevronRight, 
  Calendar, 
  Tag, 
  FileText, 
  Edit3,
  Trash2,
  ExternalLink,
  Loader2,
  Hash,
  Star,
  MessageCircle,
  Download
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import ConfirmModal from './ConfirmModal';
import { handlePdfAction } from '../utils/pdfActions';

interface ExpenseDetailViewProps {
  expense: Expense;
  onBack: () => void;
  onEdit: (exp: Expense) => void;
}

const ExpenseDetailView: React.FC<ExpenseDetailViewProps> = ({ expense: initialExpense, onBack, onEdit }) => {
  const [expense, setExpense] = useState<Expense>(initialExpense);
  const [category, setCategory] = useState<Category | null>(null);
  const [isGeneratingVoucher, setIsGeneratingVoucher] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const voucherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setExpense(initialExpense);
    db.categories.get(initialExpense.categoryId).then(cat => setCategory(cat || null));
  }, [initialExpense]);

  const getDayName = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ar-YE', { weekday: 'long' });
  };

  const handleDeleteToTrash = async () => {
    await db.trash.add(expense);
    await db.expenses.delete(expense.id);
    onBack();
  };

  const toggleFavorite = async () => {
    const newVal = !expense.isFavorite;
    const updated = { ...expense, isFavorite: newVal };
    await db.expenses.update(expense.id, { isFavorite: newVal });
    setExpense(updated);
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const shareViaWhatsApp = () => {
    if (!category?.phoneNumber) return;
    
    const message = `*سند صرف مالي - تطبيق صرف*\n\n` +
                    `*رقم السند:* SRF-${expense.serialNumber}\n` +
                    `*المبلغ:* ${expense.amount.toLocaleString()} ر.ي\n` +
                    `*التاريخ:* ${expense.date} (${getDayName(expense.date)})\n` +
                    `*القسم:* ${category.name}\n` +
                    `*البيان:* ${expense.notes || 'مصروفات متنوعة'}\n\n` +
                    `_تم الإرسال عبر تطبيق صرف المالي_`;
    
    const phone = category.phoneNumber.startsWith('967') ? category.phoneNumber : `967${category.phoneNumber}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const generateVoucherPDF = async (action: 'download' | 'view') => {
    const element = voucherRef.current;
    if (!element) return;
    const previousStyle = element.style.cssText;
    setIsGeneratingVoucher(true);
    try {
      element.style.display = 'block';
      element.style.position = 'fixed';
      element.style.left = '-10000px';
      
      // Wait for DOM
      await new Promise(r => setTimeout(r, 800));
      
      const canvas = await html2canvas(element, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      element.style.display = 'none';
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const fileName = `سند_صرف_${expense.serialNumber}.pdf`;
      const result = await handlePdfAction(pdf, action, fileName);
      if (action === 'download') alert(`تم حفظ السند في:\n${result.displayPath}`);
    } catch (error) {
      alert('خطأ في استخراج السند');
      console.error(error);
    } finally {
      element.style.cssText = previousStyle;
      setIsGeneratingVoucher(false);
    }
  };

  const hasAttachments = !!(expense.notes || expense.image || (expense.tags && expense.tags.length > 0));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-2">
        <button onClick={onBack} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
          <ChevronRight size={20} />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold">تفاصيل المصروف</h2>
          <p className="text-[10px] text-blue-500 font-mono font-bold tracking-widest uppercase">SRF-{expense.serialNumber}</p>
        </div>
        <div className="flex gap-1">
           <button 
            onClick={toggleFavorite}
            className={`p-2 transition-all active:scale-125 ${expense.isFavorite ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-slate-600'}`}
          >
            <Star size={24} fill={expense.isFavorite ? "currentColor" : "none"} />
          </button>
          <button onClick={() => setIsConfirmOpen(true)} className="p-2 bg-red-600/10 text-red-500 rounded-full hover:bg-red-600 hover:text-white transition-all">
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-slate-800 text-center shadow-xl relative overflow-hidden">
        {expense.isFavorite && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-20">
            <Star size={100} className="text-yellow-400 fill-yellow-400 blur-sm" />
          </div>
        )}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
        <div className="relative z-10">
          <p className="text-slate-500 text-sm mb-2 font-medium">المبلغ المصروف</p>
          <div className="flex items-center justify-center gap-2">
            {expense.isFavorite && <Star size={24} className="text-yellow-400 fill-yellow-400 animate-pulse" />}
            <h3 className="text-5xl font-black text-blue-500 tabular-nums">{expense.amount.toLocaleString('ar-SA')}</h3>
          </div>
          <p className="text-lg text-slate-500 font-bold">ريال يمني</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden divide-y divide-slate-800 shadow-lg">
        <div className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500"><Hash size={18} /></div>
          <div className="flex-grow"><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">الرقم التسلسلي</p><p className="font-bold text-slate-200">SRF - {expense.serialNumber}</p></div>
        </div>
        <div className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500"><Tag size={18} /></div>
          <div className="flex-grow"><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">الجهة / القسم</p><p className="font-bold text-slate-200">{category?.name || 'عام'}</p></div>
        </div>
        <div className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500"><Calendar size={18} /></div>
          <div><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">تاريخ الصرف</p><p className="font-bold text-slate-200">{expense.date} <span className="text-xs opacity-60 mr-1">({getDayName(expense.date)})</span></p></div>
        </div>
      </div>

      {hasAttachments && (
        <div className="space-y-4">
          {expense.notes && (
            <div className="bg-slate-900/40 rounded-3xl border border-slate-800/50 p-6 shadow-inner relative">
              <div className="flex items-center gap-2 mb-3"><FileText size={16} className="text-blue-500" /><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">البيان / الملاحظات</p></div>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{expense.notes}</p>
            </div>
          )}
          {expense.tags && expense.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 px-2">
              {expense.tags.map(tag => (
                <span key={tag} className="bg-blue-600/10 text-blue-400 border border-blue-500/20 px-4 py-1.5 rounded-full text-xs font-black">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {expense.image && (
            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
              <img src={expense.image} className="w-full h-auto max-h-[500px] object-contain" alt="Expense" />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 pt-4">
        {category?.phoneNumber && (
          <button 
            onClick={shareViaWhatsApp}
            className="bg-green-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-green-900/20 active:scale-95 transition-all hover:bg-green-500"
          >
            <MessageCircle size={22} />
            <span>إرسال السند عبر واتساب</span>
          </button>
        )}
        
        <div className="grid grid-cols-2 gap-3">
          <button disabled={isGeneratingVoucher} onClick={() => generateVoucherPDF('download')} className="bg-slate-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-slate-700 disabled:opacity-50">
            {isGeneratingVoucher ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            <span>تحميل</span>
          </button>
          <button disabled={isGeneratingVoucher} onClick={() => generateVoucherPDF('view')} className="bg-blue-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 active:scale-95 transition-all hover:bg-blue-500 disabled:opacity-50">
            {isGeneratingVoucher ? <Loader2 size={20} className="animate-spin" /> : <ExternalLink size={20} />}
            <span>عرض السند</span>
          </button>
        </div>
      </div>

      <ConfirmModal isOpen={isConfirmOpen} title="أرشفة السند" message="هل أنت متأكد من حذف هذا السند؟ سيتم نقله إلى سلة المهملات." onConfirm={handleDeleteToTrash} onCancel={() => setIsConfirmOpen(false)} />

      <div ref={voucherRef} dir="rtl" style={{ display: 'none', width: '148mm', padding: '12mm', backgroundColor: '#ffffff', color: '#1e293b', fontFamily: "'Tajawal', Arial" }}>
        <div style={{ border: '1.5mm double #3b82f6', padding: '10mm', height: '100%', borderRadius: '4px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6mm', marginBottom: '8mm' }}>
            <div><h1 style={{ fontSize: '24px', fontWeight: '900', color: '#1e3a8a', margin: '0 0 2mm 0' }}>سند صــرف مالي</h1><p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>نظام صرف لإدارة المصروفات الشخصية</p></div>
            <div style={{ textAlign: 'left', fontSize: '11px', color: '#1e293b' }}><p style={{ margin: '0 0 1mm 0' }}>الرقم: <span style={{ fontWeight: 'bold' }}>SRF-{expense.serialNumber}</span></p><p style={{ margin: 0 }}>التاريخ: <span style={{ fontWeight: 'bold' }}>{expense.date}</span></p></div>
          </div>
          <div style={{ flexGrow: 1 }}>
            <div style={{ marginBottom: '6mm', display: 'flex', gap: '4px' }}><span style={{ fontSize: '13px', color: '#64748b' }}>يصرف لـ:</span><span style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '1px dashed #cbd5e1', flexGrow: 1 }}>{category?.name || 'عام'}</span></div>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '6mm', borderRadius: '4px', marginBottom: '8mm', textAlign: 'center' }}><p style={{ fontSize: '10px', color: '#64748b', marginBottom: '2mm' }}>مبلغ وقدره</p><h2 style={{ fontSize: '28px', fontWeight: '900', color: '#1d4ed8', margin: 0, tabularNums: true }}>{expense.amount.toLocaleString()} <span style={{ fontSize: '14px' }}>ريال يمني</span></h2></div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'start' }}><span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>وذلك مقابل:</span><span style={{ fontSize: '13px', lineHeight: '1.6', flexGrow: 1 }}>{expense.notes || 'مصروفات متنوعة.'}{expense.tags && expense.tags.length > 0 && ` [${expense.tags.join(' ')}]`}</span></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15mm', borderTop: '1px solid #f1f5f9', paddingTop: '10mm' }}><div style={{ textAlign: 'center', width: '40%' }}><p style={{ margin: '0 0 12mm 0', fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>توقيع المستلم</p><div style={{ height: '0.3mm', width: '100%', backgroundColor: '#cbd5e1' }}></div></div><div style={{ textAlign: 'center', width: '40%' }}><p style={{ margin: '0 0 12mm 0', fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>المحاسب / المدير</p><div style={{ height: '0.3mm', width: '100%', backgroundColor: '#1e3a8a' }}></div></div></div>
          <p style={{ position: 'absolute', bottom: '4mm', left: '0', right: '0', textAlign: 'center', fontSize: '8px', color: '#94a3b8' }}>صدر هذا السند إلكترونياً عبر تطبيق صرف - {new Date().toLocaleTimeString('ar-YE')}</p>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetailView;
