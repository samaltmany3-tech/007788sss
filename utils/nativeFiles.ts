import { Capacitor, registerPlugin } from '@capacitor/core';

export interface FileRequest {
  base64: string;
  fileName: string;
  mimeType: string;
}

export interface FileActionResult {
  uri: string;
  displayPath: string;
}

export interface DirectoryResult {
  uri: string;
  displayName: string;
}

export interface AndroidBridgePlugin {
  saveFile(options: FileRequest): Promise<FileActionResult>;
  viewFile(options: FileRequest): Promise<FileActionResult>;
  chooseDirectory(): Promise<DirectoryResult>;
  getDirectory(): Promise<DirectoryResult>;
}

interface FileServiceDependencies {
  isNative: boolean;
  plugin: AndroidBridgePlugin;
  document?: Document;
  openWindow?: (url: string) => Window | null;
}

export function dataUriToBase64(dataUri: string): string {
  const comma = dataUri.indexOf(',');
  if (comma < 0 || !dataUri.slice(0, comma).includes(';base64')) {
    throw new Error('صيغة الملف غير صالحة');
  }
  return dataUri.slice(comma + 1);
}

export function textToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}

export function createNativeFileService(deps: FileServiceDependencies) {
  return {
    async saveBase64File(request: FileRequest): Promise<FileActionResult> {
      if (deps.isNative) return deps.plugin.saveFile(request);
      if (!deps.document) throw new Error('تعذر الوصول إلى نظام تنزيل الملفات');

      const url = URL.createObjectURL(base64ToBlob(request.base64, request.mimeType));
      try {
        const link = deps.document.createElement('a');
        link.href = url;
        link.download = request.fileName;
        deps.document.body.appendChild(link);
        link.click();
        link.remove();
        return { uri: url, displayPath: request.fileName };
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    },

    async viewBase64File(request: FileRequest): Promise<FileActionResult> {
      if (deps.isNative) return deps.plugin.viewFile(request);
      const url = URL.createObjectURL(base64ToBlob(request.base64, request.mimeType));
      const opened = deps.openWindow?.(url);
      if (!opened) URL.revokeObjectURL(url);
      if (!opened) throw new Error('تعذر فتح الملف؛ اسمح بالنوافذ المنبثقة وحاول مجددًا');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return { uri: url, displayPath: request.fileName };
    },

    async chooseDirectory(): Promise<DirectoryResult> {
      if (!deps.isNative) throw new Error('اختيار المجلد متاح داخل تطبيق Android فقط');
      return deps.plugin.chooseDirectory();
    },

    async getDirectory(): Promise<DirectoryResult> {
      if (!deps.isNative) return { uri: '', displayName: 'مجلد التنزيلات' };
      return deps.plugin.getDirectory();
    },
  };
}

const androidBridge = registerPlugin<AndroidBridgePlugin>('AndroidBridge');

export const nativeFiles = createNativeFileService({
  isNative: Capacitor.isNativePlatform(),
  plugin: androidBridge,
  document: typeof document === 'undefined' ? undefined : document,
  openWindow: typeof window === 'undefined' ? undefined : (url) => window.open(url, '_blank', 'noopener,noreferrer'),
});
