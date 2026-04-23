import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'

export default function MessagesIconButton({ onClick }) {
  const { whispers, playerId } = useGame()
  const unread = whispers.filter((w) => w.to === playerId && !w.read).length

  return (
    <button
      onClick={onClick}
      aria-label="Messages"
      className={`relative w-12 h-12 flex items-center justify-center text-2xl touch-manipulation rounded-xl transition-opacity ${
        unread > 0 ? 'opacity-100' : 'opacity-40 active:opacity-100'
      }`}
    >
      <motion.span
        animate={unread > 0 ? { rotate: [0, -14, 14, -10, 10, -4, 4, 0], y: [0, -3, 0, -2, 0] } : {}}
        transition={unread > 0 ? { duration: 1, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' } : {}}
        className="inline-block"
      >
        💬
      </motion.span>
      {unread > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 16 }}
          className="absolute -top-1 -right-1 bg-crimson text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border border-card"
        >
          {unread}
        </motion.span>
      )}
    </button>
  )
}
