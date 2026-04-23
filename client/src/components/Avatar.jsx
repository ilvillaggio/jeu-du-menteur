// Avatar : la "bulle" (fond doré + liseré + ombre) reste FIXE.
// Seule l'image du perso bouge à l'intérieur.
//
// Utilisation :
//   <Avatar src={p.avatar} className="w-9 h-9 text-3xl" />
//   <Avatar src={p.avatar} size={40} />               // taille en px
//   <Avatar src={p.avatar} animated={false} />        // désactive l'anim idle
//   <Avatar src={p.avatar} variant="ghost" />         // pas de bulle, juste l'image

import { useMemo } from 'react'
import { motion } from 'framer-motion'

function isImageAvatar(src) {
  return typeof src === 'string' && (src.startsWith('/') || src.startsWith('http'))
}

const FRAME_BASE = {
  background: 'radial-gradient(circle at 50% 35%, #f5e4bc 0%, #d4a43d 60%, #8a6a1f 100%)',
}

const IDLE_ANIM = {
  y: [0, -3, 0, -2, 0],
  scale: [1, 1.03, 1, 1.02, 1],
  rotate: [0, -1.5, 0, 1.5, 0],
}
const IDLE_TRANSITION = { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }

export default function Avatar({
  src,
  size,
  className = '',
  variant = 'frame',
  animated = true,
  style = {},
}) {
  const delay = useMemo(() => Math.random() * 1.6, [])

  const inline = size
    ? { ...style, width: size, height: size, fontSize: size }
    : style

  // Fallback emoji : pas de bulle
  if (!isImageAvatar(src)) {
    return (
      <span
        style={inline}
        className={`leading-none inline-block shrink-0 ${className}`}
      >
        {src || '🎭'}
      </span>
    )
  }

  // Variant ghost : juste l'image avec ombre, pas de bulle
  if (variant === 'ghost') {
    const imgProps = {
      src,
      alt: '',
      style: inline,
      className: `object-contain shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] ${className}`,
    }
    if (!animated) return <img {...imgProps} />
    return (
      <motion.img
        {...imgProps}
        animate={IDLE_ANIM}
        transition={{ ...IDLE_TRANSITION, delay }}
      />
    )
  }

  // Variant frame (default) : bulle fixe + image qui bouge à l'intérieur
  const containerStyle = { ...FRAME_BASE, ...inline }
  const containerClass = `relative rounded-2xl shrink-0 ring-1 ring-gold/40 shadow-lg shadow-black/30 ${className}`

  return (
    <div style={containerStyle} className={containerClass}>
      {animated ? (
        <motion.img
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          animate={IDLE_ANIM}
          transition={{ ...IDLE_TRANSITION, delay }}
        />
      ) : (
        <img
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
        />
      )}
    </div>
  )
}

export { isImageAvatar }
