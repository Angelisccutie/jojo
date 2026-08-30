import { useEffect, useRef } from 'react';

export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);
  const mousePos = useRef({ x: -400, y: -400 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(() => {
          if (glowRef.current) {
            glowRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0)`;
            if (glowRef.current.style.opacity !== '1') {
              glowRef.current.style.opacity = '1';
            }
          }
          rafId.current = null;
        });
      }
    };

    const handleMouseLeave = () => {
      if (glowRef.current) {
        glowRef.current.style.opacity = '0';
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden hidden sm:block"
      aria-hidden="true"
    >
      <div
        ref={glowRef}
        className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 opacity-0 pointer-events-none transition-opacity duration-300 ease-out"
        style={{
          willChange: 'transform',
          transform: 'translate3d(-400px, -400px, 0)',
        }}
      >
        {/* Soft, low-contrast diffuse ambient spot */}
        <div
          className="w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(214, 211, 209, 0.04) 0%, rgba(120, 113, 108, 0.02) 40%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </div>
    </div>
  );
}
