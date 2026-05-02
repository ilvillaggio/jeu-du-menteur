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
  totalRounds: 0, // 0 tant que le serveur n'a pas confirmé la vraie valeur
  intermissionAckCount: 0,
  teamRevealAckCount: 0,
  // Team selection
  teamReveal: null,       // { pacts: [{id,name,avatar,valid}], isActive }
  myValidPartners: [],    // IDs des partenaires mutuels
  isActive: true,         // false = hors-jeu ce tour

  // Messages privés
  whispers: [],           // [{ id, from, fromName, to, toName, text, at, read? }]
  // Chat du pacte (réinitialisé à chaque nouvelle manche)
  pactMessages: [],       // [{ id, from, fromName, fromAvatar, text, at, read? }]
  // Mode spectateur (uniquement quand le joueur est éliminé) : vue des coulisses
  spectator: null,        // { phase, round, pacts, solos, teamPicks, actions } | null
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
    case 'ADD_PACT_MESSAGE':
      return { ...state, pactMessages: [...state.pactMessages, action.message] }
    case 'CLEAR_PACT_MESSAGES':
      return { ...state, pactMessages: [] }
    case 'MARK_PACT_READ':
      return { ...state, pactMessages: state.pactMessages.map((m) => ({ ...m, read: true })) }
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
  const addPactMessage = useCallback((message) => dispatch({ type: 'ADD_PACT_MESSAGE', message }), [])
  const clearPactMessages = useCallback(() => dispatch({ type: 'CLEAR_PACT_MESSAGES' }), [])
  const markPactRead = useCallback(() => dispatch({ type: 'MARK_PACT_READ' }), [])
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  return (
    <GameContext.Provider value={{ ...state, setPlayer, setRoom, updateGame, setMyChoice, addWhisper, markWhispersRead, addPactMessage, clearPactMessages, markPactRead, reset }}>
      {children}
    </GameContext.Provider>
  )
}

export const useGame = () => useContext(GameContext)
