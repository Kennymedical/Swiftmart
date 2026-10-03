'use client';

import { useState } from 'react';

interface ProductGalleryProps {
  images: string[];
  name: string;
}

export function ProductGallery({ images, name }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="relative aspect-square rounded-2xl bg-[#0A1931] border border-[#D4AF37]/25 overflow-hidden shadow-[0_4px_25px_rgba(212,175,55,0.1)] flex items-center justify-center text-[#8A94B0]">
        No image available
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedIndex(index);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % images.length;
      setSelectedIndex(nextIndex);
      const nextButton = document.getElementById(`thumb-${nextIndex}`);
      nextButton?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + images.length) % images.length;
      setSelectedIndex(prevIndex);
      const prevButton = document.getElementById(`thumb-${prevIndex}`);
      prevButton?.focus();
    }
  };

  return (
    <div className="space-y-3">
      {/* Primary Preview Frame */}
      <div
        className="relative aspect-square rounded-2xl bg-[#0A1931] border border-[#D4AF37]/25 overflow-hidden shadow-[0_4px_25px_rgba(212,175,55,0.1)]"
        aria-live="polite"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[selectedIndex] || images[0]}
          alt={`${name} - View ${selectedIndex + 1}`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div
          className="flex gap-2.5 overflow-x-auto pb-1"
          role="region"
          aria-label="Product thumbnails"
        >
          {images.map((img, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={idx}
                id={`thumb-${idx}`}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                aria-current={isSelected ? 'true' : undefined}
                aria-label={`View photo ${idx + 1} of ${images.length} for ${name}`}
                className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 transition-all focus:outline-none ${
                  isSelected
                    ? 'ring-2 ring-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.4)] scale-105'
                    : 'border border-[#D4AF37]/20 opacity-70 hover:opacity-100 hover:border-[#D4AF37]/50'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
