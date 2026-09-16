'use client';
import { Upload } from 'tus-js-client';
import { communityRequest } from './community-client';

export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export async function optimizePhoto(file: File): Promise<File> {
  if (file.size > MAX_PHOTO_BYTES) throw new Error('Each photo must be 15 MB or smaller.');
  let source: Blob = file;
  if (/\.hei[cf]$/i.test(file.name) || /image\/hei[cf]/.test(file.type)) {
    try {
      const { default: convert } = await import('heic2any');
      const result = await convert({ blob: file, toType: 'image/jpeg', quality: 0.9 });
      source = Array.isArray(result) ? result[0] : result;
    } catch { throw new Error('This iPhone photo could not be converted. Export it as JPEG and try again.'); }
  }
  const url = URL.createObjectURL(source);
  try {
    const image = new Image(); image.src = url;
    try { await image.decode(); } catch { throw new Error('This photo format cannot be opened here. Export it as JPEG, PNG or WebP and try again.'); }
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not prepare this photo.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.86, 0.76, 0.66, 0.54, 0.42]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size < 1_000_000) return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
    }
    throw new Error('This photo is unusually detailed. Please crop it slightly and try again.');
  } finally { URL.revokeObjectURL(url); }
}

export async function uploadPhoto(file: File, onProgress: (value: number) => void): Promise<string> {
  const ticket = await communityRequest<{ path: string; token: string; endpoint: string }>('/api/community/uploads', { method: 'POST' });
  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: ticket.endpoint,
      headers: { 'x-signature': ticket.token },
      metadata: { bucketName: 'community-photos', objectName: ticket.path, contentType: 'image/jpeg', cacheControl: '3600' },
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
      uploadDataDuringCreation: true,
      storeFingerprintForResuming: false,
      onProgress: (sent, total) => onProgress(total ? Math.round(sent / total * 100) : 0),
      onError: () => reject(new Error('Photo upload paused after several retries. Check your connection and try posting again; your draft is still here.')),
      onSuccess: () => resolve(),
    });
    upload.start();
  });
  return ticket.path;
}
