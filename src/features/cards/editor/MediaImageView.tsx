import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { ImageOff } from 'lucide-react'
import { useMediaUrl } from '../media'

export function MediaImageView({ node, selected, editor }: ReactNodeViewProps) {
  const mediaId = node.attrs.mediaId as string | null
  const url = useMediaUrl(mediaId ?? undefined)
  const src = mediaId ? url : (node.attrs.src as string | undefined)

  return (
    <NodeViewWrapper className="rte-image" data-drag-handle>
      {src ? (
        <img
          src={src}
          alt={(node.attrs.alt as string) ?? ''}
          draggable={false}
          className={selected && editor.isEditable ? 'ring-2 ring-accent' : ''}
        />
      ) : (
        <span className="flex h-24 items-center justify-center gap-2 rounded-xl bg-surface-2 text-[13px] text-ink-3">
          <ImageOff size={16} /> Bild wird geladen …
        </span>
      )}
    </NodeViewWrapper>
  )
}
