import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeStore } from './store'

initializeStore()
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch((err) => {
    document.body.innerHTML = `
      <div style="padding: 2rem; font-family: system-ui, sans-serif;">
        <h1>Failed to initialize</h1>
        <p>Could not load data from browser storage.</p>
        <pre style="background: #f0f0f0; padding: 1rem; overflow: auto;">${err}</pre>
      </div>
    `
  })
