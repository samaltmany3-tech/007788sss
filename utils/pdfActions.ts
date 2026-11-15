import { dataUriToBase64, nativeFiles, type FileActionResult } from './nativeFiles';

export async function handlePdfAction(
  pdf: { output: (type: 'blob' | 'datauristring') => Blob | string },
  action: 'download' | 'view',
  fileName: string,
): Promise<FileActionResult> {
  const dataUri = pdf.output('datauristring') as string;
  const request = {
    base64: dataUriToBase64(dataUri),
    fileName,
    mimeType: 'application/pdf',
  };
  return action === 'view'
    ? nativeFiles.viewBase64File(request)
    : nativeFiles.saveBase64File(request);
}
