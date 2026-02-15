import type { StateCreator } from 'zustand'
import type { Theme } from '@/types'
import { applyTheme } from '@/lib/utils'

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
    applyTheme(theme)
    localStorage.setItem('servup-theme', theme)
  },
  setInitialized: (initialized) => set({ initialized }),
})
