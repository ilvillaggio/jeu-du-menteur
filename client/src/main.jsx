import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Auto-reload quand le service worker se met à jour. On évite de reload en
// plein milieu d'une partie active (qui ferait perdre l'état du vote en
// cours). On reload uniquement si on est sur le lobby ou la salle d'attente.
if ('serviceWorker' in navigator) {
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    try {
      const session = JSON.parse(localStorage.getItem('menteur:session') || '{}')
      const inActiveGame = !!session.roomCode
      // Si on est en pleine partie, on diffère le reload : il s'appliquera au
      // prochain démarrage de l'app. On évite de couper un vote en cours.
      if (inActiveGame) return
    } catch {}
    refreshing = true
    window.location.reload()
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
