import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from '@/store'
import { ConfigSidebar } from '@/features/configurations/ConfigSidebar'
import { ConfigEditor } from '@/features/configurations/ConfigEditor'
import { ScriptView } from '@/features/script/ScriptView'
import { SkillsLibrary } from '@/features/skills/SkillsLibrary'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { WelcomeScreen } from '@/features/vault/WelcomeScreen'
import { Button } from '@/components/ui/button'
import { Settings, BookOpen, Server } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const isSkills = location.pathname === '/skills'
  const isSettings = location.pathname === '/settings'

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <header className="h-12 border-b flex items-center justify-between px-4 shrink-0">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 font-bold text-lg hover:opacity-80">
          <Server className="h-5 w-5" />
          ServUp
        </button>
        <div className="flex items-center gap-1">
          <Button
            variant={isSkills ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => navigate('/skills')}
          >
            <BookOpen className="h-4 w-4 mr-1" />Skills
          </Button>
          <Button
            variant={isSettings ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => navigate('/settings')}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {!isSkills && !isSettings && <ConfigSidebar />}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/config/:id" element={<ConfigEditor />} />
          <Route path="/config/:id/script" element={<ScriptView />} />
          <Route path="/skills" element={<SkillsLibrary />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

function HomePage() {
  const { configurations, createConfiguration } = useStore()
  const navigate = useNavigate()

  if (configurations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Server className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h2 className="text-xl font-semibold">No configurations yet</h2>
            <p className="text-sm text-muted-foreground mt-1">Create your first server configuration</p>
          </div>
          <Button onClick={() => { const id = createConfiguration(); navigate(`/config/${id}`) }}>
            Create Configuration
          </Button>
        </div>
      </div>
    )
  }

  // If there's an active config or configs exist, show prompt to select
  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground">
      <p className="text-sm">Select a configuration from the sidebar</p>
    </div>
  )
}

function App() {
  const { initialized } = useStore()

  if (!initialized) {
    return <WelcomeScreen />
  }

  return (
    <HashRouter>
      <AppLayout />
    </HashRouter>
  )
}

export default App
