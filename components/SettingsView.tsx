
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { AppSettings, RecurringReminder, Category, DraftExpense, Expense } from '../types';
import { 
  Download, 
  Upload, 
  Trash2, 
  Bell, 
  Plus, 
  X, 
  Wand2, 
  CheckCircle2, 
  AlertCircle, 
  FileSearch, 
  Smartphone,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  Zap,
  Check,
  Camera,
  Loader2,
  Sparkles,
  Star,
  ChevronRight,
  RotateCcw,
  Settings as SettingsIcon,
  AlignRight,
  Database,
  Folder
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { parseBackup } from '../utils/backup';
import { nativeFiles, textToBase64 } from '../utils/nativeFiles';
import { getAiAvailability, requestAiJson } from '../utils/aiAvailability';

const aiEndpoint = import.meta.env.VITE_AI_ENDPOINT as string | undefined;

interface SettingsViewProps { 
  onUpdateSettings: (s: AppSettings) => void; 
  installPrompt: any; 
  onInstallSuccess: () => void;
  onExpenseSelect?: (exp: Expense) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onUpdateSettings, installPrompt, onInstallSuccess, onExpenseSelect }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [reminders, setReminders] = useState<RecurringReminder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [drafts, setDrafts] = useState<DraftExpense[]>([]);
  
  // المميز والسلة
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [favoriteExpenses, setFavoriteExpenses] = useState<Expense[]>([]);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [trashExpenses, setTrashExpenses] = useState<Expense[]>([]);

  // حالات الفرز الذكي
  const [isSortingActive, setIsSortingActive] = useState(false);
  const [rawText, setRawText] = useState('');
  const [sortingDate, setSortingDate] = useState(new Date().toISOString().split('T')[0]);

  // حالات المسح الضوئي AI
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // حالات "ضرب عصفورين بحجر"
  const [isMultiAddActive, setIsMultiAddActive] = useState(false);
  const [multiAmount, setMultiAmount] = useState('');
  const [multiNote, setMultiNote] = useState('');
  const [multiDate, setMultiDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  
  const [confirmData, setConfirmData] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; isDanger?: boolean; confirmLabel?: string } | null>(null);
  
  const [isDataOptionsModalOpen, setIsDataOptionsModalOpen] = useState(false);
  const [downloadPathInput, setDownloadPathInput] = useState('');

  useEffect(() => {
    db.settings.get('app_settings').then(s => {
      if (s) {
        setSettings(s as AppSettings);
        setDownloadPathInput((s as AppSettings).customDownloadPath || '/storage/emulated/0/Download/eslam');
      }
    });
    loadData();

    nativeFiles.getDirectory()
      .then(result => setDownloadPathInput(result.displayName))
      .catch(() => undefined);
  }, []);

  const handleExportData = async () => {
    try {
      const allExpenses = await db.expenses.toArray();
      const allCategories = await db.categories.toArray();
      const allSettings = await db.settings.toArray();
      const allDrafts = await db.drafts.toArray();
      const allReminders = await db.reminders.toArray();
      const allTrash = await db.trash.toArray();
      
      const backupData = { 
        expenses: allExpenses, 
        categories: allCategories, 
        settings: allSettings, 
        drafts: allDrafts,
        reminders: allReminders,
        trash: allTrash
      };
      const json = JSON.stringify(backupData);
      
      const fileName = `sarf_backup_${new Date().toISOString().split('T')[0]}.json`;
      const result = await nativeFiles.saveBase64File({
        base64: textToBase64(json),
        fileName,
        mimeType: 'application/json',
      });
      alert(`تم حفظ النسخة الاحتياطية في:\n${result.displayPath}`);
    } catch (err) {
      console.error("Export Error:", err);
      alert('حدث خطأ أثناء تصدير البيانات المطلوبة.');
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonText = event.target?.result as string;
        const backupData = parseBackup(jsonText);

        setConfirmData({
          isOpen: true,
          title: 'استيراد البيانات',
          message: 'يُرجى الانتباه أن استيراد هذه النسخة سيقوم بحذف كافة بياناتك الحالية واستبدالها بالبيانات المحفوظة. هل توافق على المواصلة؟',
          confirmLabel: 'استيراد واستبدال',
          isDanger: true,
          onConfirm: async () => {
            try {
              await db.transaction('rw', [db.expenses, db.categories, db.settings, db.drafts, db.reminders, db.trash], async () => {
                await db.expenses.clear();
                if (backupData.expenses) await db.expenses.bulkAdd(backupData.expenses);
                
                await db.categories.clear();
                if (backupData.categories) await db.categories.bulkAdd(backupData.categories);
                
                await db.settings.clear();
                if (backupData.settings && backupData.settings.length > 0) {
                  await db.settings.put(backupData.settings[0], 'app_settings'); 
                }
                
                await db.drafts.clear();
                if (backupData.drafts) await db.drafts.bulkAdd(backupData.drafts);

                await db.reminders.clear();
                if (backupData.reminders) await db.reminders.bulkAdd(backupData.reminders);

                await db.trash.clear();
                if (backupData.trash) await db.trash.bulkAdd(backupData.trash);
              });
              setConfirmData(null);
              window.location.reload();
            } catch (txErr) {
              console.error(txErr);
              alert('فشل في كتابة البيانات للقاعدة. ' + (txErr as Error).message);
            }
          }
        });
      } catch (err) {
        console.error("Import Parse Error:", err);
        alert((err as Error).message || 'خطأ في قراءة ملف النسخة الاحتياطية.');
      }
      if (importInputRef.current) importInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // Reload favorites when the favorites modal is opened
  useEffect(() => {
    if (isFavoritesOpen) {
      loadFavorites();
    }
  }, [isFavoritesOpen]);

  const loadData = async () => {
    try {
      const [rems, drfs, cats, trashItems] = await Promise.all([
        db.reminders.toArray(),
        db.drafts.toArray(),
        db.categories.toArray(),
        db.trash.toArray()
      ]);
      setReminders(rems);
      setDrafts(drfs);
      setCategories(cats);
      setTrashExpenses(trashItems.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      
      await loadFavorites();
    } catch (err) {
      console.error("Error loading settings data:", err);
    }
  };

  const loadFavorites = async () => {
    try {
      // Use filter instead of indexed query to avoid 'bound' on IDBKeyRange errors with boolean keys on some Android versions
      const allExpenses = await db.expenses.toArray();
      const favs = allExpenses.filter(e => !!e.isFavorite).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setFavoriteExpenses(favs);
    } catch (err) {
      console.error("Error loading favorites:", err);
    }
  };

  const handleProcessSmartSort = async () => {
    if (!rawText.trim()) return;
    const availability = getAiAvailability(aiEndpoint);
    if (!availability.available) {
      alert(availability.message);
      return;
    }
    setIsScanning(true);
    try {
      const results = await requestAiJson<Array<{ amount: number; categoryName: string; notes: string }>>(aiEndpoint, {
        operation: 'sort_expenses',
        text: rawText,
        date: sortingDate,
      });
      
      if (Array.isArray(results) && results.length > 0) {
        const newDrafts: DraftExpense[] = results.map(r => ({
          id: Math.random().toString(36).substr(2, 9),
          categoryName: r.categoryName || 'عام',
          amount: r.amount || 0,
          notes: r.notes || 'فرز ذكي',
          date: sortingDate
        }));
        
        await db.drafts.bulkAdd(newDrafts);
        setRawText('');
        setIsSortingActive(false);
        loadData();
      }
    } catch (error) {
      console.error("Smart Sort Error:", error);
      alert((error as Error).message || "فشل تحليل النص. تأكد من جودة النص المدخل.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleRestoreRequest = (exp: Expense) => {
    setConfirmData({
      isOpen: true,
      title: 'استعادة السند',
      message: 'هل أنت متأكد من استعادة هذا السند؟ سيعود إلى سجل المصروفات الرئيسي فوراً بنفس رقمه السابق.',
      confirmLabel: 'استعادة الآن',
      isDanger: false,
      onConfirm: async () => {
        await db.expenses.add(exp);
        await db.trash.delete(exp.id);
        setConfirmData(null);
        loadData();
      }
    });
  };

  const handleDeleteForeverRequest = (id: string) => {
    setConfirmData({
      isOpen: true,
      title: 'حذف نهائي',
      message: 'هل أنت متأكد من حذف السند نهائياً؟ لا يمكن التراجع عن هذا الإجراء أبداً.',
      confirmLabel: 'حذف للأبد',
      isDanger: true,
      onConfirm: async () => {
        await db.trash.delete(id);
        setConfirmData(null);
        loadData();
      }
    });
  };

  const handleEmptyTrashRequest = () => {
    if (trashExpenses.length === 0) return;
    setConfirmData({
      isOpen: true,
      title: 'تفريغ السلة',
      message: 'هل أنت متأكد من تفريغ كافة محتويات السلة نهائياً؟ سيتم حذف جميع السندات المؤرشفة.',
      confirmLabel: 'تفريغ الكل',
      isDanger: true,
      onConfirm: async () => {
        await db.trash.clear();
        setConfirmData(null);
        loadData();
      }
    });
  };

  const handleAIScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const availability = getAiAvailability(aiEndpoint);
    if (!availability.available) {
      alert(availability.message);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsScanning(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('تعذر قراءة صورة الفاتورة'));
        reader.readAsDataURL(file);
      });
      const base64Data = dataUrl.split(',')[1];
      const result = await requestAiJson<{
        amount: number;
        date?: string;
        storeName?: string;
        descriptionArabic?: string;
        invoiceNumber?: string;
      }>(aiEndpoint, {
        operation: 'scan_receipt',
        image: { base64: base64Data, mimeType: file.type },
      });

      if (result.amount) {
        const formattedNoteParts = [
          result.descriptionArabic || 'مشتريات',
          result.storeName || 'محل غير معروف',
        ];
        if (result.invoiceNumber) formattedNoteParts.push(`رقم الفاتورة: ${result.invoiceNumber}`);
        if (result.date) formattedNoteParts.push(`تاريخ الفاتورة: ${result.date}`);

        await db.drafts.add({
          id: crypto.randomUUID(),
          categoryName: 'عام',
          amount: result.amount,
          notes: `[AI مسح] ${formattedNoteParts.join(' - ')}`,
          date: result.date || new Date().toISOString().split('T')[0],
        });
        await loadData();
      }
    } catch (error) {
      console.error("AI Scan Error:", error);
      alert((error as Error).message || "عذراً، فشل تحليل الفاتورة. تأكد من جودة الصورة.");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleProcessMultiAdd = async () => {
    const amountNum = parseFloat(multiAmount);
    if (!amountNum || selectedCatIds.length === 0) {
      alert('الرجاء إدخال المبلغ واختيار قسم واحد على الأقل');
      return;
    }

    const newDrafts: DraftExpense[] = selectedCatIds.map(id => {
      const cat = categories.find(c => c.id === id);
      return {
        id: Math.random().toString(36).substr(2, 9),
        categoryName: cat?.name || 'عام',
        amount: amountNum,
        notes: multiNote,
        date: multiDate 
      };
    });

    await db.drafts.bulkAdd(newDrafts);
    setMultiAmount('');
    setMultiNote('');
    setMultiDate(new Date().toISOString().split('T')[0]);
    setSelectedCatIds([]);
    setIsMultiAddActive(false);
    loadData();
  };

  const toggleCategorySelection = (id: string) => {
    setSelectedCatIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConvertDraft = async (draft: DraftExpense) => {
    const cat = categories.find(c => c.name === draft.categoryName) || categories[0];
    const settingsDoc = await db.settings.get('app_settings');
    const nextSerial = (settingsDoc?.lastSerialNumber || 0) + 1;
    
    const newExp: Expense = {
      id: Date.now().toString() + Math.random(),
      categoryId: cat.id,
      amount: draft.amount,
      date: draft.date,
      notes: draft.notes,
      createdAt: Date.now(),
      serialNumber: nextSerial
    };

    await db.expenses.add(newExp);
    await db.settings.update('app_settings', { lastSerialNumber: nextSerial });
    await db.drafts.delete(draft.id);
    loadData();
  };

  const handleDeleteDraft = async (id: string) => {
    await db.drafts.delete(id);
    loadData();
  };

  const handleClearAllData = () => {
    setConfirmData({
      isOpen: true,
      title: 'مسح شامل للبيانات',
      message: 'سيتم حذف جميع المصروفات، الأقسام، والإعدادات. هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmLabel: 'مسح كل شيء',
      isDanger: true,
      onConfirm: async () => {
        await Promise.all([
          db.expenses.clear(),
          db.categories.clear(),
          db.drafts.clear(),
          db.reminders.clear(),
          db.trash.clear(),
          db.settings.put({ showImages: true, showNotes: true, lastSerialNumber: 0 }, 'app_settings')
        ]);
        window.location.reload();
      }
    });
  };

  // Added handleInstallClick to fix the missing function error
  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      onInstallSuccess();
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-600/10 text-blue-500 rounded-2xl">
          <Smartphone size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold">الإعدادات والأدوات</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">تخصيص وإدارة حسابك المالي</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-400 flex items-center gap-2 px-1">
          <Sparkles size={16} className="text-blue-500" />
          أدوات الذكاء الاصطناعي
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="group relative bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[2rem] text-right overflow-hidden shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mt-16 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
            <div className="relative z-10 flex justify-between items-center">
              <div>
                <h4 className="text-lg font-black text-white mb-1">مسح الفواتير بالذكاء الاصطناعي</h4>
                <p className="text-[10px] text-blue-100 font-bold opacity-80">التقط صورة للفاتورة وسنتكفل بالباقي</p>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-xl border border-white/10">
                {isScanning ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
              </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAIScan} />
          </button>

          <button 
            onClick={() => setIsSortingActive(!isSortingActive)}
            className={`p-6 rounded-[2rem] text-right border transition-all active:scale-[0.98] ${isSortingActive ? 'bg-blue-600 border-blue-500 text-white shadow-blue-900/40' : 'bg-slate-900 border-slate-800 text-slate-100 hover:border-slate-700'}`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-lg font-black mb-1">أداة الفرز الذكي</h4>
                <p className={`text-[10px] font-bold opacity-80 ${isSortingActive ? 'text-blue-100' : 'text-slate-500'}`}>حوّل نصوص الواتساب والملاحظات إلى سندات</p>
              </div>
              <div className={`p-4 rounded-2xl ${isSortingActive ? 'bg-white/20' : 'bg-blue-600/10 text-blue-500'}`}>
                <AlignRight size={24} />
              </div>
            </div>
          </button>

          <button 
            onClick={() => setIsMultiAddActive(!isMultiAddActive)}
            className={`p-6 rounded-[2rem] text-right border transition-all active:scale-[0.98] ${isMultiAddActive ? 'bg-blue-600 border-blue-500 text-white shadow-blue-900/40' : 'bg-slate-900 border-slate-800 text-slate-100 hover:border-slate-700'}`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-lg font-black mb-1">ضرب عصفورين بحجر</h4>
                <p className={`text-[10px] font-bold opacity-80 ${isMultiAddActive ? 'text-blue-100' : 'text-slate-500'}`}>إضافة مصروف واحد لعدة أقسام في آن واحد</p>
              </div>
              <div className={`p-4 rounded-2xl ${isMultiAddActive ? 'bg-white/20' : 'bg-blue-600/10 text-blue-500'}`}>
                <Zap size={24} />
              </div>
            </div>
          </button>
        </div>
      </div>

      {isSortingActive && (
        <div className="bg-slate-900 border border-blue-500/30 rounded-[2rem] p-6 space-y-5 animate-in slide-in-from-top-4 duration-300 shadow-2xl">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">تاريخ السندات</label>
              <input 
                type="date"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-blue-500 outline-none focus:ring-2 focus:ring-blue-500"
                value={sortingDate}
                onChange={e => setSortingDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">الصق النص هنا</label>
              <textarea 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none h-40"
                placeholder="مثال: 
500 خبز
إيجار 50000
ماء 2000"
                value={rawText}
                onChange={e => setRawText(e.target.value)}
              />
            </div>
          </div>
          <button 
            onClick={handleProcessSmartSort}
            disabled={isScanning || !rawText.trim()}
            className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-xl shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isScanning ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
            <span>بدء الفرز الذكي والتحليل</span>
          </button>
        </div>
      )}

      {isMultiAddActive && (
        <div className="bg-slate-900 border border-blue-500/30 rounded-[2rem] p-6 space-y-6 animate-in slide-in-from-top-4 duration-300 shadow-2xl">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">المبلغ لكل قسم</label>
              <input 
                type="number" 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-2xl font-black text-blue-500 outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
                value={multiAmount}
                onChange={e => setMultiAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">البيان الموحد</label>
              <input 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                value={multiNote}
                onChange={e => setMultiNote(e.target.value)}
                placeholder="مثال: مشتريات شهرية للمنزل"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">الأقسام المستهدفة</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategorySelection(cat.id)}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${selectedCatIds.includes(cat.id) ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button 
            onClick={handleProcessMultiAdd}
            className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-xl shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={20} />
            <span>توزيع المصروف الآن</span>
          </button>
        </div>
      )}

      {drafts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-400 flex items-center gap-2 px-1">
            <FileSearch size={16} className="text-orange-500" />
            سندات بانتظار المراجعة ({drafts.length})
          </h3>
          <div className="space-y-3">
            {drafts.map(draft => {
              const catExists = categories.some(c => c.name === draft.categoryName);
              const displayCategoryName = catExists ? draft.categoryName : 'عام';
              return (
              <div key={draft.id} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex justify-between items-center group">
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-500 font-black text-base tabular-nums">{draft.amount.toLocaleString()}</span>
                    <span className="text-[9px] text-slate-600 font-bold uppercase">R.Y</span>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-bold">{displayCategoryName}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]">{draft.notes}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDeleteDraft(draft.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                  <button onClick={() => handleConvertDraft(draft)} className="bg-blue-600/10 text-blue-500 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition-all">اعتماد</button>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => setIsFavoritesOpen(true)}
          className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex flex-col items-center gap-3 active:scale-95 transition-all group"
        >
          <div className="p-3 bg-yellow-400/10 text-yellow-500 rounded-2xl group-hover:scale-110 transition-transform">
            <Star size={24} fill="currentColor" />
          </div>
          <span className="text-xs font-black">المميزة ({favoriteExpenses.length})</span>
        </button>
        <button 
          onClick={() => setIsTrashOpen(true)}
          className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex flex-col items-center gap-3 active:scale-95 transition-all group"
        >
          <div className="p-3 bg-red-600/10 text-red-500 rounded-2xl group-hover:scale-110 transition-transform">
            <Trash2 size={24} />
          </div>
          <span className="text-xs font-black">سلة المهملات ({trashExpenses.length})</span>
        </button>
      </div>

      {isFavoritesOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[150] flex flex-col p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-white flex items-center gap-3">
              <Star size={24} className="text-yellow-400" fill="currentColor" />
              السندات المميزة
            </h3>
            <button onClick={() => setIsFavoritesOpen(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
          <div className="flex-grow overflow-y-auto space-y-3 no-scrollbar pb-20">
            {favoriteExpenses.length > 0 ? favoriteExpenses.map(exp => (
              <div key={exp.id} onClick={() => { setIsFavoritesOpen(false); onExpenseSelect?.(exp); }} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center active:bg-slate-800 transition-all cursor-pointer">
                <div>
                  <p className="text-blue-400 font-black text-lg tabular-nums">{exp.amount.toLocaleString()} ر.ي</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">{exp.date} • {categories.find(c => c.id === exp.categoryId)?.name}</p>
                  {exp.notes && <p className="text-[10px] text-slate-600 mt-1 line-clamp-1">{exp.notes}</p>}
                </div>
                <ChevronRight size={18} className="text-slate-700 rotate-180" />
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                <Star size={64} className="opacity-10" />
                <p className="font-bold text-sm">لا توجد سندات مميزة حالياً</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isTrashOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[150] flex flex-col p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-3">
                <Trash2 size={24} className="text-red-500" />
                سلة المهملات
              </h3>
              <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">السندات المؤرشفة مؤقتاً</p>
            </div>
            <div className="flex gap-2">
              {trashExpenses.length > 0 && (
                <button onClick={handleEmptyTrashRequest} className="p-2 bg-red-600/10 text-red-500 rounded-full hover:bg-red-600 hover:text-white transition-all">
                  <RotateCcw size={20} />
                </button>
              )}
              <button onClick={() => setIsTrashOpen(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
          </div>
          <div className="flex-grow overflow-y-auto space-y-4 no-scrollbar pb-20">
            {trashExpenses.length > 0 ? trashExpenses.map(exp => (
              <div key={exp.id} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white font-black text-xl tabular-nums">{exp.amount.toLocaleString()} ر.ي</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">{exp.date} • {categories.find(c => c.id === exp.categoryId)?.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRestoreRequest(exp)} className="p-2 bg-blue-600/10 text-blue-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><RotateCcw size={16}/></button>
                    <button onClick={() => handleDeleteForeverRequest(exp.id)} className="p-2 bg-red-600/10 text-red-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><X size={16}/></button>
                  </div>
                </div>
                {exp.notes && <p className="text-xs text-slate-400 line-clamp-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">{exp.notes}</p>}
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                <Trash2 size={64} className="opacity-10" />
                <p className="font-bold text-sm">السلة فارغة حالياً</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-400 flex items-center gap-2 px-1">
          <Database size={16} className="text-blue-500" />
          إدارة البيانات
        </h3>
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden divide-y divide-slate-800 shadow-xl">
          
          <button onClick={handleExportData} className="w-full p-6 flex items-center gap-4 hover:bg-slate-800 transition-colors group">
            <div className="p-3 bg-green-600/10 text-green-500 rounded-2xl group-hover:bg-green-600 group-hover:text-white transition-all">
              <Download size={22} />
            </div>
            <div className="text-right">
              <h4 className="font-black text-slate-100">تصدير البيانات (نسخة احتياطية)</h4>
              <p className="text-[10px] text-slate-500">حفظ كافة بياناتك في ملف آمن</p>
            </div>
          </button>

          <button onClick={() => importInputRef.current?.click()} className="w-full p-6 flex items-center gap-4 hover:bg-slate-800 transition-colors group">
            <div className="p-3 bg-orange-600/10 text-orange-500 rounded-2xl group-hover:bg-orange-600 group-hover:text-white transition-all">
              <Upload size={22} />
            </div>
            <div className="text-right">
              <h4 className="font-black text-slate-100">استيراد البيانات</h4>
              <p className="text-[10px] text-slate-500">استرجاع بياناتك من ملف سابق</p>
            </div>
          </button>
          
          <input type="file" ref={importInputRef} accept=".json,application/json,text/plain,*/*" className="hidden" onChange={handleImportFileChange} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-400 flex items-center gap-2 px-1">
          <SettingsIcon size={16} className="text-blue-500" />
          إعدادات النظام
        </h3>
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden divide-y divide-slate-800 shadow-xl">
          {installPrompt && (
            <button onClick={handleInstallClick} className="w-full p-6 flex items-center justify-between group hover:bg-blue-600 transition-all duration-500">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600/10 text-blue-500 rounded-2xl group-hover:bg-white/20 group-hover:text-white transition-colors">
                  <Download size={22} />
                </div>
                <div className="text-right">
                  <h4 className="font-black text-slate-100 group-hover:text-white transition-colors">تثبيت التطبيق</h4>
                  <p className="text-[10px] text-slate-500 group-hover:text-blue-100 transition-colors">للوصول السريع وبدون إنترنت</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-700 rotate-180 group-hover:text-white transition-colors" />
            </button>
          )}

          <button onClick={() => setIsDataOptionsModalOpen(true)} className="w-full p-6 flex items-center justify-between group hover:bg-slate-800 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600/10 text-blue-500 rounded-2xl">
                <Folder size={22} />
              </div>
              <div className="text-right">
                <h4 className="font-black text-slate-100">خيارات حفظ البيانات</h4>
                <p className="text-[10px] text-slate-500">مسار الحفظ التلقائي للنسخ والكشوفات</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-slate-700 rotate-180" />
          </button>

          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-800 text-slate-400 rounded-2xl">
                <Layers size={22} />
              </div>
              <div className="text-right">
                <h4 className="font-black text-slate-100">عرض الملاحظات</h4>
                <p className="text-[10px] text-slate-500">إظهار البيان في القوائم الرئيسية</p>
              </div>
            </div>
            <button 
              onClick={() => {
                const newSettings = { ...settings!, showNotes: !settings?.showNotes };
                setSettings(newSettings);
                db.settings.put(newSettings, 'app_settings');
                onUpdateSettings(newSettings);
              }}
              className={`w-12 h-6 rounded-full transition-all relative ${settings?.showNotes ? 'bg-blue-600' : 'bg-slate-800'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings?.showNotes ? 'right-7' : 'right-1'}`} />
            </button>
          </div>

          <button onClick={handleClearAllData} className="w-full p-6 flex items-center gap-4 hover:bg-red-600/5 transition-colors group">
            <div className="p-3 bg-red-600/10 text-red-500 rounded-2xl group-hover:bg-red-600 group-hover:text-white transition-all">
              <Trash2 size={22} />
            </div>
            <div className="text-right">
              <h4 className="font-black text-red-500">مسح كافة البيانات</h4>
              <p className="text-[10px] text-slate-500">سيتم تصفير كافة السجلات والبدء من جديد</p>
            </div>
          </button>
        </div>
      </div>

      {confirmData && (
        <ConfirmModal 
          isOpen={confirmData.isOpen}
          title={confirmData.title}
          message={confirmData.message}
          confirmLabel={confirmData.confirmLabel}
          isDanger={confirmData.isDanger}
          onConfirm={confirmData.onConfirm}
          onCancel={() => setConfirmData(null)}
        />
      )}

      {isDataOptionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                <Folder size={20} className="text-blue-500" /> خيارات حفظ البيانات
              </h3>
              <button 
                onClick={() => setIsDataOptionsModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 px-1">مجلد حفظ البيانات التلقائي</label>
                <div 
                  className="relative group cursor-pointer"
                  onClick={async () => {
                    try {
                      const directory = await nativeFiles.chooseDirectory();
                      setDownloadPathInput(directory.displayName);
                    } catch (error) {
                      alert((error as Error).message || 'تعذر اختيار المجلد');
                    }
                  }}
                >
                  <input 
                    type="text" 
                    value={downloadPathInput}
                    readOnly
                    className="w-full bg-slate-950 border border-slate-800 text-white text-left font-mono rounded-xl p-3 pl-10 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm cursor-pointer"
                    dir="ltr"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-blue-500 transition-colors">
                    <Folder size={18} />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 px-1 leading-relaxed">
                  هذا هو المسار الذي سيتم حفظ النسخ الاحتياطية وملفات الـ PDF فيه داخل الجوال. اضغط على المربع لتحديد المجلد من داخل ملفاتك.
                </p>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => {
                    const newSettings = { ...settings!, customDownloadPath: downloadPathInput };
                    setSettings(newSettings);
                    db.settings.put(newSettings, 'app_settings');
                    onUpdateSettings(newSettings);
                    setIsDataOptionsModalOpen(false);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  حفظ التعديلات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
