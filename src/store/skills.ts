import type { StateCreator } from 'zustand'
import type { Skill } from '@/types'
import { builtinSkills, parseSkill } from '@/skills'

export interface SkillsSlice {
  skills: Skill[]

  setSkills: (skills: Skill[]) => void
  importSkill: (yamlString: string) => Skill
  deleteSkill: (id: string) => void
}

export const createSkillsSlice: StateCreator<SkillsSlice, [], [], SkillsSlice> = (set) => ({
  skills: builtinSkills,

  setSkills: (skills) => set({ skills }),

  importSkill: (yamlString) => {
    const skill = parseSkill(yamlString)
    skill.builtin = false
    set((state) => {
      const exists = state.skills.findIndex((s) => s.id === skill.id)
      if (exists >= 0) {
        const updated = [...state.skills]
        updated[exists] = skill
        return { skills: updated }
      }
      return { skills: [...state.skills, skill] }
    })
    return skill
  },

  deleteSkill: (id) => {
    set((state) => ({
      skills: state.skills.filter((s) => s.id !== id || s.builtin),
    }))
  },
})
