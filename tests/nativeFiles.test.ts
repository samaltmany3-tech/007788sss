import { describe, expect, it, vi } from 'vitest';
import { createNativeFileService, dataUriToBase64, textToBase64 } from '../utils/nativeFiles';

describe('native file service', () => {
  it('extracts base64 content from a data URI', () => {
    expect(dataUriToBase64('data:application/pdf;base64,QUJD')).toBe('QUJD');
  });

  it('encodes Arabic backup text as UTF-8 base64', () => {
    expect(textToBase64('صرف')).toBe('2LXYsdmB');
  });

  it('routes save operations to the Android plugin and awaits its result', async () => {
    const saveFile = vi.fn().mockResolvedValue({
      uri: 'content://downloads/42',
      displayPath: 'Download/eslam/report.pdf',
    });
    const service = createNativeFileService({
      isNative: true,
      plugin: { saveFile, viewFile: vi.fn(), chooseDirectory: vi.fn(), getDirectory: vi.fn() },
    });

    const result = await service.saveBase64File({
      base64: 'QUJD',
      fileName: 'report.pdf',
      mimeType: 'application/pdf',
    });

    expect(saveFile).toHaveBeenCalledOnce();
    expect(result.displayPath).toBe('Download/eslam/report.pdf');
  });

  it('propagates a native save failure instead of reporting success', async () => {
    const service = createNativeFileService({
      isNative: true,
      plugin: {
        saveFile: vi.fn().mockRejectedValue(new Error('disk full')),
        viewFile: vi.fn(),
        chooseDirectory: vi.fn(),
        getDirectory: vi.fn(),
      },
    });

    await expect(
      service.saveBase64File({ base64: 'QQ==', fileName: 'a.pdf', mimeType: 'application/pdf' }),
    ).rejects.toThrow('disk full');
  });
});
