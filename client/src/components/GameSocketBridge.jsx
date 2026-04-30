import { useEffect } from 'react'
import { useSocket } from '../context/SocketContext'
import { useGame } from '../context/GameContext'
import { getOrCreateToken, getSession, clearRoom } from '../lib/session'

// Écoute tous les événements serveur et met à jour le GameContext
export default function GameSocketBridge() {
  const { socket } = useSocket()
  const { updateGame, setRoom, setPlayer, addWhisper, addPactMessage, clearPactMessages, phase } = useGame()

  // Auto-reconnect : si on a un roomCode + token en localStorage, on tente de retrouver la partie
  useEffect(() => {
    if (!socket) return
    function tryReconnect() {
      const session = getSession()
      const token = getOrCreateToken()
      if (!session.roomCode) return
      socket.emit('room:reconnect', { code: session.roomCode, token }, (res) => {
        if (res?.error) {
          // Salle ou joueur introuvable → on nettoie et on retourne au lobby
          clearRoom()
          updateGame({ phase: 'lobby' })
          return
        }
        // Reconnexion réussie : restaurer le state + identité
        setPlayer(res.state.playerId, session.playerName || 'Joueur')
        setRoom(res.roomCode)
        updateGame(res.state)
      })
    }
    socket.on('connect', tryReconnect)
    if (socket.connected) tryReconnect()
    return () => { socket.off('connect', tryReconnect) }
  }, [socket])

  useEffect(() => {
    if (!socket) return

    socket.on('game:state', (payload) => updateGame(payload))
    socket.on('game:phase', ({ phase }) => updateGame({ phase }))
    socket.on('game:votes', ({ count, total }) =>
      updateGame({ votesCount: count, totalPlayers: total })
    )
    socket.on('game:team_votes', ({ count, total }) =>
      updateGame({ teamVotesCount: count, totalPlayers: total })
    )
    socket.on('game:team_reveal', (payload) =>
      updateGame({
        phase: 'team_reveal',
        teamReveal: payload,
        myValidPartners: payload.pacts.filter(p => p.valid).map(p => p.id),
        isActive: payload.isActive,
      })
    )
    socket.on('game:results', (results) =>
      updateGame({ roundResults: results, phase: 'results' })
    )
    socket.on('game:intermission', ({ scores }) =>
      updateGame({ scores, phase: 'intermission', intermissionAckCount: 0 })
    )
    socket.on('game:final', (payload) =>
      updateGame({ ...payload, phase: 'final' })
    )
    socket.on('room:joined', ({ roomCode }) => setRoom(roomCode))
    socket.on('whisper:received', (whisper) => addWhisper({ ...whisper, read: false }))
    socket.on('pact:received', (msg) => addPactMessage({ ...msg, read: false }))
    socket.on('spectator:update', (data) => updateGame({ spectator: data }))

    return () => {
      socket.off('game:state')
      socket.off('game:phase')
      socket.off('game:votes')
      socket.off('game:team_votes')
      socket.off('game:team_reveal')
      socket.off('game:results')
      socket.off('game:intermission')
      socket.off('game:final')
      socket.off('room:joined')
      socket.off('whisper:received')
      socket.off('pact:received')
      socket.off('spectator:update')
    }
  }, [socket])

  // Reset le chat de pacte quand on entre dans la phase team_selection (nouvelle manche)
  useEffect(() => {
    if (phase === 'team_selection') clearPactMessages()
  }, [phase, clearPactMessages])

  return null
}
