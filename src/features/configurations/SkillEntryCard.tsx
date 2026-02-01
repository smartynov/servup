import type { SkillEntry, Skill, SkillParam } from '@/types'
import { useStore } from '@/store'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X, GripVertical, Github } from 'lucide-react'
import { useState } from 'react'
import { GitHubImport } from './GitHubImport'

interface Props {
  configId: string
  entry: SkillEntry
  skill: Skill
}

export function SkillEntryCard({ configId, entry, skill }: Props) {
  const { toggleEntry, removeEntry, updateEntry } = useStore()
  const [ghImportParam, setGhImportParam] = useState<string | null>(null)

  const handleParamChange = (paramId: string, value: string) => {
    updateEntry(configId, entry.id, {
      params: { ...entry.params, [paramId]: value },
    })
  }

  const opacityClass = !entry.enabled ? 'opacity-50' : ''

  return (
    <div className={'border rounded-lg p-3 transition-opacity ' + opacityClass}>
      <div className="flex items-start gap-2">
        <div className="mt-0.5 cursor-grab text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </div>
        <Checkbox
          checked={entry.enabled}
          onCheckedChange={() => toggleEntry(configId, entry.id)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{skill.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => removeEntry(configId, entry.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          {entry.enabled && skill.params.length > 0 && (
            <div className="mt-2 space-y-2">
              {skill.params.map((param) => (
                <ParamField
                  key={param.id}
                  param={param}
                  value={entry.params[param.id] ?? param.default}
                  onChange={(v) => handleParamChange(param.id, v)}
                  onGitHubImport={param.github_import ? () => setGhImportParam(param.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {ghImportParam && (
        <GitHubImport
          open={true}
          onClose={() => setGhImportParam(null)}
          onImport={(keys) => {
            const current = entry.params[ghImportParam] || ''
            const newVal = current ? current + '\n' + keys.join('\n') : keys.join('\n')
            handleParamChange(ghImportParam, newVal)
            setGhImportParam(null)
          }}
        />
      )}
    </div>
  )
}

function ParamField({ param, value, onChange, onGitHubImport }: {
  param: SkillParam
  value: string
  onChange: (value: string) => void
  onGitHubImport?: () => void
}) {
  if (param.type === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <Checkbox checked={value === 'true'} onCheckedChange={(c) => onChange(String(c))} />
        <Label className="text-xs">{param.label}</Label>
      </div>
    )
  }

  if (param.type === 'select' && param.options) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{param.label}</Label>
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          options={param.options.map((o) => ({ value: o, label: o }))}
        />
      </div>
    )
  }

  if (param.type === 'textarea') {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">{param.label}</Label>
          {onGitHubImport && (
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={onGitHubImport}>
              <Github className="h-3 w-3" />GitHub
            </Button>
          )}
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={param.label}
          rows={3}
          className="text-xs font-mono"
        />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{param.label}</Label>
      <Input
        type={param.type === 'number' ? 'number' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={param.label}
        className="h-8 text-sm"
      />
    </div>
  )
}
