import { create } from 'zustand'
import { createConfigurationsSlice, type ConfigurationsSlice } from './configurations'
import { createSkillsSlice, type SkillsSlice } from './skills'
import { createVaultSlice, type VaultSlice } from './vault'
import { loadConfigurations, saveAllConfigurations, loadImportedSkills } from '@/lib/db'
import { builtinSkills } from '@/skills'
import type { Theme } from '@/types'

export type AppState = ConfigurationsSlice & SkillsSlice & VaultSlice

export const useStore = create<AppState>()((...a) => ({
  ...createConfigurationsSlice(...a),
  ...createSkillsSlice(...a),
  ...createVaultSlice(...a),
}))

// Persistence: auto-save configurations to IndexedDB
let saveTimeout: ReturnType<typeof setTimeout> | null = null

useStore.subscribe((state, prevState) => {
  if (state.configurations !== prevState.configurations) {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      saveAllConfigurations(state.configurations)
    }, 500)
  }
})

// Initialize store from IndexedDB
export async function initializeStore() {
  const [configs, importedSkills] = await Promise.all([
    loadConfigurations(),
    loadImportedSkills(),
  ])

  const allSkills = [...builtinSkills, ...importedSkills]

  // Load theme
  const savedTheme = localStorage.getItem('servup-theme') as Theme | null
  const theme = savedTheme || 'system'

  // Apply theme
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.add(isDark ? 'dark' : 'light')
  } else {
    root.classList.add(theme)
  }

  useStore.setState({
    configurations: configs,
    skills: allSkills,
    theme,
    initialized: true,
  })
}
