import { motion, AnimatePresence } from 'framer-motion'
import Avatar from './Avatar'

// Vue "coulisses" : groupes par pacte avec encarts colorés selon l'action
// que chaque joueur a choisie (en preview ou validée). Utilisée par les morts
// ET par les vivants hors-pacte qui observent la manche.
export default function PactsLiveView({ spectator }) {
  const data = spectator || { pacts: [], solos: [], actions: {} }
  const hasPacts = data.pacts && data.pacts.length > 0

  return (
    <div className="space-y-3">
      <h3 className="text-xs uppercase tracking-widest text-teal-light mb-1">
        Pactes en cours {hasPacts && `(${data.pacts.length})`}
      </h3>

      {hasPacts ? (
        data.pacts.map((pact, i) => (
          <div
            key={i}
            className={`rounded-2xl border-2 p-3 ${
              pact.length === 3 ? 'border-gold/40 bg-gold/5' : 'border-teal/40 bg-teal/5'
            }`}
          >
            <p className="text-[10px] text-muted uppercase tracking-widest mb-2">
              {pact.length === 3 ? 'Pacte à 3' : 'Pacte à 2'}
            </p>
            <div className="space-y-2">
              {pact.map((m) => (
                <PlayerCard
                  key={m.id}
                  member={m}
                  action={data.actions?.[m.id]}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="text-center text-muted text-sm py-4">
          Aucun pacte formé cette manche.
        </p>
      )}

      {data.solos && data.solos.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface/40 p-3">
          <p className="text-[10px] text-muted uppercase tracking-widest mb-2">
            Hors pacte ({data.solos.length})
          </p>
          <div className="space-y-2">
            {data.solos.map((s) => (
              <PlayerCard key={s.id} member={s} action={null} solo />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerCard({ member, action, solo }) {
  const cfg = ACTION_CONFIG[action] || (solo ? SOLO_CONFIG : PENDING_CONFIG)
  return (
    <motion.div
      animate={{ scale: action ? [1, 1.025, 1] : 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 transition-colors duration-300 ${cfg.cls}`}
    >
      <Avatar src={member.avatar} className="w-8 h-8 text-xl" animated={false} />
      <span className="font-semibold text-white text-sm flex-1 truncate">{member.name}</span>
      <AnimatePresence mode="wait" initial={false}>
        {action ? (
          <motion.span
            key={action}
            initial={{ opacity: 0, scale: 0.5, y: -3 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}
          >
            {cfg.icon} {cfg.txt}
          </motion.span>
        ) : (
          <motion.span
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-[10px] text-muted italic"
          >
            {solo ? 'Hors pacte' : 'en attente…'}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const ACTION_CONFIG = {
  cooperer: {
    cls: 'border-teal/60 bg-teal/15',
    badge: 'bg-teal/30 text-teal-light',
    icon: '🤝', txt: 'Coopère',
  },
  profiter: {
    cls: 'border-gold/60 bg-gold/15',
    badge: 'bg-gold/30 text-gold-light',
    icon: '😏', txt: 'Profite',
  },
  trahir: {
    cls: 'border-crimson/60 bg-crimson/15',
    badge: 'bg-crimson/30 text-crimson-light',
    icon: '🗡️', txt: 'Trahit',
  },
}
const PENDING_CONFIG = { cls: 'border-border bg-surface' }
const SOLO_CONFIG    = { cls: 'border-border bg-surface/60' }
