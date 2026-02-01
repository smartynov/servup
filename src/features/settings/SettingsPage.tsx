import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Sun, Moon, Monitor, Download, Upload, Trash2 } from 'lucide-react'
import { saveAllConfigurations } from '@/lib/db'
import type { Theme } from '@/types'

export function SettingsPage() {
  const { theme, setTheme, syncEnabled, syncServerUrl, setSyncEnabled, setSyncServerUrl, configurations, skills, setConfigurations } = useStore()

  const handleExport = () => {
    const data = { configurations, importedSkills: skills.filter(s => !s.builtin) }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'servup-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (data.configurations) {
        setConfigurations(data.configurations)
        await saveAllConfigurations(data.configurations)
      }
    } catch {
      alert('Invalid export file')
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Delete all configurations and imported skills? This cannot be undone.')) return
    setConfigurations([])
    await saveAllConfigurations([])
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>

        {/* Theme */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Theme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {([
                { value: 'light', icon: Sun, label: 'Light' },
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'system', icon: Monitor, label: 'System' },
              ] as const).map(({ value, icon: Icon, label }) => (
                <Button
                  key={value}
                  variant={theme === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme(value as Theme)}
                >
                  <Icon className="h-4 w-4 mr-1" />{label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sync */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sync your data to a server. Requires vault password (coming soon).
            </p>
            <div className="flex items-center gap-3">
              <Label className="text-sm">Server URL</Label>
              <Input
                value={syncServerUrl}
                onChange={(e) => setSyncServerUrl(e.target.value)}
                placeholder="https://sync.example.com"
                disabled={!syncEnabled}
                className="flex-1"
              />
            </div>
            <Button
              variant={syncEnabled ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setSyncEnabled(!syncEnabled)}
              disabled
            >
              {syncEnabled ? 'Disable Sync' : 'Enable Sync'} (coming soon)
            </Button>
          </CardContent>
        </Card>

        {/* Data */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />Export All
              </Button>
              <div>
                <input type="file" accept=".json" onChange={handleImport} className="hidden" id="import-file" />
                <Button variant="outline" size="sm" asChild>
                  <label htmlFor="import-file" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-1" />Import
                  </label>
                </Button>
              </div>
            </div>
            <Button variant="destructive" size="sm" onClick={handleClearAll}>
              <Trash2 className="h-4 w-4 mr-1" />Clear All Data
            </Button>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              ServUp v2 — Server setup generator.<br />
              Everything is a skill. Simple, private, extensible.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
