/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import Hls from 'hls.js';

// Dedicated KeepSafe HLS ambient video stream
const HLS_STREAM_URL =
  'https://stream.mux.com/tLkHO1qZoaaQOUeVWo8hEBeGQfySP02EPS02BmnNFyXys.m3u8';

export function BackgroundAmbient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Parallax and subtle blur response on background elements during scroll
  const { scrollY } = useScroll();
  const bgGlowOpacity = useTransform(scrollY, [0, 400, 1000], [0.45, 0.25, 0.15]);
  const bgGlowY = useTransform(scrollY, [0, 1000], [0, -80]);
  const gridOpacity = useTransform(scrollY, [0, 600], [0.1, 0.04]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.loop = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('loop', '');

    let hlsInstance: Hls | null = null;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false,
        autoStartLoad: true,
        maxBufferLength: 30,
        lowLatencyMode: false,
      });
      hlsInstance = hls;

      hls.loadSource(HLS_STREAM_URL);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            video.muted = true;
            video.play().catch(() => {});
          });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setHasError(true);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = HLS_STREAM_URL;
      video.addEventListener('loadedmetadata', () => {
        video
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {});
      });
      video.addEventListener('error', () => {
        setHasError(true);
      });
    } else {
      setHasError(true);
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, []);

  return (
    <div
      id="keepsafe-ambient-background-layer"
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#0a0a0a] select-none"
      aria-hidden="true"
    >
      {/* 1. Full-Screen Ambient Video Texture Layer */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <video
          ref={videoRef}
          className={`w-full h-full object-cover transition-opacity duration-1000 ${
            isPlaying && !hasError ? 'opacity-[0.58]' : 'opacity-0'
          }`}
          muted
          autoPlay
          loop
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPlaying={() => setIsPlaying(true)}
          onLoadedData={() => setIsPlaying(true)}
        />

        {/* Fallback ambient subtle atmosphere when stream is offline/loading */}
        {(!isPlaying || hasError) && (
          <div
            className="absolute inset-0 w-full h-full opacity-60"
            style={{
              backgroundImage: `
                radial-gradient(ellipse at 50% 10%, rgba(87, 83, 78, 0.4) 0%, rgba(28, 25, 23, 0.25) 50%, rgba(10, 10, 10, 0.95) 100%),
                linear-gradient(135deg, rgba(41, 37, 36, 0.3) 0%, rgba(10, 10, 10, 0.85) 100%)
              `,
            }}
          />
        )}
      </div>

      {/* 2. Left-to-Right Dark Gradient Overlay (depth against #0a0a0a) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to right, #0a0a0a 0%, rgba(10, 10, 10, 0.85) 20%, rgba(10, 10, 10, 0.4) 50%, transparent 100%)',
        }}
      />

      {/* 3. Bottom-Up Dark Gradient Overlay (for text legibility) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, #0a0a0a 0%, rgba(10, 10, 10, 0.9) 22%, rgba(10, 10, 10, 0.45) 55%, transparent 100%)',
        }}
      />

      {/* 4. Top Vignette Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(10, 10, 10, 0.6) 0%, transparent 30%)',
        }}
      />

      {/* 5. Three Thin Vertical Grid Lines (white at ~10% opacity) at 25%, 50%, 75% marks across viewport */}
      <motion.div
        style={{ opacity: gridOpacity }}
        className="hidden sm:block absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-0 bottom-0 left-[25%] w-[1px] bg-white/10" />
        <div className="absolute top-0 bottom-0 left-[50%] w-[1px] bg-white/10" />
        <div className="absolute top-0 bottom-0 left-[75%] w-[1px] bg-white/10" />
      </motion.div>

      {/* 6. Large Horizontal SVG Ellipse Glow with Gaussian Blur and Scroll Parallax */}
      <motion.div
        style={{
          y: bgGlowY,
          opacity: bgGlowOpacity,
        }}
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none w-full max-w-6xl h-[360px] overflow-visible"
      >
        <svg
          viewBox="0 0 1200 360"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full overflow-visible"
        >
          <defs>
            <filter
              id="keepsafe-hero-glow-filter"
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
            >
              <feGaussianBlur stdDeviation="25" />
            </filter>
            <radialGradient
              id="keepsafe-hero-glow-radial"
              cx="50%"
              cy="20%"
              r="50%"
              fx="50%"
              fy="20%"
            >
              <stop offset="0%" stopColor="#e7e5e4" stopOpacity="0.45" />
              <stop offset="35%" stopColor="#a8a29e" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#57534e" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse
            cx="600"
            cy="50"
            rx="520"
            ry="110"
            fill="url(#keepsafe-hero-glow-radial)"
            filter="url(#keepsafe-hero-glow-filter)"
          />
        </svg>
      </motion.div>
    </div>
  );
}
