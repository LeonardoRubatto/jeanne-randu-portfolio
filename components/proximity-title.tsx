'use client';

// Adapted from text-effects/variable-font-cursor-proximity with an event-scoped loop.

import { useRef } from 'react';

type ProximityTitleProps = {
  text: string;
  className?: string;
};

export function ProximityTitle({ text, className = '' }: ProximityTitleProps) {
  const rootRef = useRef<HTMLSpanElement>(null);

  const reset = () => {
    rootRef.current?.querySelectorAll<HTMLElement>('[data-letter]').forEach((letter) => {
      letter.style.fontVariationSettings = "'wght' 470";
    });
  };

  const onPointerMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    rootRef.current?.querySelectorAll<HTMLElement>('[data-letter]').forEach((letter) => {
      const rect = letter.getBoundingClientRect();
      const distance = Math.hypot(
        event.clientX - (rect.left + rect.width / 2),
        event.clientY - (rect.top + rect.height / 2),
      );
      const weight = Math.round(470 + Math.max(0, 1 - distance / 160) * 280);
      letter.style.fontVariationSettings = `'wght' ${weight}`;
    });
  };

  return (
    <span
      ref={rootRef}
      className={className}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      aria-label={text}
    >
      {Array.from(text).map((letter, index) => (
        <span key={`${letter}-${index}`} data-letter aria-hidden="true">
          {letter === ' ' ? '\u00a0' : letter}
        </span>
      ))}
    </span>
  );
}
