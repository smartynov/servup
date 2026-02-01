import yaml from 'js-yaml'
import type { Skill } from '@/types'

export function parseSkillYaml(raw: string): Skill {
  const data = yaml.load(raw) as Record<string, unknown>

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid YAML: not an object')
  }
  if (!data.id || typeof data.id !== 'string') {
    throw new Error('Invalid skill: missing or invalid "id"')
  }
  if (!data.name || typeof data.name !== 'string') {
    throw new Error('Invalid skill: missing or invalid "name"')
  }
  if (!data.scripts || typeof data.scripts !== 'object') {
    throw new Error('Invalid skill: missing "scripts"')
  }

  return {
    id: data.id as string,
    name: data.name as string,
    description: (data.description as string) || '',
    category: (data.category as string) || 'other',
    os: (data.os as ('debian' | 'redhat')[]) || ['debian'],
    priority: (data.priority as number) || 50,
    repeatable: (data.repeatable as boolean) || false,
    builtin: false,
    params: ((data.params as Array<Record<string, unknown>>) || []).map((p) => ({
      id: p.id as string,
      label: (p.label as string) || p.id as string,
      type: (p.type as 'string' | 'number' | 'boolean' | 'select' | 'textarea') || 'string',
      default: String(p.default ?? ''),
      required: p.required !== false,
      options: p.options as string[] | undefined,
      github_import: p.github_import as boolean | undefined,
    })),
    scripts: data.scripts as { debian?: string; redhat?: string },
  }
}

export function skillToYaml(skill: Skill): string {
  const obj: Record<string, unknown> = {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    category: skill.category,
    os: skill.os,
    priority: skill.priority,
    repeatable: skill.repeatable,
    params: skill.params.length > 0
      ? skill.params.map((p) => {
          const param: Record<string, unknown> = {
            id: p.id,
            type: p.type,
            label: p.label,
          }
          if (p.default) param.default = p.default
          if (p.required === false) param.required = false
          if (p.options) param.options = p.options
          if (p.github_import) param.github_import = true
          return param
        })
      : [],
    scripts: skill.scripts,
  }
  return yaml.dump(obj, { lineWidth: -1, noRefs: true })
}

export function validateSkillYaml(raw: string): string[] {
  const errors: string[] = []
  try {
    const data = yaml.load(raw) as Record<string, unknown>
    if (!data || typeof data !== 'object') {
      return ['Invalid YAML: not an object']
    }
    if (!data.id) errors.push('Missing "id" field')
    if (!data.name) errors.push('Missing "name" field')
    if (!data.scripts) errors.push('Missing "scripts" field')
    if (data.scripts && typeof data.scripts === 'object') {
      const scripts = data.scripts as Record<string, unknown>
      if (!scripts.debian && !scripts.redhat) {
        errors.push('Scripts must have at least one of "debian" or "redhat"')
      }
    }
  } catch (e) {
    errors.push(`YAML parse error: ${(e as Error).message}`)
  }
  return errors
}
