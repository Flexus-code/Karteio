import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, Undo2 } from 'lucide-react'
import { useEffect } from 'react'
import { useToastStore, type Toast } from '@/store/toast'

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+12px)] z-[60] flex flex-col items-center gap-2 px-4"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss)

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.durationMs)
    return () => clearTimeout(timer)
  }, [toast, dismiss])

  const Icon = toast.tone === 'success' ? CheckCircle2 : Info

  return (
    <motion.div
      layout
      role="status"
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 34 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => Math.abs(info.offset.x) > 80 && dismiss(toast.id)}
      className="pointer-events-auto flex w-full max-w-[420px] items-center gap-3 rounded-2xl bg-[#1c1c26] py-2.5 pl-4 pr-2 text-white shadow-lift dark:bg-[#2a2a36]"
    >
      <Icon size={18} className={toast.tone === 'success' ? 'text-green-400' : toast.tone === 'danger' ? 'text-rose-400' : 'text-white/70'} />
      <p className="min-h-9 flex-1 py-2 text-[14px] leading-snug">{toast.message}</p>
      {toast.action && (
        <button
          onClick={() => {
            void toast.action!.run()
            dismiss(toast.id)
          }}
          className="flex min-h-9 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-[13.5px] font-semibold"
        >
          <Undo2 size={15} /> {toast.action.label}
        </button>
      )}
    </motion.div>
  )
}
