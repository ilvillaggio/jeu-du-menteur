import { useGame } from '../context/GameContext'

export default function IdentityCard() {
  const { players, playerId, playerName } = useGame()
  const me = players.find((p) => p.id === playerId)
  const name = me?.name || playerName || '?'
  const avatar = me?.avatar || '🎭'
  const role = me?.role

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-surface border border-border rounded-2xl mb-5 w-full">
      <span className="text-3xl leading-none">{avatar}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted uppercase tracking-widest">Identité</p>
        <p className="text-white font-bold text-base leading-tight truncate">{name}</p>
        {role && <p className="text-gold text-xs mt-0.5">{role}</p>}
      </div>
    </div>
  )
}
