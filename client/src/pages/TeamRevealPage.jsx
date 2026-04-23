import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import IdentityCard from '../components/IdentityCard'
import Avatar from '../components/Avatar'

export default function TeamRevealPage() {
  const { teamReveal, round, players, playerId } = useGame()
  if (!teamReveal) return null
  const myAvatar = players.find((p) => p.id === playerId)?.avatar

  const { pacts, isActive, trickedPlayers = [] } = teamReveal
  const validPacts = pacts.filter((p) => p.valid)
  const validCount = validPacts.length

  function formatTrickedSentence(list) {
    if (list.length === 0) return null
    if (list.length === 1) return `${list[0].name} s'est fait avoir`
    const names = list.map((t) => t.name)
    const last = names.pop()
    return `${names.join(', ')} et ${last} se sont fait avoir`
  }

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

      {/* Ton équipe : uniquement les pacts mutuels */}
      {isActive && validPacts.length > 0 && (
        <div className="card flex flex-col gap-3 mb-6">
          <h3 className="text-xs text-muted uppercase tracking-widest">Ton équipe ce tour</h3>
          {validPacts.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 min-h-[60px] border-teal/40 bg-teal/10"
            >
              <Avatar src={p.avatar} className="w-11 h-11 text-3xl" />
              <div className="flex-1">
                <p className="font-bold text-white">{p.name}</p>
                <p className="text-xs mt-0.5 text-teal-light">✅ Pacte mutuel</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Annonce publique : qui s'est fait avoir ce tour (toi inclus si c'est ton cas) */}
      {trickedPlayers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card border-crimson/20 bg-crimson/5 mb-6"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl shrink-0">🤡</span>
            <div className="flex-1">
              <p className="text-xs text-muted uppercase tracking-widest mb-0.5">Les crédules du tour</p>
              <p className="text-white text-sm font-semibold">
                {formatTrickedSentence(trickedPlayers)}
              </p>
            </div>
          </div>
        </motion.div>
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
            {/* Perso qui tombe à la renverse */}
            <div className="flex justify-center mb-3">
              <motion.div
                initial={{ rotate: 0, y: 0, opacity: 1 }}
                animate={{ rotate: [0, -30, -75, -85, -90], y: [0, 8, 20, 28, 32], opacity: [1, 1, 1, 0.9, 0.85] }}
                transition={{ duration: 1.3, times: [0, 0.25, 0.6, 0.85, 1], ease: 'easeIn', delay: 0.3 }}
              >
                <Avatar src={myAvatar} animated={false} className="w-24 h-24 text-7xl" />
              </motion.div>
              <motion.span
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.9, type: 'spring', stiffness: 300 }}
                className="absolute ml-24 mt-2 text-4xl"
              >🤡</motion.span>
            </div>
            <p className="font-bold text-white text-lg">Tu es crédule !</p>
            <p className="text-muted text-xs mt-2 italic">Tu passes ce tour. Les résultats arrivent bientôt.</p>
          </>
        )}
      </motion.div>
    </div>
  )
}
