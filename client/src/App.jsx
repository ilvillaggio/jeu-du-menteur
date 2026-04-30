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

  // Joueurs éliminés : on bascule sur EliminatedPage pour toutes les phases
  // de partie. EliminatedPage adapte son contenu (classement / pactes-actions /
  // résultats) selon la phase. Les phases hors-partie (lobby, waiting, final)
  // restent normales.
  const me = players?.find((p) => p.id === playerId)
  const isEliminated = !!me?.eliminated
  const inGamePhase = phase !== 'lobby' && phase !== 'waiting' && phase !== 'final'
  const showElim = isEliminated && inGamePhase

  const pages = {
    lobby:          <LobbyPage />,
    waiting:        <WaitingRoomPage />,
    mission_reveal: showElim ? <EliminatedPage /> : <MissionRevealPage />,
    team_selection: showElim ? <EliminatedPage /> : <TeamSelectionPage />,
    team_reveal:    showElim ? <EliminatedPage /> : <TeamRevealPage />,
    choice:         showElim ? <EliminatedPage /> : <ChoicePage />,
    voting:         showElim ? <EliminatedPage /> : <VotingPage />,
    results:        showElim ? <EliminatedPage /> : <ResultsPage />,
    intermission:   showElim ? <EliminatedPage /> : <IntermissionPage />,
    final:          <FinalPage />,
  }

  return (
    <>
      <GameSocketBridge />
      <MissionCelebration />
      <AnimatePresence mode="wait">
        <motion.div
          key={showElim ? 'elim' : phase}
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
