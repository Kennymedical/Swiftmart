'use client';

import { useState } from 'react';
import { Package } from 'lucide-react';

interface ProductGalleryProps {
  images?: string[];
  name: string;
}

export function ProductGallery({ images = [], name }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});

  const hasImages = images && images.length > 0;
  const currentImage = images[selectedIndex];
  const isCurrentFailed = failedImages[selectedIndex];

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (!images || images.length <= 1) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % images.length;
      setSelectedIndex(nextIndex);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + images.length) % images.length;
      setSelectedIndex(prevIndex);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedIndex(index);
    }
  }

  return (
    <div className="space-y-3">
      {/* Screen reader live region for announcing gallery view changes */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {hasImages
          ? `Showing photo ${selectedIndex + 1} of ${images.length} for ${name}`
          : 'No product photo available'}
      </div>

      {/* Main Image Display */}
      <div className="relative aspect-square rounded-2xl bg-[#0A1931] border border-[#D4AF37]/25 overflow-hidden shadow-[0_4px_25px_rgba(212,175,55,0.1)] flex items-center justify-center">
        {hasImages && !isCurrentFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentImage}
            alt={`${name} - View ${selectedIndex + 1}`}
            onError={() => setFailedImages((prev) => ({ ...prev, [selectedIndex]: true }))}
            className="w-full h-full object-cover transition duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#8A94B0] p-6 text-center">
            <Package className="w-16 h-16 text-[#A8B0C5]/40 mb-2" />
            <p className="text-sm font-medium">
              {hasImages && isCurrentFailed ? 'Image failed to load' : 'No image available'}
            </p>
          </div>
        )}
      </div>

      {/* Thumbnail Bar */}
      {hasImages && images.length > 1 && (
        <div
          role="region"
          aria-label="Product image gallery thumbnails"
          className="flex gap-2.5 overflow-x-auto pb-1.5 focus:outline-none"
        >
          {images.map((img, idx) => {
            const isSelected = selectedIndex === idx;
            const isFailed = failedImages[idx];
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                aria-current={isSelected ? 'true' : undefined}
                aria-label={`View photo ${idx + 1} of ${images.length} for ${name}`}
                className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1931] ${
                  isSelected
                    ? 'ring-2 ring-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.4)] scale-105'
                    : 'border border-[#D4AF37]/20 opacity-70 hover:opacity-100 hover:border-[#D4AF37]/50'
                }`}
              >
                {!isFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt=""
                    onError={() => setFailedImages((prev) => ({ ...prev, [idx]: true }))}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#0A1931] flex items-center justify-center">
                    <Package className="w-5 h-5 text-[#A8B0C5]/40" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
