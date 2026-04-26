// Petit utilitaire pour gérer le "token de session" du joueur (stocké en localStorage).
// Permet de reconnecter le joueur dans sa partie après un refresh.

const STORAGE_KEY = 'menteur:session'

function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

// Récupère ou crée un token de joueur (UUID stable côté navigateur).
export function getOrCreateToken() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj?.token) return obj.token
    }
  } catch {}
  const token = uuid()
  saveSession({ token })
  return token
}

// Sauvegarde une session (token + roomCode + playerName).
export function saveSession(patch) {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    const next = { ...current, ...patch }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {}
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch { return {} }
}

// Efface la salle/nom (mais garde le token pour la prochaine session).
export function clearRoom() {
  const cur = getSession()
  saveSession({ token: cur.token, roomCode: null, playerName: null })
}
