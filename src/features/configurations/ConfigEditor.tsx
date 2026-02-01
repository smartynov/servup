import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SkillEntryCard } from './SkillEntryCard'
import { AddSkillDialog } from './AddSkillDialog'
import { useState, useMemo } from 'react'
import { Plus, Play, ArrowLeft } from 'lucide-react'

export function ConfigEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { configurations, skills, updateConfiguration } = useStore()
  const [showAddSkill, setShowAddSkill] = useState(false)

  const config = configurations.find((c) => c.id === id)
  if (!config) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Configuration not found</p>
      </div>
    )
  }

  const existingSkillIds = config.entries.map((e) => e.skillId)

  // Group entries by skill category
  const groupedEntries = useMemo(() => {
    const groups = new Map<string, typeof config.entries>()
    const categoryOrder: string[] = []
    for (const entry of config.entries) {
      const skill = skills.find((s) => s.id === entry.skillId)
      const cat = skill?.category || 'other'
      if (!groups.has(cat)) {
        groups.set(cat, [])
        categoryOrder.push(cat)
      }
      groups.get(cat)!.push(entry)
    }
    return { groups, categoryOrder }
  }, [config.entries, skills])

  // Find repeatable skills that can have more entries added
  const repeatableSkills = useMemo(() => {
    const seen = new Set(config.entries.map((e) => e.skillId))
    return skills.filter((s) => s.repeatable && seen.has(s.id))
  }, [config.entries, skills])

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={config.name}
            onChange={(e) => updateConfiguration(config.id, { name: e.target.value })}
            className="text-lg font-semibold border-none shadow-none px-0 focus-visible:ring-0 flex-1"
          />
          <Select
            value={config.os}
            onChange={(e) => updateConfiguration(config.id, { os: e.target.value as 'debian' | 'redhat' })}
            options={[
              { value: 'debian', label: 'Debian / Ubuntu' },
              { value: 'redhat', label: 'RHEL / CentOS' },
            ]}
            className="w-44"
          />
        </div>

        {/* Entries grouped by category */}
        {groupedEntries.categoryOrder.map((category) => {
          const entries = groupedEntries.groups.get(category)!
          return (
            <div key={category}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{category}</h3>
              <div className="space-y-2">
                {entries.map((entry) => {
                  const skill = skills.find((s) => s.id === entry.skillId)
                  if (!skill) return null
                  return <SkillEntryCard key={entry.id} configId={config.id} entry={entry} skill={skill} />
                })}
              </div>
              {/* "+ Add another" for repeatable skills in this category */}
              {repeatableSkills
                .filter((s) => s.category === category)
                .map((skill) => (
                  <AddRepeatableButton key={skill.id} configId={config.id} skill={skill} />
                ))}
            </div>
          )
        })}

        {/* Add skill button */}
        <Button variant="outline" className="w-full" onClick={() => setShowAddSkill(true)}>
          <Plus className="h-4 w-4 mr-2" />Add Skill
        </Button>

        {/* Generate button */}
        <Button className="w-full h-12 text-base" onClick={() => navigate(`/config/${config.id}/script`)}>
          <Play className="h-5 w-5 mr-2" />Generate Script
        </Button>
      </div>

      <AddSkillDialog
        open={showAddSkill}
        onClose={() => setShowAddSkill(false)}
        configId={config.id}
        existingSkillIds={existingSkillIds}
      />
    </div>
  )
}

function AddRepeatableButton({ configId, skill }: { configId: string; skill: { id: string; name: string } }) {
  const { addEntry } = useStore()
  return (
    <button
      className="mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1"
      onClick={() => addEntry(configId, skill.id)}
    >
      + Add another {skill.name}
    </button>
  )
}
