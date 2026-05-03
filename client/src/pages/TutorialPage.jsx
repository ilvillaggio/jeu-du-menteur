import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// "Vidéo" d'explication des règles : une séquence de slides animées qui
// défilent automatiquement. L'utilisateur peut avancer/reculer manuellement
// ou laisser le tuto se dérouler tout seul.
export default function TutorialPage({ onClose }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const slide = SLIDES[index]
  const isLast = index === SLIDES.length - 1

  // Auto-play : avance toutes les 6 secondes (sauf dernier slide ou pause)
  useEffect(() => {
    if (paused || isLast) return
    const t = setTimeout(() => setIndex((i) => i + 1), 9000)
    return () => clearTimeout(t)
  }, [index, paused, isLast])

  function next() { if (!isLast) setIndex((i) => i + 1) }
  function prev() { if (index > 0) setIndex((i) => i - 1) }

  return (
    <div className="fixed inset-0 z-50 bg-noir flex flex-col">
      {/* Skip en haut à droite */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 px-3 py-1.5 text-xs text-muted hover:text-white border border-border rounded-full"
      >
        Passer ✕
      </button>

      {/* Barre de progression (segments) */}
      <div className="flex gap-1 px-4 pt-4 pr-20">
        {SLIDES.map((_, i) => (
          <div key={i} className="flex-1 h-1 bg-surface rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gold"
              initial={{ width: '0%' }}
              animate={{
                width: i < index ? '100%' : i === index ? (paused ? '50%' : '100%') : '0%',
              }}
              transition={{
                duration: i === index && !paused ? 9 : 0.3,
                ease: 'linear',
              }}
            />
          </div>
        ))}
      </div>

      {/* Slide content */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6"
        onClick={() => setPaused((p) => !p)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-md w-full"
          >
            {slide.render({ paused })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nav buttons */}
      <div className="px-4 pb-6 safe-bottom flex items-center gap-3 max-w-md mx-auto w-full">
        <button
          onClick={prev}
          disabled={index === 0}
          className="w-14 h-14 rounded-2xl border-2 border-border bg-surface text-2xl text-white disabled:opacity-25 active:scale-95 touch-manipulation"
        >
          ←
        </button>
        {isLast ? (
          <button
            onClick={onClose}
            className="flex-1 h-14 rounded-2xl bg-gold text-noir font-bold text-base active:scale-95 touch-manipulation"
          >
            🎲 J'ai compris, je joue !
          </button>
        ) : (
          <button
            onClick={next}
            className="flex-1 h-14 rounded-2xl bg-gold text-noir font-bold text-base active:scale-95 touch-manipulation"
          >
            Suivant →
          </button>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Slides — chaque slide est un objet { render: () => JSX }
// ═══════════════════════════════════════════════════════════════════════════
const SLIDES = [
  // 1. Intro
  {
    render: () => (
      <>
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [-4, 4, -3], scale: [1, 1.06, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="text-8xl mb-6"
          style={{ filter: 'drop-shadow(0 0 24px rgba(180,30,30,0.6))' }}
        >🎭</motion.div>
        <h1 className="text-4xl font-bold text-white mb-2">Le Jeu du Menteur</h1>
        <p className="text-crimson-light/80 text-lg italic">Trahis. Coopère. Survis.</p>
        <p className="text-muted text-sm mt-6">Découvre les règles en 30 secondes</p>
      </>
    ),
  },

  // 2. But du jeu
  {
    render: () => (
      <>
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          className="text-8xl mb-5"
        >🏆</motion.div>
        <h2 className="text-3xl font-bold text-white mb-3">Le but</h2>
        <p className="text-white text-lg mb-2">Marque un MAX de points</p>
        <p className="text-muted text-sm">en quelques manches.</p>
        <p className="text-muted text-xs mt-6 italic">Chaque manche : choisir une équipe → choisir une action.</p>
      </>
    ),
  },

  // 3. Pacte mutuel
  {
    render: () => (
      <>
        <div className="flex justify-center gap-2 mb-5">
          {['🧑', '👩', '👨'].map((e, i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
              className="text-6xl"
            >
              {e}
            </motion.div>
          ))}
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">Étape 1 — Le pacte</h2>
        <p className="text-white text-base mb-3">Choisis <span className="text-gold-light font-bold">1</span> ou <span className="text-gold-light font-bold">2</span> partenaires.</p>
        <div className="bg-crimson/10 border border-crimson/30 rounded-xl p-3 mt-4">
          <p className="text-crimson-light text-sm font-bold">⚠️ Mutuel obligatoire</p>
          <p className="text-muted text-xs mt-1">Si tu choisis Alice + Bob, vous devez TOUS LES TROIS vous être choisis. Sinon le pacte échoue, tu passes ta manche.</p>
        </div>
      </>
    ),
  },

  // 4. Étape 2 : 3 actions
  {
    render: () => (
      <>
        <h2 className="text-3xl font-bold text-white mb-2">Étape 2 — L'action</h2>
        <p className="text-muted text-sm mb-6">Tu as 3 choix :</p>
        <div className="space-y-3">
          {[
            { e: '😏', t: 'Profiter', cls: 'border-gold/40 bg-gold/10',       label: 'text-gold-light',    s: 'gain garanti, joue seul' },
            { e: '🤝', t: 'Coopérer', cls: 'border-teal/40 bg-teal/10',       label: 'text-teal-light',    s: 'gain partagé si confiance' },
            { e: '🗡️', t: 'Trahir',  cls: 'border-crimson/40 bg-crimson/10', label: 'text-crimson-light', s: 'gros gain ou grosse perte' },
          ].map((a, i) => (
            <motion.div
              key={a.t}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.2 }}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 ${a.cls}`}
            >
              <span className="text-3xl">{a.e}</span>
              <div className="text-left flex-1">
                <p className={`${a.label} font-bold`}>{a.t}</p>
                <p className="text-muted text-xs">{a.s}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </>
    ),
  },

  // 5. Profiter
  {
    render: () => (
      <>
        <motion.div
          animate={{ rotate: [0, 12, -8, 6, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-8xl mb-5"
        >😏</motion.div>
        <h2 className="text-3xl font-bold text-gold-light mb-3">Profiter</h2>
        <div className="bg-gold/10 border-2 border-gold/40 rounded-2xl p-4 mb-3">
          <p className="text-3xl font-bold text-gold mb-1">+25 / +50 pts</p>
          <p className="text-gold-light text-xs">25 en pacte à 2 · 50 en pacte à 3</p>
        </div>
        <p className="text-muted text-sm">Tu joues seul. Gain garanti, aucun risque.</p>
      </>
    ),
  },

  // 6. Coopérer
  {
    render: () => (
      <>
        <motion.div
          animate={{ y: [0, -15, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          className="text-8xl mb-5"
        >🤝</motion.div>
        <h2 className="text-3xl font-bold text-teal-light mb-3">Coopérer</h2>
        <div className="bg-teal/10 border-2 border-teal/40 rounded-2xl p-4 mb-3">
          <p className="text-3xl font-bold text-teal mb-1">+50 / +75 pts</p>
          <p className="text-teal-light text-xs">50 en pacte à 2 · 75 en pacte à 3</p>
          <p className="text-teal-light/70 text-xs mt-1">si TOUT le pacte coopère</p>
        </div>
        <div className="bg-crimson/10 border border-crimson/30 rounded-xl p-3 text-left">
          <p className="text-crimson-light text-xs font-bold">⚠️ Sinon : 0 pt</p>
          <p className="text-muted text-xs mt-1">Mais si ≥ 2 traîtres, tu rafles tout leur butin (100 ou 150 par traître) !</p>
        </div>
      </>
    ),
  },

  // 7. Trahir
  {
    render: () => (
      <>
        <motion.div
          animate={{ rotate: [0, -15, 12, -10, 0], y: [0, -10, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-8xl mb-5"
        >🗡️</motion.div>
        <h2 className="text-3xl font-bold text-crimson-light mb-3">Trahir</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-teal/10 border-2 border-teal/40 rounded-xl p-3">
            <p className="text-xl font-bold text-teal">+100 / +150</p>
            <p className="text-teal-light text-[10px] uppercase tracking-widest">Seul traître</p>
          </div>
          <div className="bg-crimson/10 border-2 border-crimson/40 rounded-xl p-3">
            <p className="text-xl font-bold text-crimson-light">−100 / −150</p>
            <p className="text-crimson-light text-[10px] uppercase tracking-widest">Plusieurs traîtres</p>
          </div>
        </div>
        <p className="text-muted text-[11px] mt-2">100 en pacte à 2 · 150 en pacte à 3</p>
        <p className="text-muted text-xs mt-3 italic">Risqué : si tu n'es pas le seul à trahir, vous vous neutralisez et les coops raflent tout.</p>
      </>
    ),
  },

  // 8. Élimination + missions + dernière manche
  {
    render: () => (
      <>
        <h2 className="text-3xl font-bold text-white mb-5">À retenir</h2>
        <div className="space-y-3 text-left">
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-start gap-3 bg-crimson/10 border border-crimson/30 rounded-xl p-3"
          >
            <span className="text-3xl shrink-0">💀</span>
            <div>
              <p className="text-crimson-light font-bold text-sm">Score sous 0 = mort</p>
              <p className="text-muted text-xs">Tu deviens spectateur, tu observes les autres.</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-start gap-3 bg-gold/10 border border-gold/30 rounded-xl p-3"
          >
            <span className="text-3xl shrink-0">📜</span>
            <div>
              <p className="text-gold-light font-bold text-sm">2 missions secrètes</p>
              <p className="text-muted text-xs">Bonus de +25 et +75 si tu les complètes (révélés à la fin).</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="flex items-start gap-3 bg-crimson/10 border border-crimson/30 rounded-xl p-3"
          >
            <span className="text-3xl shrink-0">⚡</span>
            <div>
              <p className="text-crimson-light font-bold text-sm">Dernière manche × 2</p>
              <p className="text-muted text-xs">Tous les gains et pertes sont doublés. Tout peut basculer.</p>
            </div>
          </motion.div>
        </div>
      </>
    ),
  },

  // 9. Outro
  {
    render: () => (
      <>
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-8xl mb-6"
        >🎲</motion.div>
        <h2 className="text-4xl font-bold text-white mb-3">Prêt à jouer ?</h2>
        <p className="text-muted text-base mb-2">Le bluff, la coopération, la trahison…</p>
        <p className="text-gold-light text-lg italic mt-4">À toi de jouer.</p>
      </>
    ),
  },
]
