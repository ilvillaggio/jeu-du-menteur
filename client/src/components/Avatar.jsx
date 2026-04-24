// Avatar : image du perso avec halo clair + ombre portée (style "B+"), sans bulle.
//
// Utilisation :
//   <Avatar src={p.avatar} className="w-9 h-9 text-3xl" />
//   <Avatar src={p.avatar} size={40} />               // taille en px
//   <Avatar src={p.avatar} animated={false} />        // désactive l'anim idle

import { useMemo } from 'react'
import { motion } from 'framer-motion'

function isImageAvatar(src) {
  return typeof src === 'string' && (src.startsWith('/') || src.startsWith('http'))
}

const CUTOUT_FILTER =
  'drop-shadow(0 0 2px rgba(255,255,255,0.9)) drop-shadow(0 0 4px rgba(255,255,255,0.5)) drop-shadow(0 8px 14px rgba(0,0,0,0.85)) drop-shadow(0 2px 4px rgba(0,0,0,0.6))'

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
  animated = true,
  style = {},
}) {
  const delay = useMemo(() => Math.random() * 1.6, [])

  const inline = size
    ? { ...style, width: size, height: size, fontSize: size }
    : style

  // Fallback emoji : pas de filtre
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

  const imgStyle = { ...inline, filter: CUTOUT_FILTER }
  const imgClass = `object-contain shrink-0 ${className}`

  if (!animated) {
    return <img src={src} alt="" style={imgStyle} className={imgClass} />
  }

  return (
    <motion.img
      src={src}
      alt=""
      style={imgStyle}
      className={imgClass}
      animate={IDLE_ANIM}
      transition={{ ...IDLE_TRANSITION, delay }}
    />
  )
}

export { isImageAvatar }
