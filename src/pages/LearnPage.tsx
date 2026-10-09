import { GraduationCap } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'

export function LearnPage() {
  return (
    <>
      <PageHeader title="Lernen" />
      <EmptyState
        icon={GraduationCap}
        title="Nichts zu lernen"
        text="Sobald du Karten angelegt hast, findest du hier deine fälligen Wiederholungen und alle Lernmodi."
      />
    </>
  )
}
