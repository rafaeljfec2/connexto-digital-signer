import { useEffect, useState } from 'react';

import { PdfjsLib } from '../types';

type PdfjsWindow = Window & {
  pdfjsLib?: PdfjsLib;
};

type UsePdfEngineState = {
  readonly pdfjsLib: PdfjsLib | null;
  readonly isReady: boolean;
  readonly error: string | null;
};

let loadPromise: Promise<PdfjsLib> | null = null;

const SCRIPT_ID = 'pdfjs-loader-script';

const loadPdfjs = (): Promise<PdfjsLib> => {
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<PdfjsLib>((resolve, reject) => {
    const w = globalThis.window as PdfjsWindow | undefined;
    if (!w) {
      reject(new Error('PDF engine requires browser environment'));
      return;
    }

    if (w.pdfjsLib) {
      resolve(w.pdfjsLib);
      return;
    }

    if (document.getElementById(SCRIPT_ID)) {
      const onReady = () => {
        w.removeEventListener('pdfjsReady', onReady);
        if (w.pdfjsLib) {
          resolve(w.pdfjsLib);
        } else {
          reject(new Error('Failed to load PDF engine'));
        }
      };
      w.addEventListener('pdfjsReady', onReady);
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.type = 'module';
    script.src = '/pdfjs/loader.js';

    const onReady = () => {
      w.removeEventListener('pdfjsReady', onReady);
      if (w.pdfjsLib) {
        w.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
        resolve(w.pdfjsLib);
      } else {
        reject(new Error('Failed to load PDF engine'));
      }
    };
    w.addEventListener('pdfjsReady', onReady);

    script.onerror = () => {
      w.removeEventListener('pdfjsReady', onReady);
      reject(new Error('Failed to load PDF engine script'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
};

export const usePdfEngine = (): UsePdfEngineState => {
  const [pdfjsLib, setPdfjsLib] = useState<PdfjsLib | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    loadPdfjs()
      .then((lib) => {
        if (!isActive) {
          return;
        }
        setPdfjsLib(lib);
        setIsReady(true);
        setError(null);
      })
      .catch((err) => {
        if (!isActive) {
          return;
        }
        loadPromise = null;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setIsReady(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  return {
    pdfjsLib,
    isReady,
    error,
  };
};
