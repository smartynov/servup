import { useStore } from '@/store'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useState, useMemo } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  configId: string
  existingSkillIds: string[]
}

export function AddSkillDialog({ open, onClose, configId, existingSkillIds }: Props) {
  const { skills, addEntry } = useStore()
  const [search, setSearch] = useState('')

  const availableSkills = useMemo(() => {
    return skills.filter((s) => {
      if (!s.repeatable && existingSkillIds.includes(s.id)) return false
      if (search) {
        const q = search.toLowerCase()
        return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
      }
      return true
    })
  }, [skills, existingSkillIds, search])

  const categories = useMemo(() => {
    const cats = new Map<string, typeof availableSkills>()
    for (const s of availableSkills) {
      if (!cats.has(s.category)) cats.set(s.category, [])
      cats.get(s.category)!.push(s)
    }
    return cats
  }, [availableSkills])

  const handleAdd = (skillId: string) => {
    addEntry(configId, skillId)
    const skill = skills.find(s => s.id === skillId)
    if (!skill?.repeatable) {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent onClose={onClose} className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Skill</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-2"
        />
        <div className="flex-1 overflow-auto mt-2 space-y-4">
          {[...categories.entries()].map(([category, catSkills]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{category}</h4>
              <div className="space-y-1">
                {catSkills.map((skill) => (
                  <button
                    key={skill.id}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
                    onClick={() => handleAdd(skill.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{skill.name}</span>
                      {skill.repeatable && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">multi</Badge>}
                    </div>
                    {skill.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{skill.description}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {availableSkills.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No skills available</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
