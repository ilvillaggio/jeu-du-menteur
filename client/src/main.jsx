import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Auto-reload quand le service worker se met à jour : dès qu'une nouvelle
// version est déployée (Vercel), le client se recharge automatiquement la
// prochaine fois qu'il revient au premier plan — plus besoin de fermer
// manuellement l'app pour vider le cache PWA.
if ('serviceWorker' in navigator) {
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
