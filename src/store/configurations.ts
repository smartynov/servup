import type { StateCreator } from 'zustand'
import type { Configuration, SkillEntry } from '@/types'
import { generateId } from '@/lib/utils'
import type { SkillsSlice } from './skills'

export interface ConfigurationsSlice {
  configurations: Configuration[]
  activeConfigId: string | null

  setConfigurations: (configs: Configuration[]) => void
  setActiveConfig: (id: string | null) => void
  createConfiguration: () => string
  duplicateConfiguration: (id: string) => string
  deleteConfiguration: (id: string) => void
  updateConfiguration: (id: string, updates: Partial<Omit<Configuration, 'id' | 'createdAt'>>) => void
  togglePin: (id: string) => void

  addEntry: (configId: string, skillId: string) => void
  removeEntry: (configId: string, entryId: string) => void
  updateEntry: (configId: string, entryId: string, updates: Partial<SkillEntry>) => void
  reorderEntries: (configId: string, fromIndex: number, toIndex: number) => void
  toggleEntry: (configId: string, entryId: string) => void
}

export const createConfigurationsSlice: StateCreator<
  ConfigurationsSlice & SkillsSlice,
  [],
  [],
  ConfigurationsSlice
> = (set, get) => ({
  configurations: [],
  activeConfigId: null,

  setConfigurations: (configs) => set({ configurations: configs }),
  
  setActiveConfig: (id) => set({ activeConfigId: id }),

  createConfiguration: () => {
    const id = generateId()
    const now = Date.now()
    const config: Configuration = {
      id,
      name: 'New Configuration',
      pinned: false,
      createdAt: now,
      updatedAt: now,
      os: 'debian',
      entries: [],
    }
    set((state) => ({
      configurations: [...state.configurations, config],
      activeConfigId: id,
    }))
    return id
  },

  duplicateConfiguration: (id) => {
    const state = get()
    const source = state.configurations.find((c) => c.id === id)
    if (!source) return id
    const newId = generateId()
    const now = Date.now()
    const copy: Configuration = {
      ...structuredClone(source),
      id: newId,
      name: `${source.name} (copy)`,
      pinned: false,
      createdAt: now,
      updatedAt: now,
      entries: source.entries.map((e) => ({ ...e, id: generateId() })),
    }
    set((state) => ({
      configurations: [...state.configurations, copy],
      activeConfigId: newId,
    }))
    return newId
  },

  deleteConfiguration: (id) => {
    set((state) => ({
      configurations: state.configurations.filter((c) => c.id !== id),
      activeConfigId: state.activeConfigId === id ? null : state.activeConfigId,
    }))
  },

  updateConfiguration: (id, updates) => {
    set((state) => ({
      configurations: state.configurations.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
      ),
    }))
  },

  togglePin: (id) => {
    set((state) => ({
      configurations: state.configurations.map((c) =>
        c.id === id ? { ...c, pinned: !c.pinned, updatedAt: Date.now() } : c
      ),
    }))
  },

  addEntry: (configId, skillId) => {
    const state = get()
    const skill = state.skills.find((s) => s.id === skillId)
    if (!skill) return

    const entry: SkillEntry = {
      id: generateId(),
      skillId,
      enabled: true,
      params: Object.fromEntries(skill.params.map((p) => [p.id, p.default])),
    }

    set((state) => ({
      configurations: state.configurations.map((c) => {
        if (c.id !== configId) return c
        const entries = [...c.entries]
        // Insert at position based on skill priority
        let insertIndex = entries.length
        for (let i = 0; i < entries.length; i++) {
          const entrySkill = state.skills.find((s) => s.id === entries[i].skillId)
          if (entrySkill && entrySkill.priority > skill.priority) {
            insertIndex = i
            break
          }
        }
        entries.splice(insertIndex, 0, entry)
        return { ...c, entries, updatedAt: Date.now() }
      }),
    }))
  },

  removeEntry: (configId, entryId) => {
    set((state) => ({
      configurations: state.configurations.map((c) =>
        c.id === configId
          ? { ...c, entries: c.entries.filter((e) => e.id !== entryId), updatedAt: Date.now() }
          : c
      ),
    }))
  },

  updateEntry: (configId, entryId, updates) => {
    set((state) => ({
      configurations: state.configurations.map((c) =>
        c.id === configId
          ? {
              ...c,
              entries: c.entries.map((e) => (e.id === entryId ? { ...e, ...updates } : e)),
              updatedAt: Date.now(),
            }
          : c
      ),
    }))
  },

  reorderEntries: (configId, fromIndex, toIndex) => {
    set((state) => ({
      configurations: state.configurations.map((c) => {
        if (c.id !== configId) return c
        const entries = [...c.entries]
        const [moved] = entries.splice(fromIndex, 1)
        entries.splice(toIndex, 0, moved)
        return { ...c, entries, updatedAt: Date.now() }
      }),
    }))
  },

  toggleEntry: (configId, entryId) => {
    set((state) => ({
      configurations: state.configurations.map((c) =>
        c.id === configId
          ? {
              ...c,
              entries: c.entries.map((e) =>
                e.id === entryId ? { ...e, enabled: !e.enabled } : e
              ),
              updatedAt: Date.now(),
            }
          : c
      ),
    }))
  },
})
