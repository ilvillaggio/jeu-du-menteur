import { useEffect } from 'react'
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

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

function PhaseRouter() {
  const { phase, players, playerId } = useGame()

  // Si le joueur est éliminé (score < 0), il voit l'écran "Éliminé" pour
  // toutes les phases actives (sauf le final où il voit son rang).
  const me = players?.find((p) => p.id === playerId)
  const isEliminated = !!me?.eliminated
  const showEliminatedScreen = isEliminated && (
    phase === 'team_selection' || phase === 'team_reveal' ||
    phase === 'choice' || phase === 'voting' ||
    phase === 'results' || phase === 'intermission'
  )

  const pages = {
    lobby:          <LobbyPage />,
    waiting:        <WaitingRoomPage />,
    mission_reveal: <MissionRevealPage />,
    team_selection: showEliminatedScreen ? <EliminatedPage /> : <TeamSelectionPage />,
    team_reveal:    showEliminatedScreen ? <EliminatedPage /> : <TeamRevealPage />,
    choice:         showEliminatedScreen ? <EliminatedPage /> : <ChoicePage />,
    voting:         showEliminatedScreen ? <EliminatedPage /> : <VotingPage />,
    results:        showEliminatedScreen ? <EliminatedPage /> : <ResultsPage />,
    intermission:   showEliminatedScreen ? <EliminatedPage /> : <IntermissionPage />,
    final:          <FinalPage />,
  }

  return (
    <>
      <GameSocketBridge />
      <MissionCelebration />
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3 }}
          className="min-h-screen"
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
