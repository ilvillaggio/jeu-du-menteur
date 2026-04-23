import { useEffect } from 'react'
import { useSocket } from '../context/SocketContext'
import { useGame } from '../context/GameContext'

// Écoute tous les événements serveur et met à jour le GameContext
export default function GameSocketBridge() {
  const { socket } = useSocket()
  const { updateGame, setRoom, addWhisper } = useGame()

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
    socket.on('game:intermission', ({ endsAt, scores }) =>
      updateGame({ intermissionEndsAt: endsAt, scores, phase: 'intermission' })
    )
    socket.on('game:final', (payload) =>
      updateGame({ ...payload, phase: 'final' })
    )
    socket.on('room:joined', ({ roomCode }) => setRoom(roomCode))
    socket.on('whisper:received', (whisper) => addWhisper({ ...whisper, read: false }))

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
    }
  }, [socket])

  return null
}
