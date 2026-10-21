'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';

interface LoaderContextValue {
  showLoader: (text?: string) => void;
  hideLoader: () => void;
}

const LoaderContext = createContext<LoaderContextValue | undefined>(undefined);

export function LoaderProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState('Processing...');
  const pendingCount = useRef(0);

  function showLoader(customText?: string) {
    if (customText) setText(customText);
    setVisible(true);
  }

  function hideLoader() {
    setVisible(false);
    setText('Processing...');
  }

  // Auto-detect: patches the browser's fetch once, so every network call
  // anywhere in the app (Supabase reads, Edge Function calls, everything)
  // automatically shows/hides this loader — no page has to call showLoader
  // itself. A counter handles overlapping requests correctly.
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      pendingCount.current += 1;
      setVisible(true);
      try {
        return await originalFetch(...args);
      } finally {
        pendingCount.current -= 1;
        if (pendingCount.current <= 0) {
          pendingCount.current = 0;
          setVisible(false);
        }
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <LoaderContext.Provider value={{ showLoader, hideLoader }}>
      {children}

      {visible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30">
          <div className="w-44 h-44 rounded-3xl bg-[#0F172A] shadow-2xl flex flex-col items-center justify-center">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full border-2 border-[#D4AF37] animate-ping opacity-60" />
              <span className="relative w-20 h-20 rounded-full border-2 border-[#D4AF37] flex items-center justify-center text-4xl">
                🛍️
              </span>
            </div>
            <p className="mt-4 text-[#D4AF37] font-semibold text-sm">{text}</p>
          </div>
        </div>
      )}
    </LoaderContext.Provider>
  );
}

export function useLoader() {
  const ctx = useContext(LoaderContext);
  if (!ctx) throw new Error('useLoader must be used inside <LoaderProvider>');
  return ctx;
  }

