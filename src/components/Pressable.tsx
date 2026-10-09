import { motion, type HTMLMotionProps } from 'framer-motion'
import { forwardRef } from 'react'

/** Button mit Press-Scale-Micro-Interaction. */
export const Pressable = forwardRef<HTMLButtonElement, HTMLMotionProps<'button'>>(function Pressable(
  { type = 'button', ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      {...props}
    />
  )
})
