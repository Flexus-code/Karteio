import type { HTMLMotionProps } from 'framer-motion'
import { Pressable } from './Pressable'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

const VARIANTS: Record<Variant, string> = {
  primary: 'accent-gradient text-white shadow-[0_8px_24px_-8px_var(--accent)]',
  secondary: 'bg-surface-2 text-ink',
  ghost: 'bg-transparent text-accent',
  danger: 'bg-danger/10 text-danger',
  success: 'bg-success text-white shadow-[0_8px_24px_-10px_var(--success)]',
}

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: Variant
  block?: boolean
}

export function Button({ variant = 'primary', block, className = '', ...props }: ButtonProps) {
  return (
    <Pressable
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-semibold disabled:opacity-50 ${VARIANTS[variant]} ${block ? 'w-full' : ''} ${className}`}
      {...props}
    />
  )
}
