import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SocketProvider } from './context/SocketContext'
import { GameProvider, useGame } from './context/GameContext'
import LobbyPage from './pages/LobbyPage'
import WaitingRoomPage from './pages/WaitingRoomPage'
import MissionRevealPage from './pages/MissionRevealPage'
import TeamSelectionPage from './pages/TeamSelectionPage'
import TeamRevealPage from './pages/TeamRevealPage'
import ChoicePage from './pages/ChoicePage'
import VotingPage from './pages/VotingPage'
import ResultsPage from './pages/ResultsPage'
import IntermissionPage from './pages/IntermissionPage'
import FinalPage from './pages/FinalPage'
import EliminatedPage from './pages/EliminatedPage'
import GameSocketBridge from './components/GameSocketBridge'
import MissionCelebration from './components/MissionCelebration'
import SpectatorDrawer from './components/SpectatorDrawer'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

function PhaseRouter() {
  const { phase, players, playerId } = useGame()
  const [spectatorOpen, setSpectatorOpen] = useState(false)

  // Si le joueur est éliminé : on lui retire seulement les écrans où il doit AGIR
  // (sélection d'équipe, choix d'action). Pour le reste, il observe la partie
  // normalement (révélations, résultats, classement, mini-film final).
  const me = players?.find((p) => p.id === playerId)
  const isEliminated = !!me?.eliminated
  const blockedForDead = isEliminated && (phase === 'team_selection' || phase === 'choice')

  const pages = {
    lobby:          <LobbyPage />,
    waiting:        <WaitingRoomPage />,
    mission_reveal: <MissionRevealPage />,
    team_selection: blockedForDead ? <EliminatedPage /> : <TeamSelectionPage />,
    team_reveal:    <TeamRevealPage />,
    choice:         blockedForDead ? <EliminatedPage /> : <ChoicePage />,
    voting:         <VotingPage />,
    results:        <ResultsPage />,
    intermission:   <IntermissionPage />,
    final:          <FinalPage />,
  }

  // Bandeau persistant en haut de l'écran quand le joueur est éliminé,
  // visible sur toutes les phases de partie (pas sur lobby/waiting/final).
  // Inclut team_selection et choice : le mort voit l'écran "éliminé" mais
  // peut quand même ouvrir les coulisses pour observer.
  const showDeadBanner = isEliminated &&
    phase !== 'lobby' && phase !== 'waiting' && phase !== 'final'

  return (
    <>
      <GameSocketBridge />
      <MissionCelebration />
      {showDeadBanner && (
        <button
          onClick={() => setSpectatorOpen(true)}
          className="fixed inset-x-0 top-0 z-40 bg-crimson/90 hover:bg-crimson text-white text-center text-xs font-bold tracking-wider uppercase py-1.5 backdrop-blur-sm border-b border-crimson-light/40 active:bg-crimson-light transition-colors"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)' }}
        >
          💀 Éliminé — Tape pour voir les coulisses 👁️
        </button>
      )}
      {isEliminated && (
        <SpectatorDrawer open={spectatorOpen} onClose={() => setSpectatorOpen(false)} />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3 }}
          className="min-h-screen"
          style={showDeadBanner ? { paddingTop: '24px' } : undefined}
        >
          {pages[phase] ?? <LobbyPage />}
        </motion.div>
      </AnimatePresence>
    </>
  )
}

export default function App() {
  return (
    <SocketProvider>
      <GameProvider>
        <PhaseRouter />
      </GameProvider>
    </SocketProvider>
  )
}
