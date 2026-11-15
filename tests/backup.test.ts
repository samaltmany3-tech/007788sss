import { describe, expect, it } from 'vitest';
import { parseBackup } from '../utils/backup';

const minimalBackup = {
  expenses: [],
  categories: [],
};

describe('parseBackup', () => {
  it('parses a valid backup and defaults optional collections', () => {
    expect(parseBackup(JSON.stringify(minimalBackup))).toEqual({
      expenses: [],
      categories: [],
      settings: [],
      drafts: [],
      reminders: [],
      trash: [],
    });
  });

  it('rejects malformed JSON', () => {
    expect(() => parseBackup('{broken')).toThrow('ملف النسخة الاحتياطية تالف');
  });

  it('rejects a backup missing required collections', () => {
    expect(() => parseBackup(JSON.stringify({ expenses: [] }))).toThrow(
      'ملف النسخة الاحتياطية غير متوافق',
    );
  });

  it('rejects invalid expense records', () => {
    const input = {
      ...minimalBackup,
      expenses: [{ id: 'x', amount: 'not-a-number' }],
    };
    expect(() => parseBackup(JSON.stringify(input))).toThrow(
      'بيانات المصروفات داخل النسخة غير صالحة',
    );
  });

  it('rejects optional collections with the wrong shape', () => {
    expect(() => parseBackup(JSON.stringify({ ...minimalBackup, drafts: {} }))).toThrow(
      'مجموعة drafts داخل النسخة غير صالحة',
    );
  });

  it('rejects invalid records in the trash collection', () => {
    expect(() => parseBackup(JSON.stringify({ ...minimalBackup, trash: [{ id: 'x' }] }))).toThrow(
      'بيانات سلة المهملات داخل النسخة غير صالحة',
    );
  });
});
