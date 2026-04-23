import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSocket } from '../context/SocketContext'
import Avatar from './Avatar'

function formatTime(at) {
  const d = new Date(at)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function WhispersDrawer({ open, onClose }) {
  const { players, playerId, whispers, addWhisper, markWhispersRead } = useGame()
  const { socket } = useSocket()

  const [activePeerId, setActivePeerId] = useState(null)
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState('')
  const threadRef = useRef(null)

  const others = players.filter((p) => p.id !== playerId)

  // Compteur de messages non-lus par interlocuteur
  const unreadBy = whispers.reduce((acc, w) => {
    if (w.to === playerId && !w.read) {
      acc[w.from] = (acc[w.from] || 0) + 1
    }
    return acc
  }, {})

  const activePeer = others.find((p) => p.id === activePeerId)

  // Fil de discussion avec l'interlocuteur actif
  const thread = whispers
    .filter((w) =>
      (w.from === playerId && w.to === activePeerId) ||
      (w.from === activePeerId && w.to === playerId)
    )
    .sort((a, b) => a.at - b.at)

  // Auto-scroll vers le bas à chaque nouveau message
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [thread.length, activePeerId])

  // Marque comme lus quand on ouvre le fil
  useEffect(() => {
    if (activePeerId) markWhispersRead(activePeerId)
  }, [activePeerId, thread.length])

  function openThread(peerId) {
    setActivePeerId(peerId)
    setDraft('')
    setSendError('')
  }

  function sendMessage() {
    const text = draft.trim()
    if (!text || !activePeerId) return
    socket.emit('whisper:send', { to: activePeerId, text }, (res) => {
      if (res?.error) return setSendError(res.error)
      if (res?.whisper) addWhisper({ ...res.whisper, read: true })
      setDraft('')
      setSendError('')
    })
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
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
            onClick={() => { setActivePeerId(null); onClose() }}
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

            {activePeer ? (
              <>
                {/* Header fil */}
                <div className="px-5 pb-3 shrink-0 flex items-center gap-3 border-b border-border">
                  <button
                    onClick={() => setActivePeerId(null)}
                    className="text-muted text-2xl w-10 h-10 rounded-xl active:bg-white/5 touch-manipulation"
                  >←</button>
                  <Avatar src={activePeer.avatar} className="w-9 h-9 text-2xl" />
                  <div className="flex-1">
                    <p className="text-white font-bold leading-tight">{activePeer.name}</p>
                    <p className="text-[10px] text-muted uppercase tracking-widest">Discussion privée</p>
                  </div>
                </div>

                {/* Fil scrollable */}
                <div ref={threadRef} className="overflow-y-auto overscroll-contain flex-1 px-5 py-3 flex flex-col gap-2 min-h-[180px]">
                  {thread.length === 0 ? (
                    <p className="text-muted text-sm text-center py-6">
                      Aucun message. Lance la conversation…
                    </p>
                  ) : (
                    thread.map((w) => {
                      const mine = w.from === playerId
                      return (
                        <div key={w.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[78%] px-3 py-2 rounded-2xl ${
                            mine
                              ? 'bg-gold/20 border border-gold/30 text-white rounded-br-sm'
                              : 'bg-surface border border-border text-white rounded-bl-sm'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap break-words">{w.text}</p>
                            <p className="text-[10px] text-muted mt-1 text-right">{formatTime(w.at)}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Input */}
                <div className="px-4 pt-2 pb-3 shrink-0 border-t border-border">
                  {sendError && <p className="text-crimson-light text-xs mb-2 text-center">{sendError}</p>}
                  <div className="flex gap-2">
                    <input
                      className="input flex-1 text-sm"
                      placeholder={`Écris à ${activePeer.name}…`}
                      value={draft}
                      maxLength={300}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={onKeyDown}
                      autoFocus
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!draft.trim()}
                      className="btn-gold px-5 min-h-[44px] rounded-xl text-sm font-bold disabled:opacity-30"
                    >
                      Envoyer
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="px-6 pb-3 shrink-0">
                  <h3 className="text-lg font-bold text-white">Messages privés</h3>
                  <p className="text-muted text-xs mt-0.5">Négocie discrètement avec les autres joueurs</p>
                </div>

                <div className="overflow-y-auto overscroll-contain flex-1 px-4 pb-2">
                  <div className="flex flex-col gap-2">
                    {others.map((p) => {
                      const unread = unreadBy[p.id] || 0
                      const lastMsg = [...whispers]
                        .filter((w) => w.from === p.id || w.to === p.id)
                        .sort((a, b) => b.at - a.at)[0]
                      return (
                        <button
                          key={p.id}
                          onClick={() => openThread(p.id)}
                          className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border bg-surface touch-manipulation active:bg-white/5"
                        >
                          <Avatar src={p.avatar} className="w-11 h-11 text-3xl" />
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-white font-semibold leading-tight">{p.name}</p>
                            {lastMsg ? (
                              <p className="text-muted text-xs truncate mt-0.5">
                                {lastMsg.from === playerId ? 'Toi : ' : ''}{lastMsg.text}
                              </p>
                            ) : (
                              <p className="text-muted text-xs mt-0.5 italic">Pas encore de message</p>
                            )}
                          </div>
                          {unread > 0 && (
                            <span className="shrink-0 bg-crimson text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] px-1.5 flex items-center justify-center">
                              {unread}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="px-6 pt-3 pb-1 shrink-0">
                  <button onClick={onClose} className="btn-ghost w-full rounded-2xl min-h-[52px]">
                    Fermer
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
