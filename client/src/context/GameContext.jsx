import { createContext, useContext, useReducer, useCallback } from 'react'

const GameContext = createContext(null)

const initialState = {
  // Session locale
  playerId: null,
  playerName: null,
  roomCode: null,

  // État de la partie (reçu du serveur)
  phase: 'lobby',       // lobby | waiting | choice | voting | results | intermission | final
  round: 0,
  players: [],          // [{ id, name, avatar, role, score, ready, voted }]
  myMissions: [],       // [{ id, description, difficulty, completed }]
  myMissionScore: 0,    // Points bonus des missions (privé, visible uniquement par le joueur)
  myHistory: [],        // [{ round, action, mise, delta, chosen[], validPartners[] }] — parcours perso
  myChoice: null,       // { action, partners, mise }
  roundResults: null,
  scores: [],
  votesCount: 0,
  teamVotesCount: 0,
  totalPlayers: 0,
  totalRounds: 5,
  intermissionEndsAt: null,
  // Team selection
  teamReveal: null,       // { pacts: [{id,name,avatar,valid}], isActive }
  myValidPartners: [],    // IDs des partenaires mutuels
  isActive: true,         // false = hors-jeu ce tour

  // Messages privés
  whispers: [],           // [{ id, from, fromName, to, toName, text, at, read? }]
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PLAYER':
      return { ...state, playerId: action.id, playerName: action.name }
    case 'SET_ROOM':
      return { ...state, roomCode: action.code }
    case 'SET_PHASE':
      return { ...state, phase: action.phase }
    case 'UPDATE_GAME':
      return { ...state, ...action.payload }
    case 'SET_MY_CHOICE':
      return { ...state, myChoice: action.choice }
    case 'ADD_WHISPER':
      return { ...state, whispers: [...state.whispers, action.whisper] }
    case 'MARK_WHISPERS_READ':
      return {
        ...state,
        whispers: state.whispers.map((w) =>
          w.from === action.otherId || w.to === action.otherId ? { ...w, read: true } : w
        ),
      }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const setPlayer = useCallback((id, name) => dispatch({ type: 'SET_PLAYER', id, name }), [])
  const setRoom = useCallback((code) => dispatch({ type: 'SET_ROOM', code }), [])
  const updateGame = useCallback((payload) => dispatch({ type: 'UPDATE_GAME', payload }), [])
  const setMyChoice = useCallback((choice) => dispatch({ type: 'SET_MY_CHOICE', choice }), [])
  const addWhisper = useCallback((whisper) => dispatch({ type: 'ADD_WHISPER', whisper }), [])
  const markWhispersRead = useCallback((otherId) => dispatch({ type: 'MARK_WHISPERS_READ', otherId }), [])
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  return (
    <GameContext.Provider value={{ ...state, setPlayer, setRoom, updateGame, setMyChoice, addWhisper, markWhispersRead, reset }}>
      {children}
    </GameContext.Provider>
  )
}

export const useGame = () => useContext(GameContext)
