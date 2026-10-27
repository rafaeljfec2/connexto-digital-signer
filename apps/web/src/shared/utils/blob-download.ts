import { isAxiosError } from 'axios';

export const createObjectUrl = (blob: Blob): string => URL.createObjectURL(blob);

export const revokeObjectUrl = (url: string | null | undefined): void => {
  if (!url || !url.startsWith('blob:')) {
    return;
  }
  URL.revokeObjectURL(url);
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = createObjectUrl(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    revokeObjectUrl(url);
  }, 1000);
};

export const isNotFoundError = (error: unknown): boolean =>
  isAxiosError(error) && error.response?.status === 404;

export const fileDownloadName = (title: string | null | undefined, fallback: string): string => {
  if (title !== null && title !== undefined && title.length > 0) {
    return title;
  }
  return fallback;
};
