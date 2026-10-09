/** Platzhalter während die Datenbank lädt. */
export function LibrarySkeleton() {
  return (
    <div aria-busy="true" aria-label="Lädt" className="px-5 pt-4">
      <div className="mb-6 h-9 w-40 animate-pulse rounded-xl bg-surface-2" />
      <div className="space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3.5 rounded-[22px] border border-line bg-surface p-3">
            <div className="size-12 animate-pulse rounded-[14px] bg-surface-2" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-surface-2" />
              <div className="h-3 w-1/3 animate-pulse rounded-full bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
