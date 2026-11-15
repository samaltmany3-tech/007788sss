
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { Category, Expense, AppSettings } from '../types';
import { X, Camera, Calendar, Trash2, Check, Star, Hash, Tag } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface AddExpenseViewProps {
  onClose: () => void;
  initialData?: Expense | null;
  preselectedCategoryId?: string;
}

const AddExpenseView: React.FC<AddExpenseViewProps> = ({ onClose, initialData, preselectedCategoryId }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [amount, setAmount] = useState(initialData?.amount.toString() || '');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || preselectedCategoryId || 'default_general');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [tagsInput, setTagsInput] = useState(initialData?.tags?.join(' ') || '');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [image, setImage] = useState<string | null>(initialData?.image || null);
  const [isFavorite, setIsFavorite] = useState(initialData?.isFavorite || false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    db.categories.toArray().then(setCategories);
    
    // جلب الوسوم المستخدمة سابقاً للاقتراح
    db.expenses.toArray().then(exps => {
      const allTags = exps.flatMap(e => e.tags || []);
      const uniqueTags = Array.from(new Set(allTags)).slice(0, 10);
      setSuggestedTags(uniqueTags);
    });

    if (!initialData && preselectedCategoryId) {
      setCategoryId(preselectedCategoryId);
    }
  }, [preselectedCategoryId, initialData]);

  const getDayName = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ar-YE', { weekday: 'long' });
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      alert('الرجاء إدخال مبلغ صحيح أكبر من صفر');
      return;
    }

    // تنظيف الوسوم وتحويلها لمصفوفة
    const tags = tagsInput
      .split(/[\s,،]+/)
      .filter(t => t.trim() !== '')
      .map(t => t.startsWith('#') ? t : `#${t}`);

    let serialNumber = initialData?.serialNumber;
    
    if (!initialData) {
      const settings = await db.settings.get('app_settings') as AppSettings;
      const nextSerial = (settings?.lastSerialNumber || 0) + 1;
      serialNumber = nextSerial;
      await db.settings.update('app_settings', { lastSerialNumber: nextSerial });
    }

    const expenseData: Expense = {
      id: initialData?.id || Date.now().toString(),
      amount: numAmount,
      categoryId,
      notes,
      tags,
      date,
      image: image || undefined,
      createdAt: initialData?.createdAt || Date.now(),
      serialNumber,
      isFavorite
    };

    if (initialData) {
      await db.expenses.put(expenseData);
    } else {
      await db.expenses.add(expenseData);
    }
    onClose();
  };

  const handleDeleteToTrash = async () => {
    if (initialData) {
      await db.trash.add(initialData);
      await db.expenses.delete(initialData.id);
      setIsConfirmOpen(false);
      onClose();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addSuggestedTag = (tag: string) => {
    const currentTags = tagsInput.split(/[\s,،]+/).filter(t => t.trim() !== '');
    if (!currentTags.includes(tag)) {
      setTagsInput(prev => (prev.trim() + ' ' + tag).trim());
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 py-2 -mx-4 px-4 border-b border-slate-800/50">
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
          <X size={24} />
        </button>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsFavorite(!isFavorite)}
            className={`p-2 transition-all active:scale-125 ${isFavorite ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-slate-600'}`}
          >
            <Star size={24} fill={isFavorite ? "currentColor" : "none"} />
          </button>
          <h2 className="text-lg font-bold text-slate-100">{initialData ? 'تعديل مصروف' : 'إضافة مصروف'}</h2>
        </div>
        <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-xl shadow-lg shadow-blue-900/40 active:scale-95 transition-all flex items-center gap-2">
          <Check size={18} />
          <span>حفظ</span>
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 px-1">المبلغ (ريال يمني)</label>
          <input 
            type="number" 
            pattern="[0-9]*"
            inputMode="decimal"
            autoFocus
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-6 text-4xl font-black text-center text-blue-500 outline-none focus:ring-2 focus:ring-blue-500 tabular-nums shadow-inner"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 px-1">القسم الضريبي / المالي</label>
          <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryId(cat.id)}
                className={`flex-shrink-0 px-6 py-2.5 rounded-2xl border transition-all text-sm font-bold ${
                  categoryId === cat.id 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/40' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 px-1">تاريخ العملية</label>
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-blue-500 transition-all gap-2">
              <div className="bg-blue-600/10 text-blue-500 px-4 py-3 rounded-xl text-xs font-black whitespace-nowrap border border-blue-500/10 select-none pointer-events-none">
                {getDayName(date)}
              </div>
              <input 
                type="date"
                className="flex-grow bg-transparent outline-none text-white font-bold px-2"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <Calendar className="text-slate-500 shrink-0 mx-2 pointer-events-none" size={20} />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 px-1">البيان / ملاحظات إضافية</label>
          <textarea 
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 resize-none h-28 text-sm font-medium"
            placeholder="اكتب تفاصيل المصروف هنا..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* حقل الوسوم (ذكرى) المحدث */}
        <div>
          <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 px-1 flex items-center gap-1">
            <Tag size={12} className="text-blue-500"/>
            ذكرى (اختياري)
          </label>
          <div className="relative">
            <input 
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pr-10 pl-4 py-4 text-sm font-bold text-blue-400 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
              placeholder=""
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
            <Hash className="absolute right-4 top-4 text-slate-500" size={18} />
          </div>
          
          {suggestedTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-[9px] text-slate-600 font-bold uppercase py-1.5 ml-1">اقتراحات:</span>
              {suggestedTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => addSuggestedTag(tag)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-[10px] font-bold transition-colors border border-slate-700/50"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 px-1">المرفقات والصور</label>
          {image ? (
            <div className="relative group rounded-2xl overflow-hidden border border-slate-800 aspect-video bg-slate-900 shadow-xl">
              <img src={image} className="w-full h-full object-contain" alt="Expense attachment" />
              <button onClick={() => setImage(null)} className="absolute top-3 right-3 bg-red-600 text-white p-2.5 rounded-xl shadow-lg active:scale-90 transition-all"><Trash2 size={18} /></button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 text-slate-500 hover:border-blue-500 hover:text-blue-500 transition-all active:scale-[0.98] bg-slate-900/50">
              <div className="p-4 bg-slate-800 rounded-2xl"><Camera size={32} /></div>
              <div className="text-center"><span className="font-bold text-sm block">تصوير فاتورة</span><span className="text-[10px] opacity-60">أو اختيار من الاستوديو</span></div>
            </button>
          )}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        </div>

        {initialData && (
          <div className="pt-4">
            <button onClick={() => setIsConfirmOpen(true)} className="w-full p-4 bg-red-600/10 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all font-bold flex items-center justify-center gap-2 border border-red-500/20 shadow-lg shadow-red-900/5"><Trash2 size={20} /><span>حذف السند (أرشفة بالسلة)</span></button>
          </div>
        )}
      </div>

      <ConfirmModal isOpen={isConfirmOpen} title="أرشفة السند" message="هل أنت متأكد من حذف هذا السند؟ سيتم نقله إلى سلة المهملات." onConfirm={handleDeleteToTrash} onCancel={() => setIsConfirmOpen(false)} />
    </div>
  );
};

export default AddExpenseView;
