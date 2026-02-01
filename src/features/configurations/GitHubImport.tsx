import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { fetchGitHubKeys } from '@/core/github'
import { Loader2 } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onImport: (keys: string[]) => void
}

export function GitHubImport({ open, onClose, onImport }: Props) {
  const [username, setUsername] = useState('')
  const [keys, setKeys] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFetch = async () => {
    if (!username.trim()) return
    setLoading(true)
    setError('')
    setKeys([])
    try {
      const fetched = await fetchGitHubKeys(username.trim())
      if (fetched.length === 0) {
        setError('No public keys found for this user')
        return
      }
      setKeys(fetched)
      setSelected(new Set(fetched.map((_, i) => i)))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = () => {
    const selectedKeys = keys.filter((_, i) => selected.has(i))
    onImport(selectedKeys)
  }

  const toggleKey = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent onClose={onClose} className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import SSH Keys from GitHub</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex gap-2">
            <Input
              placeholder="GitHub username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
            />
            <Button onClick={handleFetch} disabled={loading || !username.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fetch'}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {keys.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-auto">
              {keys.map((key, i) => (
                <div key={i} className="flex items-start gap-2 p-2 border rounded text-xs font-mono">
                  <Checkbox checked={selected.has(i)} onCheckedChange={() => toggleKey(i)} />
                  <span className="break-all">{key.slice(0, 80)}...</span>
                </div>
              ))}
            </div>
          )}
          {keys.length > 0 && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleImport} disabled={selected.size === 0}>
                Import {selected.size} key{selected.size !== 1 ? 's' : ''}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
