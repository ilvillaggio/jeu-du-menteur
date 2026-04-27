import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'

// Affiche un QR code qui mène directement à la salle (?room=CODE).
// Quand un joueur scanne, il arrive sur la page d'accueil avec le code prérempli.
export default function ShareRoomDrawer({ open, onClose, roomCode }) {
  const [copied, setCopied] = useState(false)

  // L'URL inclut le code de la salle en paramètre pour rejoindre direct
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const joinUrl = roomCode ? `${baseUrl}/?room=${roomCode}` : baseUrl

  function copyLink() {
    if (!navigator.clipboard) return
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }).catch(() => {})
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-noir/80 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 inset-x-0 z-50 flex flex-col bg-card border-t border-border rounded-t-3xl"
            style={{ maxHeight: '90vh', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
          >
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>

            <div className="px-6 pb-3 shrink-0">
              <h3 className="text-lg font-bold text-white">📱 Partager la salle</h3>
              <p className="text-muted text-xs mt-0.5">
                Scanne le QR code pour rejoindre directement, ou partage le lien.
              </p>
            </div>

            <div className="px-6 py-4 flex flex-col items-center gap-4">
              {/* QR code sur fond blanc pour la lisibilité */}
              <div className="bg-white p-4 rounded-2xl">
                <QRCodeSVG
                  value={joinUrl}
                  size={220}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#0a0a0f"
                  marginSize={1}
                />
              </div>

              {/* Code de la salle en gros */}
              {roomCode && (
                <div className="text-center">
                  <p className="text-muted text-[10px] uppercase tracking-widest mb-1">Code de la salle</p>
                  <p className="text-4xl font-mono font-bold text-gold tracking-widest">{roomCode}</p>
                </div>
              )}

              {/* Lien copiable */}
              <button
                onClick={copyLink}
                className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl text-left active:bg-white/5 touch-manipulation"
              >
                <p className="text-[10px] text-muted uppercase tracking-widest mb-1">
                  {copied ? '✓ Copié dans le presse-papier' : 'Tape pour copier le lien'}
                </p>
                <p className="text-white text-sm font-mono break-all">{joinUrl}</p>
              </button>
            </div>

            <div className="px-6 pt-2 pb-3 shrink-0">
              <button onClick={onClose} className="btn-ghost w-full rounded-2xl min-h-[48px]">
                Fermer
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
