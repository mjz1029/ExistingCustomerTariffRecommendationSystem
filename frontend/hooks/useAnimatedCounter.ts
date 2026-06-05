import { useState, useEffect } from 'react';

/**
 * Animated counter hook - animates a number from 0 to the target value.
 * Used for stats card animations.
 */
export function useAnimatedCounter(target: number, duration: number = 1200) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    let startTime: number | null = null;
    let frame: number;
    const animate = (now: number) => {
      if (!startTime) startTime = now;
      const progress = Math.min((now - startTime) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - progress, 3)) * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return count;
}
