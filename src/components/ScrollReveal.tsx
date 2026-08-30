/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'none';
  distance?: number;
}

/**
 * Premium, crisp scroll fade with micro-spring easing and zero blur.
 * Pure opacity and subtle translate curve.
 */
export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  distance = 24,
}: ScrollRevealProps) {
  const yOffset = direction === 'up' ? distance : direction === 'down' ? -distance : 0;

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: yOffset,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{ once: true, amount: 0.15, margin: '-40px' }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.22, 1, 0.36, 1], // Smooth cubic-bezier ease out
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Subtle scroll-linked parallax fade for section backgrounds or headers
 */
export function ScrollProgressFade({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 450], [1, 0.88]);

  return (
    <motion.div style={{ opacity }} className={className}>
      {children}
    </motion.div>
  );
}
