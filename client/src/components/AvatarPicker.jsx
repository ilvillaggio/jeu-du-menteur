import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSocket } from '../context/SocketContext'

export default function AvatarPicker({ open, onClose }) {
  const { players, playerId } = useGame()
  const { socket } = useSocket()
  const [avatars, setAvatars] = useState([])
  const [error, setError] = useState('')

  const me = players.find((p) => p.id === playerId)
  const currentAvatar = me?.avatar

  useEffect(() => {
    if (!open) return
    fetch('/avatars/selected/list.json')
      .then((r) => r.json())
      .then(setAvatars)
      .catch(() => setError('Impossible de charger les avatars.'))
  }, [open])

  // IDs des avatars déjà pris par d'autres joueurs
  const taken = new Set(
    players.filter((p) => p.id !== playerId).map((p) => p.avatar).filter(Boolean)
  )

  function choose(file) {
    const path = `/avatars/selected/${file}`
    if (taken.has(path)) return
    socket.emit('player:set_avatar', { avatar: path }, (res) => {
      if (res?.error) return setError(res.error)
      onClose()
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

            <div className="px-6 pb-3 shrink-0">
              <h3 className="text-lg font-bold text-white">Choisis ton personnage</h3>
              <p className="text-muted text-xs mt-0.5">
                Tape sur un perso pour l'adopter. Les grisés sont déjà pris par d'autres joueurs.
              </p>
            </div>

            <div className="overflow-y-auto overscroll-contain flex-1 px-4 pb-4">
              {error && <p className="text-crimson-light text-sm text-center mb-3">{error}</p>}

              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {avatars.map((a) => {
                  const path = `/avatars/selected/${a.file}`
                  const isMine = currentAvatar === path
                  const isTaken = taken.has(path)
                  return (
                    <button
                      key={a.file}
                      onClick={() => !isTaken && choose(a.file)}
                      disabled={isTaken}
                      className={`relative flex flex-col items-center gap-1 p-2 rounded-2xl border-2 touch-manipulation transition-colors ${
                        isMine
                          ? 'border-gold bg-gold/10'
                          : isTaken
                          ? 'border-border bg-surface opacity-40 cursor-not-allowed'
                          : 'border-border bg-surface active:bg-white/5'
                      }`}
                    >
                      <img
                        src={path}
                        alt={a.name}
                        className="w-20 h-20 rounded-2xl object-contain ring-1 ring-gold/40 shadow-lg shadow-black/30"
                        style={{ background: 'radial-gradient(circle at 50% 35%, #f5e4bc 0%, #d4a43d 60%, #8a6a1f 100%)' }}
                      />
                      <span className={`text-xs font-semibold ${isMine ? 'text-gold-light' : 'text-muted'}`}>
                        {a.name}
                      </span>
                      {isMine && (
                        <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gold text-noir text-sm font-bold flex items-center justify-center border-2 border-card">
                          ✓
                        </span>
                      )}
                      {isTaken && !isMine && (
                        <span className="absolute inset-0 flex items-center justify-center text-crimson-light text-xs font-bold bg-noir/60 rounded-2xl">
                          Pris
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
