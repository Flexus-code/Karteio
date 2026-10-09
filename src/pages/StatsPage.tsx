import { BarChart3 } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'

export function StatsPage() {
  return (
    <>
      <PageHeader title="Statistik" />
      <EmptyState
        icon={BarChart3}
        title="Noch keine Daten"
        text="Lerne ein paar Karten – dann siehst du hier Fortschritt, Streak und deine Lern-Heatmap."
      />
    </>
  )
}
