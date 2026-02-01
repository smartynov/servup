import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import { Shield, ArrowRight } from 'lucide-react'

export function WelcomeScreen() {
  const { setInitialized } = useStore()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-8 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">ServUp</h1>
          <p className="text-muted-foreground mt-2">Server setup made simple</p>
        </div>
        <div className="space-y-3 pt-4">
          <Button className="w-full" onClick={() => setInitialized(true)}>
            <ArrowRight className="h-4 w-4 mr-2" />Get Started
          </Button>
          <p className="text-xs text-muted-foreground">
            Your data is stored locally in the browser.<br />
            Encryption & sync coming soon.
          </p>
        </div>
      </div>
    </div>
  )
}
