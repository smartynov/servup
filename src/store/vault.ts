import type { StateCreator } from 'zustand'
import type { Theme } from '@/types'

export interface VaultSlice {
  vaultEnabled: boolean
  vaultUnlocked: boolean
  syncEnabled: boolean
  syncServerUrl: string
  theme: Theme
  initialized: boolean

  setVaultEnabled: (enabled: boolean) => void
  setVaultUnlocked: (unlocked: boolean) => void
  setSyncEnabled: (enabled: boolean) => void
  setSyncServerUrl: (url: string) => void
  setTheme: (theme: Theme) => void
  setInitialized: (initialized: boolean) => void
}

export const createVaultSlice: StateCreator<VaultSlice, [], [], VaultSlice> = (set) => ({
  vaultEnabled: false,
  vaultUnlocked: false,
  syncEnabled: false,
  syncServerUrl: '',
  theme: 'system',
  initialized: false,

  setVaultEnabled: (enabled) => set({ vaultEnabled: enabled }),
  setVaultUnlocked: (unlocked) => set({ vaultUnlocked: unlocked }),
  setSyncEnabled: (enabled) => set({ syncEnabled: enabled }),
  setSyncServerUrl: (url) => set({ syncServerUrl: url }),
  setTheme: (theme) => {
    set({ theme })
    // Apply theme to DOM
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.add(isDark ? 'dark' : 'light')
    } else {
      root.classList.add(theme)
    }
    localStorage.setItem('servup-theme', theme)
  },
  setInitialized: (initialized) => set({ initialized }),
})
