export interface Skill {
  id: string
  name: string
  description: string
  category: string
  os: ('debian' | 'redhat')[]
  priority: number
  repeatable: boolean
  builtin: boolean
  params: SkillParam[]
  scripts: {
    debian?: string
    redhat?: string
  }
}

export interface SkillParam {
  id: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea'
  default: string
  required?: boolean
  options?: string[]
  github_import?: boolean
}

export interface Configuration {
  id: string
  name: string
  pinned: boolean
  createdAt: number
  updatedAt: number
  os: 'debian' | 'redhat'
  entries: SkillEntry[]
}

export interface SkillEntry {
  id: string
  skillId: string
  enabled: boolean
  params: Record<string, string>
}

export type Theme = 'light' | 'dark' | 'system'
