'use client';

import { useState } from 'react';
import { Package } from 'lucide-react';

interface AdminProductMediaProps {
  images?: string[];
  name: string;
}

export function AdminProductMedia({ images = [], name }: AdminProductMediaProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});

  const hasImages = images && images.length > 0;
  const currentImage = images[selectedIndex];
  const isCurrentFailed = failedImages[selectedIndex];

  return (
    <div className="space-y-3">
      <div className="aspect-square rounded-xl bg-[#0A1931] border border-[#D4AF37]/20 overflow-hidden flex items-center justify-center relative">
        {hasImages && !isCurrentFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentImage}
            alt={`${name} - View ${selectedIndex + 1}`}
            onError={() => setFailedImages((prev) => ({ ...prev, [selectedIndex]: true }))}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <Package className="w-14 h-14 text-[#A8B0C5]/40 mb-2" />
            <p className="text-xs text-[#A8B0C5]">
              {hasImages && isCurrentFailed ? 'Image unavailable' : 'No photo uploaded'}
            </p>
          </div>
        )}
      </div>

      {hasImages && images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((img, idx) => {
            const isFailed = failedImages[idx];
            const isSelected = selectedIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                aria-label={`View image ${idx + 1} for ${name}`}
                aria-current={isSelected ? 'true' : undefined}
                className={`aspect-square rounded-lg bg-[#0A1931] border overflow-hidden flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
                  isSelected
                    ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]'
                    : 'border-[#D4AF37]/15 opacity-70 hover:opacity-100'
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
                  <Package className="w-4 h-4 text-[#A8B0C5]/40" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
