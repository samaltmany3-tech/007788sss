
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Category } from '../types';
import { 
  FolderPlus, 
  Search,
  Edit2,
  LayoutGrid,
  GripVertical
} from 'lucide-react';

interface CategoriesViewProps {
  onCategorySelect: (cat: Category) => void;
}

const PREDEFINED_COLORS = [
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#ef4444', '#f97316', 
  '#f59e0b', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
];

export default function CategoriesView({ onCategorySelect }: CategoriesViewProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryPhone, setNewCategoryPhone] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(PREDEFINED_COLORS[0]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const loadData = async () => {
    const cats = await db.categories.toArray();
    // فرز الأقسام حسب حقل order
    cats.sort((a, b) => (a.order || 0) - (b.order || 0));
    setCategories(cats);

    const expenses = await db.expenses.toArray();
    const totals: Record<string, number> = {};
    expenses.forEach(exp => {
      totals[exp.categoryId] = (totals[exp.categoryId] || 0) + exp.amount;
    });
    setCategoryTotals(totals);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveCategory = async () => {
    if (!newCategoryName.trim()) return;
    let phone = newCategoryPhone.trim().replace(/\D/g, '');
    if (phone.startsWith('0')) phone = phone.substring(1);
    
    if (editingCategory) {
      await db.categories.update(editingCategory.id, {
        name: newCategoryName, phoneNumber: phone || undefined, color: newCategoryColor
      });
    } else {
      await db.categories.add({
        id: Date.now().toString(), name: newCategoryName, 
        phoneNumber: phone || undefined, color: newCategoryColor, 
        order: categories.length // إضافة في نهاية الترتيب
      });
    }
    setIsModalOpen(false);
    loadData();
  };

  // وظائف السحب والإفلات
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;

    const newCategories = [...categories];
    const draggedItem = newCategories[draggedIndex];
    
    // سحب العنصر من مكانه القديم ووضعه في المكان الجديد
    newCategories.splice(draggedIndex, 1);
    newCategories.splice(index, 0, draggedItem);
    
    setCategories(newCategories);
    setDraggedIndex(index); // تحديث الـ index الحالي للعنصر المسحوب
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    // تحديث حقل الترتيب في قاعدة البيانات لجميع العناصر المتأثرة
    const updates = categories.map((cat, index) => {
      return db.categories.update(cat.id, { order: index });
    });
    await Promise.all(updates);
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
          <LayoutGrid size={22} className="text-blue-500" />
          أقسام المصروفات
        </h2>
        <button 
          onClick={() => { setEditingCategory(null); setNewCategoryName(''); setNewCategoryPhone(''); setIsModalOpen(true); }} 
          className="bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white p-2.5 rounded-2xl transition-all flex items-center gap-2 border border-blue-500/20 shadow-sm"
        >
          <FolderPlus size={18} />
          <span className="text-xs font-black">إضافة قسم</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-3.5 text-slate-500" size={18} />
        <input 
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl pr-10 pl-4 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner"
          placeholder="بحث سريع في الأقسام..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filteredCategories.map((cat, index) => (
          <div 
            key={cat.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => onCategorySelect(cat)}
            className={`bg-slate-900 border border-slate-800 rounded-3xl p-5 transition-all group relative cursor-pointer flex flex-col justify-between h-44 shadow-lg hover:border-slate-700 select-none ${
              draggedIndex === index 
                ? 'opacity-40 scale-95 border-blue-500 ring-2 ring-blue-500/20' 
                : 'opacity-100 scale-100'
            }`}
          >
            <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-40 transition-opacity cursor-grab active:cursor-grabbing">
               <GripVertical size={14} className="text-slate-500" />
            </div>

            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
              {!cat.isDefault && (
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setEditingCategory(cat); 
                    setNewCategoryName(cat.name); 
                    setNewCategoryPhone(cat.phoneNumber || ''); 
                    setNewCategoryColor(cat.color); 
                    setIsModalOpen(true); 
                  }} 
                  className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-white transition-colors"
                >
                  <Edit2 size={12}/>
                </button>
              )}
            </div>
            
            <div>
              <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center font-black text-white shadow-md transform group-hover:rotate-6 transition-transform" style={{ backgroundColor: cat.color }}>
                {cat.name.charAt(0)}
              </div>
              <h4 className="font-black text-slate-100 truncate text-base">{cat.name}</h4>
              {cat.phoneNumber && <p className="text-[10px] text-slate-500 mt-1 font-mono" dir="ltr">+{cat.phoneNumber}</p>}
            </div>
            
            <div className="mt-auto pt-2 border-t border-slate-800/50">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">إجمالي المنصرف</p>
              <p className="text-blue-400 font-black text-sm tabular-nums">
                {categoryTotals[cat.id]?.toLocaleString('ar-SA') || '٠'} 
                <span className="text-[10px] mr-1 text-slate-500">ر.ي</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-white">{editingCategory ? 'تعديل بيانات القسم' : 'إنشاء قسم مالي جديد'}</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">اسم القسم</label>
                <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-white shadow-inner" placeholder="مثال: بقالة، وقود، إيجار..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">رقم التواصل (اختياري)</label>
                <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-white shadow-inner" placeholder="رقم الهاتف بدون مفتاح الدولة..." value={newCategoryPhone} onChange={e => setNewCategoryPhone(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">لون القسم المميز</label>
                <div className="grid grid-cols-6 gap-3 pt-1">
                  {PREDEFINED_COLORS.map(c => (
                    <button key={c} onClick={() => setNewCategoryColor(c)} className={`w-8 h-8 rounded-full transition-all ${newCategoryColor === c ? 'ring-4 ring-white/30 scale-125 shadow-lg' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-6">
              <button onClick={handleSaveCategory} className="flex-grow bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-900/40 active:scale-95 transition-all">حفظ البيانات</button>
              <button onClick={() => setIsModalOpen(false)} className="px-6 bg-slate-800 text-slate-400 font-bold py-4 rounded-2xl active:scale-95 transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
