// src/app/(tools)/favicon/utils.ts

/**
 * Resize an image file to the given width/height (square) using a canvas.
 * Returns a Blob containing the PNG data.
 */
export async function resizeImage(file: File, size: number): Promise<Blob> {
  const img = await loadImage(URL.createObjectURL(file));
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');
  // Draw image centered and scaled to fit
  ctx.drawImage(img, 0, 0, size, size);
  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) throw new Error('Canvas toBlob failed');
      resolve(blob);
    }, 'image/png');
  });
}

/** Load an image element from a URL and resolve when it finishes loading */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
    img.crossOrigin = 'anonymous';
  });
}

/** Generate a ZIP file containing all icons. Returns a Blob */
export async function generateZip(
  icons: { name: string; blob: Blob }[]
): Promise<Blob> {
  // JSZip is already a dependency
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  icons.forEach((icon) => {
    zip.file(icon.name, icon.blob);
  });
  const content = await zip.generateAsync({ type: 'blob' });
  return content;
}

/** Generate HTML <link> snippets for the provided icons */
export function generateHTMLSnippets(
  icons: { size: number; name: string }[],
  pathPrefix: string = ''
): string {
  const lines = icons.map(
    (icon) =>
      `<link rel="icon" type="image/png" sizes="${icon.size}x${icon.size}" href="${pathPrefix}${icon.name}" />`
  );
  return lines.join('\n');
}
