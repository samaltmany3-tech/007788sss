import { describe, expect, it } from 'vitest';
import { getAiAvailability, requestAiJson } from '../utils/aiAvailability';

describe('getAiAvailability', () => {
  it('disables AI when no endpoint is configured', () => {
    expect(getAiAvailability()).toEqual({
      available: false,
      message: 'خدمة الذكاء الاصطناعي غير مهيأة في هذه النسخة',
    });
  });

  it('rejects insecure endpoints', () => {
    expect(getAiAvailability('http://example.com/ai').available).toBe(false);
  });

  it('accepts an HTTPS backend endpoint', () => {
    expect(getAiAvailability('https://example.com/ai')).toEqual({ available: true });
  });

  it('refuses AI requests without a secure endpoint before calling fetch', async () => {
    await expect(requestAiJson(undefined, { operation: 'test' })).rejects.toThrow(
      'خدمة الذكاء الاصطناعي غير مهيأة في هذه النسخة',
    );
  });
});
