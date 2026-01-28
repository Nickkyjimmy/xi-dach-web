import type { Variants, Transition } from 'framer-motion'

// Standardized durations
export const durations = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  slower: 0.6,
} as const

// Standardized easing
export const easing = {
  easeOut: [0.16, 1, 0.3, 1],
  easeInOut: [0.65, 0, 0.35, 1],
  spring: { type: 'spring', stiffness: 300, damping: 25 },
  springGentle: { type: 'spring', stiffness: 200, damping: 20 },
} as const

// Fade In animation
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: durations.normal, ease: easing.easeOut }
  },
}

// Slide Up animation
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.normal, ease: easing.easeOut }
  },
}

// Slide Down animation
export const slideDown: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.normal, ease: easing.easeOut }
  },
}

// Scale In animation
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: durations.normal, ease: easing.easeOut }
  },
}

// Scale In with Spring
export const scaleInSpring: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: easing.springGentle as Transition
  },
}

// Stagger Children container
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

// Stagger Item (use with staggerContainer)
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.normal, ease: easing.easeOut }
  },
}

// Page transition
export const pageTransition: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: durations.slow, ease: easing.easeOut }
  },
  exit: {
    opacity: 0,
    transition: { duration: durations.fast }
  },
}

// Card hover effect (for interactive elements)
export const cardHover = {
  scale: 1.02,
  transition: { duration: durations.fast },
}

export const cardTap = {
  scale: 0.98,
}
