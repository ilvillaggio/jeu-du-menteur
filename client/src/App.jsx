import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SocketProvider } from './context/SocketContext'
import { GameProvider, useGame } from './context/GameContext'
import LobbyPage from './pages/LobbyPage'
import WaitingRoomPage from './pages/WaitingRoomPage'
import TeamSelectionPage from './pages/TeamSelectionPage'
import TeamRevealPage from './pages/TeamRevealPage'
import ChoicePage from './pages/ChoicePage'
import VotingPage from './pages/VotingPage'
import ResultsPage from './pages/ResultsPage'
import IntermissionPage from './pages/IntermissionPage'
import FinalPage from './pages/FinalPage'
import GameSocketBridge from './components/GameSocketBridge'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

function PhaseRouter() {
  const { phase } = useGame()

  const pages = {
    lobby:          <LobbyPage />,
    waiting:        <WaitingRoomPage />,
    team_selection: <TeamSelectionPage />,
    team_reveal:    <TeamRevealPage />,
    choice:         <ChoicePage />,
    voting:         <VotingPage />,
    results:        <ResultsPage />,
    intermission:   <IntermissionPage />,
    final:          <FinalPage />,
  }

  return (
    <>
      <GameSocketBridge />
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
