import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSocket } from '../context/SocketContext'
import Avatar from './Avatar'

function formatTime(at) {
  const d = new Date(at)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Chat partagé entre tous les membres d'un pacte mutuel.
// Réinitialisé à chaque nouvelle manche.
export default function PactChatDrawer({ open, onClose }) {
  const { players, playerId, myValidPartners, pactMessages, markPactRead } = useGame()
  const { socket } = useSocket()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const threadRef = useRef(null)

  const partnerPlayers = players.filter((p) => myValidPartners?.includes(p.id))
  const ordered = [...pactMessages].sort((a, b) => a.at - b.at)

  // Auto-scroll vers le bas à chaque nouveau message
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [ordered.length, open])

  // Marque comme lus quand on ouvre le drawer
  useEffect(() => {
    if (open) markPactRead()
  }, [open, ordered.length])

  function send() {
    const text = draft.trim()
    if (!text) return
    socket.emit('pact:send', { text }, (res) => {
      if (res?.error) {
        setError(res.error)
        setTimeout(() => setError(''), 2000)
        return
      }
      setDraft('')
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-noir/80 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 inset-x-0 z-50 flex flex-col bg-card border-t border-border rounded-t-3xl"
            style={{ maxHeight: '85vh', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
          >
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>

            <div className="px-6 pb-3 shrink-0 border-b border-border">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">🤝 Chat du pacte</h3>
                <span className="text-xs text-muted">— uniquement pour cette manche</span>
              </div>
              {partnerPlayers.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {partnerPlayers.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5 px-2 py-1 bg-teal/10 border border-teal/30 rounded-full">
                      <Avatar src={p.avatar} className="w-5 h-5 text-base" />
                      <span className="text-xs font-semibold text-teal-light">{p.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-xs mt-1">Aucun pacte mutuel pour cette manche.</p>
              )}
            </div>

            {/* Fil de discussion */}
            <div ref={threadRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-2">
              {ordered.length === 0 ? (
                <p className="text-center text-muted text-sm pt-8">
                  {partnerPlayers.length > 0
                    ? 'Aucun message. Lance la discussion !'
                    : 'Pas de chat sans pacte actif.'}
                </p>
              ) : (
                ordered.map((m) => {
                  const isMe = m.from === playerId
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${
                        isMe
                          ? 'bg-gold/20 border border-gold/30 text-white rounded-br-md'
                          : 'bg-surface border border-border text-white rounded-bl-md'
                      }`}>
                        {!isMe && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <Avatar src={m.fromAvatar} className="w-4 h-4 text-xs" />
                            <span className="text-[10px] font-bold text-teal-light">{m.fromName}</span>
                          </div>
                        )}
                        <p className="text-sm leading-snug break-words">{m.text}</p>
                        <p className="text-[10px] text-muted text-right mt-1">{formatTime(m.at)}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Champ de saisie */}
            {partnerPlayers.length > 0 && (
              <div className="px-4 py-3 border-t border-border shrink-0">
                {error && <p className="text-crimson-light text-xs mb-2 text-center">{error}</p>}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && send()}
                    maxLength={300}
                    placeholder="Négocie avec ton pacte…"
                    className="input flex-1"
                  />
                  <button
                    onClick={send}
                    disabled={!draft.trim()}
                    className="btn-gold px-4 disabled:opacity-30"
                  >
                    Envoyer
                  </button>
                </div>
              </div>
            )}

            <div className="px-6 pt-2 pb-1 shrink-0">
              <button onClick={onClose} className="btn-ghost w-full rounded-2xl min-h-[48px]">
                Fermer
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
