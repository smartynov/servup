import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/store'
import { validateSkillYaml } from '@/core/skills-parser'
import { saveImportedSkill } from '@/lib/db'
import { Upload, Link, Clipboard, Loader2 } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export function SkillImport({ open, onClose }: Props) {
  const { importSkill } = useStore()
  const [tab, setTab] = useState<'url' | 'file' | 'paste'>('paste')
  const [url, setUrl] = useState('')
  const [yaml, setYaml] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const doImport = async (yamlStr: string) => {
    const errors = validateSkillYaml(yamlStr)
    if (errors.length > 0) {
      setError(errors.join('\n'))
      return
    }
    try {
      const skill = importSkill(yamlStr)
      await saveImportedSkill(skill)
      onClose()
      setYaml('')
      setUrl('')
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleUrl = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError('')
    try {
      const resp = await fetch(url.trim())
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const text = await resp.text()
      await doImport(text)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setYaml(text)
    await doImport(text)
  }

  const handlePaste = async () => {
    await doImport(yaml)
  }

  const handleClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setYaml(text)
    } catch {
      setError('Failed to read clipboard')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent onClose={onClose} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Skill</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 mt-2">
          {(['paste', 'url', 'file'] as const).map((t) => (
            <Button key={t} variant={tab === t ? 'default' : 'ghost'} size="sm" onClick={() => { setTab(t); setError('') }}>
              {t === 'paste' && <><Clipboard className="h-3 w-3 mr-1" />Paste</>}
              {t === 'url' && <><Link className="h-3 w-3 mr-1" />URL</>}
              {t === 'file' && <><Upload className="h-3 w-3 mr-1" />File</>}
            </Button>
          ))}
        </div>

        <div className="space-y-3 mt-3">
          {tab === 'paste' && (
            <>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleClipboard}>
                  <Clipboard className="h-3 w-3 mr-1" />From clipboard
                </Button>
              </div>
              <Textarea
                value={yaml}
                onChange={(e) => setYaml(e.target.value)}
                placeholder="Paste YAML skill definition..."
                rows={10}
                className="font-mono text-xs"
              />
              <Button onClick={handlePaste} disabled={!yaml.trim()} className="w-full">Import</Button>
            </>
          )}
          {tab === 'url' && (
            <>
              <Input
                placeholder="https://raw.githubusercontent.com/.../skill.yaml"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <Button onClick={handleUrl} disabled={loading || !url.trim()} className="w-full">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Import from URL
              </Button>
            </>
          )}
          {tab === 'file' && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input type="file" accept=".yaml,.yml" onChange={handleFile} className="hidden" id="skill-file" />
              <label htmlFor="skill-file" className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                Click to select a .yaml file
              </label>
            </div>
          )}
          {error && <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
