import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { generateScript } from '@/core/generator'
import { useMemo, useEffect, useRef } from 'react'
import { ArrowLeft, Copy, Download, Check } from 'lucide-react'
import { useState } from 'react'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import 'highlight.js/styles/github-dark.css'

hljs.registerLanguage('bash', bash)

export function ScriptView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { configurations, skills } = useStore()
  const [copied, setCopied] = useState(false)
  const codeRef = useRef<HTMLElement>(null)

  const config = configurations.find((c) => c.id === id)

  const script = useMemo(() => {
    if (!config) return ''
    return generateScript(config, skills)
  }, [config, skills])

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.textContent = script
      hljs.highlightElement(codeRef.current)
    }
  }, [script])

  if (!config) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Configuration not found
      </div>
    )
  }

  const enabledCount = config.entries.filter((e) => e.enabled).length

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([script], { type: 'text/x-shellscript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = config.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.sh'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/config/' + config.id)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold">{config.name}</h2>
            <p className="text-xs text-muted-foreground">{enabledCount} skill{enabledCount !== 1 ? 's' : ''} enabled &middot; {config.os}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />Download .sh
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-[#0d1117] p-4">
        <pre className="text-sm">
          <code ref={codeRef} className="language-bash" />
        </pre>
      </div>
      <div className="border-t p-3 text-xs text-muted-foreground text-center">
        Review the script before running. Execute with: <code className="bg-muted px-1 rounded">sudo bash setup.sh</code>
      </div>
    </div>
  )
}
