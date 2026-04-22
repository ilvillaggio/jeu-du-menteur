import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import IdentityCard from '../components/IdentityCard'

export default function TeamRevealPage() {
  const { teamReveal, round } = useGame()
  if (!teamReveal) return null

  const { pacts, isActive } = teamReveal
  const validCount = pacts.filter((p) => p.valid).length

  // Names of the partners this player chose (all invalid when isActive===false)
  const chosenNames = pacts.map((p) => p.name)

  return (
    <div className="min-h-screen flex flex-col px-4 pt-5 pb-6 safe-bottom max-w-lg mx-auto w-full">
      <IdentityCard />

      <div className="text-center mb-6">
        <p className="text-muted text-xs uppercase tracking-widest mb-1">Manche {round} · Résultat des pactes</p>
        <h2 className="text-2xl font-bold text-white">
          {isActive ? 'Tu joues ce tour !' : 'Tu passes ce tour'}
        </h2>
        <p className="text-muted text-sm mt-1">
          {isActive
            ? `${validCount} pacte${validCount > 1 ? 's' : ''} mutuel${validCount > 1 ? 's' : ''} · Tu vas choisir ton action`
            : 'Aucun pacte mutuel — tu passes cette manche 🫠'}
        </p>
      </div>

      {/* Pacts — only show valid ones (don't reveal who didn't reciprocate) */}
      {isActive && (
        <div className="card flex flex-col gap-3 mb-6">
          <h3 className="text-xs text-muted uppercase tracking-widest">Ton équipe ce tour</h3>
          {pacts.filter((p) => p.valid).map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 min-h-[60px] border-teal/40 bg-teal/10"
            >
              <span className="text-3xl leading-none">{p.avatar}</span>
              <div className="flex-1">
                <p className="font-bold text-white">{p.name}</p>
                <p className="text-xs mt-0.5 text-teal-light">✅ Pacte mutuel</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className={`card text-center ${isActive ? 'border-gold/30 bg-gold/5' : 'border-border'}`}
      >
        {isActive ? (
          <>
            <p className="text-2xl mb-2">⚔️</p>
            <p className="font-bold text-white">Prépare ton action</p>
            <p className="text-muted text-sm mt-1">La phase d'action commence dans quelques secondes…</p>
          </>
        ) : (
          <>
            <p className="text-3xl mb-2">🤡</p>
            <p className="font-bold text-white text-lg">Tu es crédule !</p>
            {chosenNames.length > 0 ? (
              <p className="text-muted text-sm mt-1">
                <span className="text-white font-semibold">{chosenNames.join(' et ')}</span>
                {chosenNames.length > 1 ? ' t\'ont peut-être menti…' : ' t\'a peut-être menti…'}
              </p>
            ) : (
              <p className="text-muted text-sm mt-1">Personne ne t'a choisi… tu es hors-jeu.</p>
            )}
            <p className="text-muted text-xs mt-2 italic">Tu passes ce tour. Les résultats arrivent bientôt.</p>
          </>
        )}
      </motion.div>
    </div>
  )
}
