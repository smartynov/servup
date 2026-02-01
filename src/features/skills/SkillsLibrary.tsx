import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useState, useMemo } from 'react'
import { Upload, Trash2, Download, Code, ChevronDown, ChevronRight } from 'lucide-react'
import { SkillImport } from './SkillImport'
import { skillToYaml } from '@/core/skills-parser'

export function SkillsLibrary() {
  const { skills, deleteSkill } = useStore()
  const [search, setSearch] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search) return skills
    const q = search.toLowerCase()
    return skills.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    )
  }, [skills, search])

  const categories = useMemo(() => {
    const cats = new Map<string, typeof filtered>()
    for (const s of filtered) {
      if (!cats.has(s.category)) cats.set(s.category, [])
      cats.get(s.category)!.push(s)
    }
    return cats
  }, [filtered])

  const handleExport = (skill: typeof skills[0]) => {
    const yamlStr = skillToYaml(skill)
    const blob = new Blob([yamlStr], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${skill.id}.yaml`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Skills Library</h1>
          <Button onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />Import Skill
          </Button>
        </div>

        <Input
          placeholder="Search skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {[...categories.entries()].map(([category, catSkills]) => (
          <div key={category}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{category}</h3>
            <div className="space-y-2">
              {catSkills.map((skill) => (
                <Card key={skill.id} className="overflow-hidden">
                  <CardHeader className="p-4 cursor-pointer" onClick={() => setExpandedSkill(expandedSkill === skill.id ? null : skill.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {expandedSkill === skill.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <CardTitle className="text-sm">{skill.name}</CardTitle>
                        {skill.repeatable && <Badge variant="secondary" className="text-[10px]">multi</Badge>}
                        {skill.builtin && <Badge variant="outline" className="text-[10px]">built-in</Badge>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleExport(skill) }}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        {!skill.builtin && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); deleteSkill(skill.id) }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <CardDescription className="ml-6">{skill.description}</CardDescription>
                  </CardHeader>
                  {expandedSkill === skill.id && (
                    <CardContent className="p-4 pt-0 ml-6">
                      <div className="text-xs space-y-2">
                        <div><strong>OS:</strong> {skill.os.join(', ')}</div>
                        <div><strong>Priority:</strong> {skill.priority}</div>
                        {skill.params.length > 0 && (
                          <div>
                            <strong>Parameters:</strong>
                            <ul className="mt-1 space-y-0.5">
                              {skill.params.map((p) => (
                                <li key={p.id} className="text-muted-foreground">
                                  {p.label} ({p.type}){p.default ? ` = ${p.default}` : ''}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {skill.scripts.debian && (
                          <div>
                            <strong className="flex items-center gap-1"><Code className="h-3 w-3" />Bash (Debian):</strong>
                            <pre className="mt-1 bg-muted rounded p-2 overflow-auto text-xs font-mono">
                              {skill.scripts.debian}
                            </pre>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))}

        <SkillImport open={importOpen} onClose={() => setImportOpen(false)} />
      </div>
    </div>
  )
}
