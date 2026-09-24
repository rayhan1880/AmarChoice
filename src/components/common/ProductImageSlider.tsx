import { useState, useRef, TouchEvent, MouseEvent, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';

interface ProductImageSliderProps {
  images: string[];
  alt?: string;
  aspectRatio?: string;
  showThumbnails?: boolean;
  showDots?: boolean;
  className?: string;
  badge?: ReactNode;
  onImageClick?: () => void;
}

export default function ProductImageSlider({
  images,
  alt = 'Product Image',
  aspectRatio = 'aspect-square',
  showThumbnails = true,
  showDots = true,
  className = '',
  badge,
  onImageClick
}: ProductImageSliderProps) {
  // Ensure we have at least one valid image
  const validImages = images && images.length > 0
    ? images.filter(Boolean)
    : ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80'];

  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const prevSlide = (e?: MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
  };

  const nextSlide = (e?: MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
  };

  // Touch handlers for mobile finger swipe
  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;

    if (diff > minSwipeDistance) {
      // Swiped left -> next
      nextSlide();
    } else if (diff < -minSwipeDistance) {
      // Swiped right -> prev
      prevSlide();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div className={`flex flex-col gap-1.5 sm:gap-2 w-full min-w-0 max-w-full ${className}`}>
      {/* Main Slide Stage */}
      <div
        className={`relative ${aspectRatio} w-full min-w-0 bg-stone-100 rounded-xl sm:rounded-2xl overflow-hidden select-none group ${
          onImageClick ? 'cursor-pointer' : ''
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => onImageClick && onImageClick()}
      >
        <img
          key={currentIndex}
          src={validImages[currentIndex]}
          alt={`${alt} ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-all duration-300 animate-fadeIn"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80';
          }}
        />

        {/* Custom Badges (e.g. Discount, Hot, etc.) */}
        {badge && (
          <div className="absolute top-2 left-2 z-10 pointer-events-none">
            {badge}
          </div>
        )}

        {/* Multiple Image Counter Badge */}
        {validImages.length > 1 && (
          <div className="absolute bottom-2 right-2 z-10 bg-black/60 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-xs pointer-events-none">
            <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-stone-300" />
            <span>{currentIndex + 1}/{validImages.length}</span>
          </div>
        )}

        {/* Left / Right Arrow Buttons (Only when > 1 image) */}
        {validImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevSlide}
              className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/90 hover:bg-white text-stone-800 shadow-md backdrop-blur-xs flex items-center justify-center transition opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95"
              aria-label="Previous Image"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/90 hover:bg-white text-stone-800 shadow-md backdrop-blur-xs flex items-center justify-center transition opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95"
              aria-label="Next Image"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </>
        )}

        {/* Slide Indicator Dots (Mobile Overlay) */}
        {showDots && validImages.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-black/35 backdrop-blur-xs px-1.5 py-0.5 rounded-full pointer-events-none">
            {validImages.map((_, idx) => (
              <span
                key={idx}
                className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? 'w-3 sm:w-4 bg-white shadow-xs' : 'w-1 sm:w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Clickable Image Thumbnails Row */}
      {showThumbnails && validImages.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
          {validImages.map((img, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`relative w-14 h-14 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                  isActive
                    ? 'border-teal-600 scale-95 shadow-xs ring-2 ring-teal-500/20'
                    : 'border-stone-200 opacity-70 hover:opacity-100 hover:border-stone-300'
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=200&q=80';
                  }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
