import { Reorder, useDragControls, type DragControls } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'

interface ReorderListProps<T extends { id: string }> {
  items: T[]
  sorting: boolean
  onReorder: (ids: string[]) => void
  renderItem: (item: T, dragControls: DragControls) => ReactNode
}

/** Liste, die im Sortiermodus per Griff (Drag & Drop, touch-tauglich) umsortiert werden kann. */
export function ReorderList<T extends { id: string }>({ items, sorting, onReorder, renderItem }: ReorderListProps<T>) {
  const [order, setOrder] = useState(items)
  useEffect(() => setOrder(items), [items])

  return (
    <Reorder.Group as="ul" axis="y" values={order} onReorder={setOrder} className="space-y-2.5">
      {order.map((item) => (
        <Row key={item.id} item={item} sorting={sorting} onDrop={() => onReorder(order.map((i) => i.id))}>
          {(controls) => renderItem(item, controls)}
        </Row>
      ))}
    </Reorder.Group>
  )
}

function Row<T>({ item, sorting, onDrop, children }: { item: T; sorting: boolean; onDrop: () => void; children: (c: DragControls) => ReactNode }) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      drag={sorting ? 'y' : false}
      onDragEnd={onDrop}
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileDrag={{ scale: 1.03, zIndex: 10, boxShadow: '0 20px 40px -12px rgb(0 0 0 / 0.3)' }}
      style={{ position: 'relative', borderRadius: 22 }}
    >
      {children(controls)}
    </Reorder.Item>
  )
}
