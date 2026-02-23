import { useCallback } from 'react';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  readOnly?: boolean;
}

/* 8-bit pixel star using uploaded asset */
function PixelStar({ filled, size = 20 }: { filled: boolean; size?: number }) {
  return (
    <img
      src="/star.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{
        imageRendering: 'pixelated',
        display: 'block',
        opacity: filled ? 1 : 0.5,
        filter: filled ? 'none' : 'grayscale(60%)',
      }}
    />
  );
}

export default function StarRating({ value, onChange, readOnly = false }: StarRatingProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, star: number) => {
      if (readOnly) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        onChange(Math.min(5, star + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        onChange(Math.max(1, star - 1));
      }
    },
    [readOnly, onChange]
  );

  if (readOnly) {
    return (
      <span className="star-display" aria-label={`${value} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} aria-hidden="true">
            <PixelStar filled={star <= value} />
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className="star-rating" role="radiogroup" aria-label="Session rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="star-btn"
          role="radio"
          aria-checked={star <= value}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          tabIndex={star === (value || 1) ? 0 : -1}
          onClick={() => onChange(star === value ? 0 : star)}
          onKeyDown={(e) => handleKeyDown(e, star)}
        >
          <PixelStar filled={star <= value} />
        </button>
      ))}
    </div>
  );
}

