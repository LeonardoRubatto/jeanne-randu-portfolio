'use client';

// Adapted from the image-treatment/canvas-grid-mouse-effect reference.

import { useEffect, useRef } from 'react';

type CanvasMosaicProps = {
  src: string;
  alt: string;
  className?: string;
};

export function CanvasMosaic({ src, alt, className = '' }: CanvasMosaicProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const image = new Image();
    image.src = src;
    let frame = 0;
    let pointerX = -1000;
    let pointerY = -1000;
    let ready = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia('(pointer: coarse)');

    const draw = () => {
      if (!ready) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      context.clearRect(0, 0, width, height);
      const imageRatio = image.width / image.height;
      const canvasRatio = width / height;
      let sourceX = 0;
      let sourceY = 0;
      let sourceW = image.width;
      let sourceH = image.height;
      if (imageRatio > canvasRatio) {
        sourceW = image.height * canvasRatio;
        sourceX = (image.width - sourceW) / 2;
      } else {
        sourceH = image.width / canvasRatio;
        sourceY = (image.height - sourceH) / 2;
      }

      if (reduced.matches || coarse.matches) {
        context.drawImage(image, sourceX, sourceY, sourceW, sourceH, 0, 0, width, height);
        return;
      }

      context.fillStyle = '#11120f';
      context.fillRect(0, 0, width, height);
      const tile = Math.max(14, Math.round(width / 42));
      const radius = width * 0.26;
      const localPointerX = pointerX * dpr;
      const localPointerY = pointerY * dpr;

      for (let y = 0; y < height; y += tile) {
        for (let x = 0; x < width; x += tile) {
          const distance = Math.hypot(x + tile / 2 - localPointerX, y + tile / 2 - localPointerY);
          const influence = Math.max(0, 1 - distance / radius);
          const scale = 0.14 + influence * 0.86;
          const size = tile * scale;
          const sx = sourceX + (x / width) * sourceW;
          const sy = sourceY + (y / height) * sourceH;
          const sw = (tile / width) * sourceW;
          const sh = (tile / height) * sourceH;
          context.drawImage(
            image,
            sx,
            sy,
            sw,
            sh,
            x + (tile - size) / 2,
            y + (tile - size) / 2,
            size,
            size,
          );
        }
      }
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      schedule();
    };

    const onPointerLeave = () => {
      pointerX = canvas.clientWidth / 2;
      pointerY = canvas.clientHeight / 2;
      schedule();
    };

    image.onload = () => {
      ready = true;
      pointerX = canvas.clientWidth * 0.58;
      pointerY = canvas.clientHeight * 0.5;
      draw();
    };
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', schedule);
    reduced.addEventListener('change', schedule);
    coarse.addEventListener('change', schedule);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', schedule);
      reduced.removeEventListener('change', schedule);
      coarse.removeEventListener('change', schedule);
    };
  }, [src]);

  return (
    <span className="canvas-mosaic-frame">
      <canvas ref={canvasRef} className={className} aria-hidden="true" />
      <span className="sr-only">{alt}</span>
    </span>
  );
}
