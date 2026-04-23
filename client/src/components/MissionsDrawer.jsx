import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'

export default function MissionsDrawer({ open, onClose }) {
  const { myMissions, myMissionScore } = useGame()
  const completedCount = myMissions.filter((m) => m.completed).length

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-noir/80 z-40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 inset-x-0 z-50 flex flex-col bg-card border-t border-border rounded-t-3xl"
            style={{ maxHeight: '85vh', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>

            {/* Fixed header */}
            <div className="px-6 pb-3 shrink-0 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">Missions secrètes</h3>
                <p className="text-muted text-xs mt-0.5">
                  {completedCount > 0
                    ? `${completedCount} réussie${completedCount > 1 ? 's' : ''} · +${myMissionScore ?? 0} pts cachés`
                    : 'Complète-les discrètement. Personne ne les voit.'}
                </p>
              </div>
              {completedCount > 0 && (
                <div className="shrink-0 px-2.5 py-1 rounded-full bg-teal/20 border border-teal/40">
                  <p className="text-teal-light text-xs font-bold">{completedCount}/{myMissions.length}</p>
                </div>
              )}
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto overscroll-contain flex-1 px-6 pb-2">
              {myMissions.length === 0 ? (
                <p className="text-muted text-sm text-center py-6">Aucune mission assignée.</p>
              ) : (
                <div className="flex flex-col gap-3 pb-2">
                  {myMissions.map((m) => (
                    <motion.div
                      key={m.id}
                      animate={m.completed ? { scale: [1, 1.02, 1] } : {}}
                      transition={m.completed ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : {}}
                      className={`p-4 rounded-2xl border min-h-[72px] flex items-start gap-3 relative overflow-hidden ${
                        m.completed
                          ? 'border-teal bg-teal/15 shadow-lg shadow-teal/10'
                          : m.difficulty === 'hard'
                          ? 'border-crimson/40 bg-crimson/10'
                          : 'border-gold/30 bg-gold/10'
                      }`}
                    >
                      {m.completed && (
                        <motion.div
                          initial={{ x: '-100%' }}
                          animate={{ x: '100%' }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-teal/10 to-transparent pointer-events-none"
                        />
                      )}
                      <div className="flex-1 relative z-10">
                        <p className={`font-semibold text-base leading-snug ${m.completed ? 'text-teal-light' : 'text-white'}`}>
                          {m.description}
                        </p>
                        <p className={`text-xs mt-1.5 font-semibold ${
                          m.completed
                            ? 'text-teal-light'
                            : m.difficulty === 'hard'
                            ? 'text-crimson-light'
                            : 'text-gold'
                        }`}>
                          {m.completed
                            ? `✓ Réussie · +${m.difficulty === 'hard' ? 35 : 15} pts cachés`
                            : m.difficulty === 'hard'
                            ? '⚡ Difficile · +35 pts'
                            : '✦ Facile · +15 pts'}
                        </p>
                      </div>
                      {m.completed && (
                        <motion.span
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                          className="text-teal-light text-3xl shrink-0 mt-0.5 relative z-10"
                        >
                          ✓
                        </motion.span>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Fixed close button */}
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
