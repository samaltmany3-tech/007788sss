import type {
  AppSettings,
  Category,
  DraftExpense,
  Expense,
  RecurringReminder,
} from '../types';

export interface BackupData {
  expenses: Expense[];
  categories: Category[];
  settings: AppSettings[];
  drafts: DraftExpense[];
  reminders: RecurringReminder[];
  trash: Expense[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isExpense = (value: unknown): value is Expense =>
  isObject(value) &&
  typeof value.id === 'string' &&
  typeof value.categoryId === 'string' &&
  typeof value.amount === 'number' &&
  Number.isFinite(value.amount) &&
  typeof value.date === 'string' &&
  typeof value.createdAt === 'number';

const isCategory = (value: unknown): value is Category =>
  isObject(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  typeof value.color === 'string' &&
  typeof value.order === 'number';

const isSettings = (value: unknown): value is AppSettings =>
  isObject(value) && typeof value.showImages === 'boolean' && typeof value.showNotes === 'boolean';

const isDraft = (value: unknown): value is DraftExpense =>
  isObject(value) &&
  typeof value.id === 'string' &&
  typeof value.categoryName === 'string' &&
  typeof value.amount === 'number' &&
  typeof value.notes === 'string' &&
  typeof value.date === 'string';

const isReminder = (value: unknown): value is RecurringReminder =>
  isObject(value) &&
  typeof value.id === 'string' &&
  typeof value.title === 'string' &&
  typeof value.amount === 'number' &&
  typeof value.categoryId === 'string' &&
  typeof value.dayOfMonth === 'number';

const optionalArray = <T>(
  value: unknown,
  name: string,
  validator: (item: unknown) => item is T,
): T[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`مجموعة ${name} داخل النسخة غير صالحة`);
  if (!value.every(validator)) throw new Error(`بيانات ${name} داخل النسخة غير صالحة`);
  return value;
};

export function parseBackup(text: string): BackupData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('ملف النسخة الاحتياطية تالف');
  }

  if (!isObject(raw) || !Array.isArray(raw.expenses) || !Array.isArray(raw.categories)) {
    throw new Error('ملف النسخة الاحتياطية غير متوافق');
  }
  if (!raw.expenses.every(isExpense)) {
    throw new Error('بيانات المصروفات داخل النسخة غير صالحة');
  }
  if (!raw.categories.every(isCategory)) {
    throw new Error('بيانات الأقسام داخل النسخة غير صالحة');
  }

  return {
    expenses: raw.expenses,
    categories: raw.categories,
    settings: optionalArray(raw.settings, 'settings', isSettings),
    drafts: optionalArray(raw.drafts, 'drafts', isDraft),
    reminders: optionalArray(raw.reminders, 'reminders', isReminder),
    trash: optionalArray(raw.trash, 'سلة المهملات', isExpense),
  };
}
