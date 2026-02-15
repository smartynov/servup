import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Plus, Star, Trash2, Copy, MoreVertical } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function ConfigSidebar() {
  const { configurations, activeConfigId, createConfiguration, deleteConfiguration, duplicateConfiguration, togglePin, setActiveConfig } = useStore()
  const navigate = useNavigate()

  const sorted = [...configurations].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.updatedAt - a.updatedAt
  })

  const handleNew = () => {
    const id = createConfiguration()
    navigate('/config/' + id)
  }

  const handleSelect = (id: string) => {
    setActiveConfig(id)
    navigate('/config/' + id)
  }

  return (
    <div className="w-64 border-r bg-sidebar text-sidebar-foreground flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <h2 className="font-semibold text-sm">Configurations</h2>
        <Button variant="ghost" size="icon" onClick={handleNew} title="New configuration">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sorted.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">
              No configurations yet.<br />Click + to create one.
            </p>
          )}
          {sorted.map((config) => (
            <ConfigItem
              key={config.id}
              config={config}
              isActive={config.id === activeConfigId}
              onSelect={() => handleSelect(config.id)}
              onDuplicate={() => { const id = duplicateConfiguration(config.id); navigate('/config/' + id) }}
              onDelete={() => deleteConfiguration(config.id)}
              onTogglePin={() => togglePin(config.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

function ConfigItem({ config, isActive, onSelect, onDuplicate, onDelete, onTogglePin }: {
  config: { id: string; name: string; pinned: boolean; updatedAt: number; entries: { enabled: boolean }[] }
  isActive: boolean
  onSelect: () => void
  onDuplicate: () => void
  onDelete: () => void
  onTogglePin: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const enabledCount = config.entries.filter(e => e.enabled).length

  return (
    <div
      className={cn(
        'group relative rounded-md px-2 py-1.5 cursor-pointer text-sm',
        isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/50'
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-1.5">
        {config.pinned && <Star className="h-3 w-3 fill-current text-yellow-500 shrink-0" />}
        <span className="truncate flex-1">{config.name}</span>
        <div className="relative">
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-sidebar-border"
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-6 z-50 bg-popover border rounded-md shadow-md py-1 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
              <button className="w-full px-3 py-1.5 text-xs text-left hover:bg-accent flex items-center gap-2" onClick={() => { onTogglePin(); setShowMenu(false) }}>
                <Star className="h-3 w-3" />{config.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button className="w-full px-3 py-1.5 text-xs text-left hover:bg-accent flex items-center gap-2" onClick={() => { onDuplicate(); setShowMenu(false) }}>
                <Copy className="h-3 w-3" />Duplicate
              </button>
              <button className="w-full px-3 py-1.5 text-xs text-left hover:bg-accent text-destructive flex items-center gap-2" onClick={() => { onDelete(); setShowMenu(false) }}>
                <Trash2 className="h-3 w-3" />Delete
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">
        {enabledCount} skill{enabledCount !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
