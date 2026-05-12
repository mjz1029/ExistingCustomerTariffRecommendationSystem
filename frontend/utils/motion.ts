import { useReducedMotion as useFramerReducedMotion } from 'framer-motion'
import type { Transition, Variants } from 'framer-motion'

export { useFramerReducedMotion as useReducedMotion }

/**
 * Returns a reduced-motion-safe transition config.
 * When the user prefers reduced motion, returns an instant transition.
 */
export function getTransition(normal: Transition): Transition {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return { duration: 0 }
  }
  return normal
}

/**
 * Returns reduced-motion-safe animation variants.
 * When the user prefers reduced motion, all states collapse to the final state instantly.
 */
export function getAnimation(normal: Variants): Variants {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return {
      initial: normal.animate ?? {},
      animate: normal.animate ?? {},
      exit: normal.animate ?? {},
    }
  }
  return normal
}
