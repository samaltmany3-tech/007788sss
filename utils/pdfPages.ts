export interface PageSlice {
  sourceY: number;
  sourceHeight: number;
}

export function calculatePageSlices(
  canvasWidth: number,
  canvasHeight: number,
  pageWidthMm: number,
  pageHeightMm: number,
  safeBreaks: number[] = [],
): PageSlice[] {
  if (canvasWidth <= 0 || canvasHeight <= 0 || pageWidthMm <= 0 || pageHeightMm <= 0) {
    throw new Error('أبعاد الصفحة غير صالحة');
  }
  const pixelsPerPage = Math.max(1, Math.floor((canvasWidth * pageHeightMm) / pageWidthMm));
  const slices: PageSlice[] = [];
  let sourceY = 0;
  while (sourceY < canvasHeight) {
    const desiredEnd = Math.min(canvasHeight, sourceY + pixelsPerPage);
    const safeEnd = safeBreaks
      .filter(point => point > sourceY && point <= desiredEnd)
      .sort((a, b) => b - a)[0];
    const pageEnd = desiredEnd === canvasHeight ? canvasHeight : (safeEnd ?? desiredEnd);
    slices.push({
      sourceY,
      sourceHeight: pageEnd - sourceY,
    });
    sourceY = pageEnd;
  }
  return slices;
}

export function sliceCanvas(source: HTMLCanvasElement, slice: PageSlice): HTMLCanvasElement {
  const pageCanvas = document.createElement('canvas');
  pageCanvas.width = source.width;
  pageCanvas.height = slice.sourceHeight;
  const context = pageCanvas.getContext('2d');
  if (!context) throw new Error('تعذر تجهيز صفحة التقرير');
  context.drawImage(
    source,
    0,
    slice.sourceY,
    source.width,
    slice.sourceHeight,
    0,
    0,
    source.width,
    slice.sourceHeight,
  );
  return pageCanvas;
}
