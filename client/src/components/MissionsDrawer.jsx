import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'

export default function MissionsDrawer({ open, onClose }) {
  const { myMissions } = useGame()

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
            <div className="px-6 pb-3 shrink-0">
              <h3 className="text-lg font-bold text-white">Missions secrètes</h3>
              <p className="text-muted text-xs mt-0.5">Complète-les discrètement. Personne ne les voit.</p>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto overscroll-contain flex-1 px-6 pb-2">
              {myMissions.length === 0 ? (
                <p className="text-muted text-sm text-center py-6">Aucune mission assignée.</p>
              ) : (
                <div className="flex flex-col gap-3 pb-2">
                  {myMissions.map((m) => (
                    <div
                      key={m.id}
                      className={`p-4 rounded-2xl border min-h-[72px] flex items-start gap-3 ${
                        m.completed
                          ? 'border-teal/40 bg-teal/10'
                          : m.difficulty === 'hard'
                          ? 'border-crimson/40 bg-crimson/10'
                          : 'border-gold/30 bg-gold/10'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-white text-base leading-snug">{m.description}</p>
                        <p className={`text-xs mt-1.5 ${m.difficulty === 'hard' ? 'text-crimson-light' : 'text-gold'}`}>
                          {m.difficulty === 'hard' ? '⚡ Difficile · +35 pts' : '✦ Facile · +15 pts'}
                        </p>
                      </div>
                      {m.completed && (
                        <span className="text-teal-light text-2xl shrink-0 mt-0.5">✓</span>
                      )}
                    </div>
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
