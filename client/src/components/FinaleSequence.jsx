import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  unlockAudio,
  startTensionDrone,
  playRustle,
  playTick,
  playBoom,
  playSting,
  playEvilLaugh,
  playThud,
} from '../lib/audio'

const CUTOUT =
  'drop-shadow(0 0 2px rgba(255,255,255,0.9)) drop-shadow(0 0 4px rgba(255,255,255,0.5)) drop-shadow(0 10px 18px rgba(0,0,0,0.9)) drop-shadow(0 3px 5px rgba(0,0,0,0.6))'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

// Heuristique simple prénom → genre (français). Imparfait mais acceptable.
const MALE_EXCEPTIONS = new Set([
  'pierre','alexandre','philippe','jérôme','jerome','jean','andré','andre',
  'hervé','herve','nicolas','pascal','christophe','maxime','jacques','yves',
  'stéphane','stephane','rémi','remi','lucas','thomas','charles','auguste',
  'baptiste','côme','come','étienne','etienne','françois','francois','gilles',
  'julien','mathieu','sébastien','sebastien','simon','léo','leo','noé','noe',
  'gabriel','raphaël','raphael','clément','clement','théo','theo','thibault',
  'victor','vincent','william','yvan','bruno','dimitri','fred','frédéric',
  'frederic','antoine','arthur','tristan','erwan','yann','alexis','félix','felix',
  'jules','martin','tom','mike','mickey','michel',
])
function isFemaleName(name) {
  if (!name) return false
  const n = name.trim().toLowerCase()
  if (MALE_EXCEPTIONS.has(n)) return false
  const fem = ['a', 'e', 'ée', 'ie', 'ine', 'ette', 'lle', 'nne', 'esse', 'ice', 'ique']
  return fem.some((end) => n.endsWith(end))
}
function address(target) {
  const fem = isFemaleName(target.name)
  return {
    monCher:    fem ? 'Ma chère' : 'Mon cher',
    monCherLow: fem ? 'ma chère' : 'mon cher',
    ami:        fem ? 'amie'     : 'ami',
    imbecile:   fem ? 'imbécile' : 'imbécile', // neutre
  }
}

const SCENE_LIBRARY = [
  { kind: 'gift',         subtitle: 'Le présent empoisonné' },
  { kind: 'poison',       subtitle: "Le verre de l'amitié" },
  { kind: 'rooftop',      subtitle: 'La chute silencieuse' },
  { kind: 'dagger',       subtitle: 'Le baiser de Judas' },
  { kind: 'trapdoor',     subtitle: 'La trappe oubliée' },
  { kind: 'banana',       subtitle: 'Le faux pas' },
  { kind: 'drowning',     subtitle: 'Les eaux troubles' },
  { kind: 'hammer',       subtitle: 'Le marteau du destin' },
  { kind: 'bridge',       subtitle: 'La corde rompue' },
  { kind: 'wolf',         subtitle: 'Les crocs de la forêt' },
  { kind: 'electrocution',subtitle: 'Le courant d’adieu' },
  { kind: 'arrow',        subtitle: 'La flèche sans nom' },
  { kind: 'spike_trap',   subtitle: 'Les épines du sol' },
  { kind: 'fireplace',    subtitle: 'Les braises éternelles' },
  { kind: 'chandelier',   subtitle: 'Le lustre décroché' },
  { kind: 'well',         subtitle: 'Le puits sans fond' },
]

function buildActs(sorted, sceneKinds) {
  // Si le serveur a fourni l'ordre des scènes, on l'utilise pour que tous
  // les clients voient la même cinématique. Sinon (cas dégradé), on
  // shuffle localement (peut donner des cinematiques différentes par client).
  let pool
  if (Array.isArray(sceneKinds) && sceneKinds.length > 0) {
    pool = sceneKinds
      .map((k) => SCENE_LIBRARY.find((s) => s.kind === k))
      .filter(Boolean)
    if (pool.length === 0) pool = [...SCENE_LIBRARY] // fallback si kinds invalides
  } else {
    pool = [...SCENE_LIBRARY]
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
  }
  return sorted.slice(0, -1).map((victim, i) => {
    const lib = pool[i % pool.length]
    return {
      id: `act-${i}`,
      index: i,
      title: `ACTE ${ROMAN[i] || i + 1}`,
      subtitle: lib.subtitle,
      kind: lib.kind,
      victim,
      killer: sorted[i + 1],
    }
  })
}

// ============ Orchestrateur ============
export default function FinaleSequence({ sorted, sceneKinds, onComplete }) {
  // L'ordre des scènes vient du serveur (sceneKinds) → tous les clients
  // ont la même cinématique. Mémorisé pour stabilité.
  const [acts] = useState(() => buildActs(sorted, sceneKinds))
  const [actIdx, setActIdx] = useState(0)
  const [phase, setPhase] = useState('scene') // 'scene' | 'interlude' | 'blackout'
  const droneRef = useRef(null)

  useEffect(() => {
    unlockAudio()
    droneRef.current = startTensionDrone()
    // Sting dramatique au tout début de la séquence (remplace les title cards)
    const t = setTimeout(() => playSting(), 200)
    return () => {
      clearTimeout(t)
      droneRef.current?.stop(0.6)
    }
  }, [])

  useEffect(() => {
    if (acts.length === 0) {
      onComplete()
      return
    }
    let timer
    if (phase === 'scene') {
      timer = setTimeout(() => setPhase('interlude'), 14500)
    } else if (phase === 'interlude') {
      timer = setTimeout(() => {
        if (actIdx < acts.length - 1) {
          setActIdx((i) => i + 1)
          setPhase('scene')
        } else {
          setPhase('blackout')
        }
      }, 500)
    } else if (phase === 'blackout') {
      timer = setTimeout(() => onComplete(), 1400)
    }
    return () => clearTimeout(timer)
  }, [phase, actIdx, acts.length, onComplete])

  if (acts.length === 0) return null
  const act = acts[actIdx]

  function skip() {
    droneRef.current?.stop(0.3)
    onComplete()
  }

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden select-none">
      <AnimatePresence mode="wait">
        {phase === 'scene' && (
          <SceneRouter key={`s-${act.id}`} act={act} />
        )}
        {phase === 'interlude' && <Interlude key={`i-${act.id}`} />}
        {phase === 'blackout' && <Blackout key="bo" />}
      </AnimatePresence>

      {/* Bouton "Passer" — discret en haut à droite, toujours visible (respecte la safe-area iPhone) */}
      <button
        onClick={skip}
        className="absolute right-4 z-50 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase bg-black/40 border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors backdrop-blur-sm touch-manipulation"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        Passer →
      </button>
    </div>
  )
}

// ============ Dispatcher de scène ============
function SceneRouter({ act }) {
  const p = { victim: act.victim, killer: act.killer }
  if (act.kind === 'gift')         return <GiftScene         {...p} />
  if (act.kind === 'poison')       return <PoisonScene       {...p} />
  if (act.kind === 'rooftop')      return <RooftopScene      {...p} />
  if (act.kind === 'dagger')       return <DaggerScene       {...p} />
  if (act.kind === 'trapdoor')     return <TrapdoorScene     {...p} />
  if (act.kind === 'banana')       return <BananaScene       {...p} />
  if (act.kind === 'drowning')     return <DrowningScene     {...p} />
  if (act.kind === 'hammer')       return <HammerScene       {...p} />
  if (act.kind === 'bridge')       return <BridgeScene       {...p} />
  if (act.kind === 'wolf')         return <WolfScene         {...p} />
  if (act.kind === 'electrocution')return <ElectrocutionScene {...p} />
  if (act.kind === 'arrow')        return <ArrowScene        {...p} />
  if (act.kind === 'spike_trap')   return <SpikeTrapScene    {...p} />
  if (act.kind === 'fireplace')    return <FireplaceScene    {...p} />
  if (act.kind === 'chandelier')   return <ChandelierScene   {...p} />
  if (act.kind === 'well')         return <WellScene         {...p} />
  return null
}

// ============ Title card ============
function TitleCard({ number, subtitle }) {
  useEffect(() => {
    const t = setTimeout(() => playSting(), 400)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: '30%', opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="h-px bg-gold/60 mb-6"
      />
      <motion.div
        initial={{ letterSpacing: '0.8em', opacity: 0, filter: 'blur(10px)' }}
        animate={{ letterSpacing: '0.35em', opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 1.3, ease: 'easeOut' }}
        className="text-white text-4xl md:text-5xl font-serif tracking-widest"
        style={{ textShadow: '0 0 20px rgba(212,164,61,0.4)' }}
      >
        {number}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3, duration: 0.9 }}
        className="text-gold-light text-lg md:text-xl mt-5 italic font-serif"
      >
        {subtitle}
      </motion.div>
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: '30%', opacity: 1 }}
        transition={{ delay: 1.7, duration: 1 }}
        className="h-px bg-gold/60 mt-6"
      />
    </motion.div>
  )
}

// ============ Interlude entre deux actes ============
function Interlude() {
  return (
    <motion.div
      className="absolute inset-0 bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
    />
  )
}

// ============ Blackout final ============
function Blackout() {
  return (
    <motion.div
      className="absolute inset-0 bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    />
  )
}

// ============ Sous-titre typewriter ============
function Subtitle({ text, speaker, show }) {
  const [shown, setShown] = useState('')
  useEffect(() => {
    if (!show) { setShown(''); return }
    let i = 0
    const id = setInterval(() => {
      i++
      setShown(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, 26)
    return () => clearInterval(id)
  }, [text, show])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute left-0 right-0 bottom-10 px-6 flex justify-center pointer-events-none"
          style={{ zIndex: 20 }}
        >
          <div
            className="max-w-md text-center"
            style={{
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(2px)',
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid rgba(212,164,61,0.25)',
            }}
          >
            {speaker && (
              <div className="text-gold-light text-[10px] uppercase tracking-widest mb-1">
                {speaker}
              </div>
            )}
            <div
              className="text-white text-base md:text-lg italic font-serif"
              style={{ textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}
            >
              « {shown}<span className="opacity-50">{shown.length < text.length ? '▌' : ''}</span> »
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// ================= DÉCOR 1 : RUELLE NUIT ====================
// ============================================================
function AlleyBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#0b1428 0%,#10192e 30%,#090b16 65%,#000 100%)' }} />
      <div className="absolute" style={{
        top: '8%', right: '14%', width: '90px', height: '90px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,240,200,0.7) 0%, rgba(255,240,200,0.2) 40%, transparent 70%)',
        filter: 'blur(2px)',
      }} />
      <svg className="absolute bottom-0 left-0 h-[65%] w-[40%]" viewBox="0 0 200 300" preserveAspectRatio="none">
        <polygon points="0,300 0,90 30,90 30,60 70,60 70,110 110,110 110,40 150,40 150,80 200,80 200,300" fill="#050811" />
        <rect x="10" y="110" width="6" height="10" fill="#f7c055" opacity="0.7" />
        <rect x="38" y="130" width="6" height="10" fill="#f7c055" opacity="0.4" />
        <rect x="78" y="130" width="6" height="10" fill="#f7c055" opacity="0.8" />
        <rect x="120" y="70" width="6" height="10" fill="#f7c055" opacity="0.5" />
        <rect x="160" y="120" width="6" height="10" fill="#f7c055" opacity="0.6" />
      </svg>
      <svg className="absolute bottom-0 right-0 h-[55%] w-[40%]" viewBox="0 0 200 300" preserveAspectRatio="none">
        <polygon points="0,300 0,120 40,120 40,70 90,70 90,130 130,130 130,50 170,50 170,100 200,100 200,300" fill="#050811" />
        <rect x="50" y="140" width="6" height="10" fill="#f7c055" opacity="0.6" />
        <rect x="100" y="160" width="6" height="10" fill="#f7c055" opacity="0.3" />
        <rect x="140" y="80" width="6" height="10" fill="#f7c055" opacity="0.7" />
        <rect x="180" y="140" width="6" height="10" fill="#f7c055" opacity="0.5" />
      </svg>
      <div className="absolute" style={{
        bottom: '15%', left: '50%', transform: 'translateX(-50%)',
        width: '60vmin', height: '45vmin',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(255,210,130,0.22) 0%, rgba(255,210,130,0.08) 35%, transparent 70%)',
      }} />
      <div className="absolute bottom-0 left-0 right-0" style={{
        height: '22%',
        background: 'linear-gradient(180deg, rgba(20,22,30,0.9) 0%, rgba(5,5,8,1) 100%)',
      }} />
      <div className="absolute" style={{
        bottom: '15%', left: '50%', transform: 'translateX(-50%)',
        width: '3px', height: '35vh',
        background: 'linear-gradient(180deg, #1a1e2e 0%, #0a0c18 100%)',
      }} />
      <div className="absolute" style={{
        bottom: 'calc(15% + 35vh - 10px)', left: '50%', transform: 'translateX(-50%)',
        width: '24px', height: '20px',
        background: 'radial-gradient(ellipse, #ffd782 0%, #b8841f 70%, #1a1e2e 100%)',
        borderRadius: '50% 50% 40% 40%',
        boxShadow: '0 0 30px 10px rgba(255,210,130,0.35)',
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 180px 60px rgba(0,0,0,0.95)' }} />
    </div>
  )
}

// ============================================================
// ================= DÉCOR 2 : TAVERNE ========================
// ============================================================
function TavernBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Mur brun + ambiance bordeaux */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg,#2a1608 0%,#3a1f0a 40%,#1a0b04 100%)',
      }} />
      {/* Lueur centrale chaude */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 50% 45%, rgba(255,160,60,0.25) 0%, rgba(180,60,20,0.1) 40%, transparent 75%)',
      }} />
      {/* Étagère bouteilles fond */}
      <svg className="absolute" style={{ top: '20%', left: '10%', width: '20%', height: '25%' }} viewBox="0 0 120 100" preserveAspectRatio="none">
        <rect x="0" y="40" width="120" height="5" fill="#1a0c03" />
        <rect x="0" y="82" width="120" height="5" fill="#1a0c03" />
        {[10,25,40,55,70,85,100].map((x,i) => (
          <g key={i}>
            <rect x={x} y="10" width="10" height="30" fill={['#2a5a3a','#5a2a2a','#3a3a5a'][i%3]} opacity="0.8" />
            <rect x={x+3} y="5" width="4" height="8" fill="#1a0c03" />
          </g>
        ))}
        {[10,25,40,55,70,85,100].map((x,i) => (
          <g key={`b2-${i}`}>
            <rect x={x} y="52" width="10" height="30" fill={['#5a3a1a','#2a2a5a','#4a1a1a'][i%3]} opacity="0.8" />
            <rect x={x+3} y="47" width="4" height="8" fill="#1a0c03" />
          </g>
        ))}
      </svg>
      {/* Cheminée à droite avec flammes */}
      <div className="absolute" style={{
        right: '8%', bottom: '22%', width: '14vmin', height: '20vmin',
        background: 'linear-gradient(180deg, #0a0604 0%, #1a0e06 100%)',
        border: '3px solid #0a0604',
        borderRadius: '6px 6px 0 0',
      }}>
        <motion.div
          animate={{ scaleY: [1, 1.1, 0.95, 1.08, 1], opacity: [0.9, 1, 0.85, 1, 0.9] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', bottom: 0, left: '15%', right: '15%', height: '70%',
            background: 'radial-gradient(ellipse at 50% 100%, #fff2a0 0%, #ff9430 40%, #c23a0a 75%, transparent 100%)',
            borderRadius: '40% 40% 20% 20%',
            filter: 'blur(1px)',
          }}
        />
      </div>
      {/* Halo cheminée */}
      <div className="absolute" style={{
        right: '2%', bottom: '15%', width: '30vmin', height: '30vmin',
        background: 'radial-gradient(circle, rgba(255,120,40,0.3) 0%, transparent 70%)',
        filter: 'blur(8px)',
      }} />
      {/* Plancher bois */}
      <div className="absolute bottom-0 left-0 right-0" style={{
        height: '22%',
        background: 'linear-gradient(180deg, #2a1608 0%, #140904 100%)',
      }} />
      {/* Lignes du plancher */}
      <svg className="absolute bottom-0 left-0 right-0" style={{ height: '22%' }} viewBox="0 0 100 20" preserveAspectRatio="none">
        <line x1="0" y1="7" x2="100" y2="7" stroke="#0a0604" strokeWidth="0.3" />
        <line x1="0" y1="14" x2="100" y2="14" stroke="#0a0604" strokeWidth="0.3" />
      </svg>
      {/* Table au milieu */}
      <div className="absolute" style={{
        bottom: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '45vmin', height: '5vmin',
        background: 'linear-gradient(180deg, #3a1f0a 0%, #1a0c03 100%)',
        borderRadius: '3px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.6)',
      }} />
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 180px 60px rgba(0,0,0,0.92)' }} />
    </div>
  )
}

// ============================================================
// ================= DÉCOR 3 : TOIT D'IMMEUBLE ================
// ============================================================
// Principe : le sol du toit n'occupe que la droite de l'écran.
// Le REBORD (bord-du-toit côté vide) est juste à gauche des persos.
// Au-delà du rebord : le vide (ciel bas + ville très en contrebas).
// La victime est poussée et franchit clairement ce rebord.
function RooftopBackdrop() {
  const stars = useRef(
    Array.from({ length: 55 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 55,
      size: Math.random() * 1.5 + 0.4,
      op: Math.random() * 0.7 + 0.3,
      delay: Math.random() * 3,
    }))
  ).current

  const FLOOR_LEFT = '25%'   // à gauche de ça, c'est le vide
  const FLOOR_H    = '35%'   // hauteur du sol depuis le bas

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* === CIEL NOCTURNE === */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #030612 0%, #0a0f24 40%, #14123a 75%, #050614 100%)',
      }} />

      {/* Étoiles */}
      {stars.map((s, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [s.op * 0.35, s.op, s.op * 0.35] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: s.delay }}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.size}px`, height: `${s.size}px` }}
        />
      ))}

      {/* Lune en haut à droite */}
      <div className="absolute" style={{
        top: '7%', right: '14%', width: '110px', height: '110px', borderRadius: '50%',
        background: 'radial-gradient(circle at 40% 40%, #fff4d4 0%, #e5d39a 35%, #a88c55 85%, #564422 100%)',
        boxShadow: '0 0 70px 18px rgba(255,230,180,0.3)',
      }} />

      {/* === VILLE LOINTAINE / HORIZON en arrière-plan === */}
      {/* Silhouette de la ville très basse (tout près de l'horizon, bas) */}
      <svg className="absolute" style={{ bottom: '38%', left: 0, width: '100%', height: '7%' }}
           viewBox="0 0 400 30" preserveAspectRatio="none">
        <polygon points="0,30 0,22 20,22 20,14 45,14 45,24 70,24 70,10 95,10 95,20 125,20 125,16 150,16 150,24 180,24 180,12 210,12 210,22 240,22 240,18 270,18 270,24 300,24 300,14 330,14 330,22 360,22 360,18 400,18 400,30"
                 fill="#03050a" />
      </svg>
      {/* Quelques lueurs jaunes très faibles dans la ville */}
      {[{ x: 12, o: 0.5 }, { x: 28, o: 0.4 }, { x: 44, o: 0.6 }, { x: 58, o: 0.45 }, { x: 72, o: 0.5 }, { x: 86, o: 0.55 }].map((b, i) => (
        <div key={i} className="absolute rounded-full" style={{
          bottom: `${39 + (i % 2) * 1.5}%`, left: `${b.x}%`,
          width: '2px', height: '2px', background: '#ffcf70', opacity: b.o,
        }} />
      ))}

      {/* === LE VIDE (zone à gauche du rebord) : assombrissement pour suggérer la profondeur === */}
      <div className="absolute" style={{
        bottom: 0, left: 0, width: FLOOR_LEFT, height: '50%',
        background: 'radial-gradient(ellipse at 0% 100%, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 60%, transparent 100%)',
        pointerEvents: 'none',
      }} />
      {/* Traînées verticales de vapeur/vent dans le vide */}
      <motion.div
        animate={{ y: ['0%', '100%'], opacity: [0, 0.25, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
        className="absolute"
        style={{
          bottom: '20%', left: '10%',
          width: '1px', height: '12vh',
          background: 'linear-gradient(180deg, transparent 0%, rgba(200,200,220,0.6) 50%, transparent 100%)',
        }}
      />

      {/* === SOL DU TOIT (côté droit seulement) === */}
      <div className="absolute" style={{
        bottom: 0, left: FLOOR_LEFT, right: 0, height: FLOOR_H,
        background: `
          linear-gradient(180deg, #242430 0%, #0c0c16 100%),
          repeating-linear-gradient(0deg, transparent 0 14px, rgba(0,0,0,0.4) 14px 15px),
          repeating-linear-gradient(90deg, transparent 0 28px, rgba(0,0,0,0.3) 28px 29px)
        `,
        backgroundBlendMode: 'normal, multiply, multiply',
        boxShadow: 'inset 10px 0 18px rgba(0,0,0,0.85), -2px 0 6px rgba(0,0,0,0.7)',
        borderLeft: '3px solid #0a0a10',
        zIndex: 1,
      }} />

      {/* === BORD DU TOIT : tranche horizontale VISIBLE au ras du sol, alignée sur le sol ===
           (plus aucun élément ne dépasse dans le vide) */}
      <div className="absolute" style={{
        bottom: FLOOR_H, left: FLOOR_LEFT,
        width: '6%', height: '1.4vmin',
        background: 'linear-gradient(90deg, #4a4a56 0%, #36363f 100%)',
        borderTop: '1px solid #5a5a66',
        boxShadow: '0 2px 5px rgba(0,0,0,0.7)',
        zIndex: 3,
      }} />
      {/* Tranche verticale du toit (la face qui descend vers le vide, à gauche du sol) */}
      <div className="absolute" style={{
        bottom: `calc(${FLOOR_H} - 4vmin)`, left: FLOOR_LEFT,
        width: '0', height: '4vmin',
        borderLeft: '4px solid rgba(0,0,0,0.85)',
        zIndex: 2,
      }} />

      {/* === Cheminée de briques (déplacée à DROITE pour ne pas gêner la chute) === */}
      <div className="absolute" style={{
        bottom: FLOOR_H, right: '8%', width: '7vmin', height: '20vmin',
        zIndex: 2,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, #4a1f14 0%, #2a0f08 100%)',
          borderRadius: '3px 3px 0 0',
          boxShadow: 'inset -3px 0 6px rgba(0,0,0,0.6), -3px 6px 10px rgba(0,0,0,0.7)',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent 0, transparent 8px, rgba(0,0,0,0.5) 8px, rgba(0,0,0,0.5) 9px),' +
              'repeating-linear-gradient(90deg, transparent 0, transparent 12px, rgba(0,0,0,0.4) 12px, rgba(0,0,0,0.4) 13px)',
          }} />
        </div>
        <div style={{
          position: 'absolute', top: '-1.5vmin', left: '-1vmin', right: '-1vmin', height: '2vmin',
          background: 'linear-gradient(180deg, #1a0a04 0%, #0a0402 100%)',
          borderRadius: '2px',
        }} />
        <motion.div
          animate={{ y: [-4, -28], opacity: [0.55, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: '-3vmin', left: '1.5vmin',
            width: '4vmin', height: '4vmin', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200,200,210,0.4) 0%, transparent 70%)',
            filter: 'blur(3px)',
          }}
        />
      </div>

      {/* === Conduit d'aération discret (sur le toit, entre les persos) === */}
      <div className="absolute" style={{
        bottom: FLOOR_H, left: '50%', width: '4vmin', height: '5vmin',
        background: 'linear-gradient(180deg, #5a5a64 0%, #2a2a34 100%)',
        borderRadius: '50% / 20%',
        boxShadow: '2px 4px 6px rgba(0,0,0,0.7)',
        zIndex: 2,
      }}>
        <div style={{
          position: 'absolute', top: '-0.8vmin', left: 0, right: 0, height: '1.2vmin',
          background: 'radial-gradient(ellipse, #20202a 0%, #0a0a12 100%)',
          borderRadius: '50%',
        }} />
      </div>

      {/* Vignette globale */}
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 200px 70px rgba(0,0,0,0.95)' }} />
    </div>
  )
}

// ============================================================
// ================= SCÈNE 1 : CADEAU PIÉGÉ ===================
// ============================================================
function GiftBox() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="gbox" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c22" />
          <stop offset="100%" stopColor="#7a1010" />
        </linearGradient>
      </defs>
      <rect x="12" y="38" width="76" height="48" fill="url(#gbox)" stroke="#3a0505" strokeWidth="2" />
      <rect x="8" y="32" width="84" height="12" fill="url(#gbox)" stroke="#3a0505" strokeWidth="2" />
      <rect x="44" y="32" width="12" height="54" fill="#f4c542" />
      <rect x="8" y="36" width="84" height="6" fill="#f4c542" />
      <ellipse cx="42" cy="28" rx="10" ry="6" fill="#f4c542" stroke="#8a6a1f" strokeWidth="1.5" />
      <ellipse cx="58" cy="28" rx="10" ry="6" fill="#f4c542" stroke="#8a6a1f" strokeWidth="1.5" />
      <rect x="46" y="24" width="8" height="10" fill="#e5a828" />
    </svg>
  )
}

function ExplosionParticles({ originLeft, originBottom }) {
  const particles = useRef(
    Array.from({ length: 18 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.4
      const dist = 180 + Math.random() * 140
      return {
        id: i,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 60,
        size: 10 + Math.random() * 18,
        hue: 20 + Math.random() * 25,
        delay: Math.random() * 0.08,
      }
    })
  ).current

  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: originLeft, bottom: originBottom, transform: 'translate(-50%, 0)' }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.dx, y: p.dy, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.9 + Math.random() * 0.4, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: p.size, height: p.size, borderRadius: '50%',
            background: `radial-gradient(circle, hsl(${p.hue}, 95%, 70%) 0%, hsl(${p.hue - 10}, 80%, 45%) 60%, transparent 100%)`,
            filter: 'blur(0.5px)',
          }}
        />
      ))}
      <motion.div
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 6, opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          position: 'absolute', width: 80, height: 80, left: -40, top: -40,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #fff4b0 0%, #ff8a1e 40%, #c22 75%, transparent 100%)',
          filter: 'blur(3px)',
        }}
      />
    </div>
  )
}

// GIFT SCENE — Le tueur offre un cadeau piégé à la victime, qui explose.
// Décor : AlleyBackdrop (ruelle nuit).
// Steps : 0=init, 1=victime entre, 2=tueur apparaît, 3=dialogue K, 4=cadeau apparaît,
//         5=cadeau glisse vers victime + dialogue V, 6=tic-tac + shake, 7=BOOM,
//         8=victime éjectée, 9=dialogue K final, 10=rire.
function GiftScene({ victim, killer }) {
  const [step, setStep] = useState(0)
  const [shake, setShake] = useState(false)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    const t = []
    const at = (ms, fn) => t.push(setTimeout(fn, ms))
    at(300,   () => setStep(1))
    at(1400,  () => { setStep(2); playRustle() })
    at(2400,  () => setStep(3))   // K1 s'écrit
    at(5600,  () => { setStep(4); playRustle() })   // cadeau apparaît
    at(6400,  () => setStep(5))   // cadeau glisse + V1 s'écrit
    at(9200,  () => { setStep(6); playTick() })
    at(9500,  () => playTick())
    at(9800,  () => { playTick(); setShake(true) })
    at(10300, () => {
      setStep(7); playBoom(); setFlash(true)
      setTimeout(() => setShake(false), 650)
      setTimeout(() => setFlash(false), 600)
    })
    at(11100, () => setStep(8))   // dialogue K2 s'écrit
    at(13200, () => { setStep(9); playEvilLaugh() })
    return () => t.forEach(clearTimeout)
  }, [])

  const CHAR_W = '30vmin'
  const CHAR_BOTTOM = '22%'
  const VICTIM_X = '30%'
  const KILLER_X = '66%'

  // Positions calculées (valeurs scalaires, pas d'arrays — transitions stables)
  const victimLeft    = step >= 1 ? VICTIM_X : '-20%'
  const victimOpacity = step === 0 ? 0 : (step >= 7 ? 0 : 1)
  const victimScale   = step >= 7 ? 0.3 : 1
  const victimBlur    = step >= 7 ? 'blur(10px)' : 'blur(0px)'

  const killerOpacity = step >= 2 ? 1 : 0
  const killerScaleKf = step === 9 ? [1, 1.08, 1, 1.08, 1] : 1
  const killerYKf     = step === 9 ? [0, -6, 0, -6, 0] : 0

  // Le cadeau : position et opacity pilotées
  const giftOpacity = (step >= 4 && step < 7) ? 1 : 0
  const giftLeft    = step >= 5 ? VICTIM_X : `calc(${KILLER_X} - 6vmin)`
  const giftBottom  = step >= 5 ? 'calc(22% + 14vmin)' : 'calc(22% + 10vmin)'
  const giftRotate  = step === 6 ? 6 : -6

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      <AlleyBackdrop />

      <motion.div
        className="absolute inset-0"
        animate={shake ? { x: [0, -8, 10, -6, 7, -3, 0], y: [0, 4, -3, 5, -2, 2, 0] } : { x: 0, y: 0 }}
        transition={shake ? { duration: 0.65 } : { duration: 0 }}
      >
        {/* Victime (toujours montée, opacity pilotée) */}
        <motion.img
          src={victim.avatar}
          alt=""
          animate={{
            left: victimLeft,
            opacity: victimOpacity,
            scale: victimScale,
            filter: victimBlur,
          }}
          transition={{
            left: { duration: 1.1, ease: 'easeOut' },
            opacity: { duration: 0.5 },
            scale: { duration: 0.5 },
          }}
          style={{
            position: 'absolute', bottom: CHAR_BOTTOM,
            width: CHAR_W, height: CHAR_W, objectFit: 'contain',
            transform: 'translateX(-50%)',
            filter: CUTOUT,
            zIndex: 5,
          }}
        />

        {/* Tueur (toujours monté, opacity pilotée) */}
        <motion.img
          src={killer.avatar}
          alt=""
          animate={{
            left: KILLER_X,
            opacity: killerOpacity,
            scale: killerScaleKf,
            y: killerYKf,
          }}
          transition={{
            opacity: { duration: 0.7 },
            scale: { duration: 0.6, repeat: step === 9 ? 2 : 0 },
            y: { duration: 0.6, repeat: step === 9 ? 2 : 0 },
          }}
          style={{
            position: 'absolute', bottom: CHAR_BOTTOM,
            width: CHAR_W, height: CHAR_W, objectFit: 'contain',
            transform: 'translateX(-50%) scaleX(-1)',
            filter: CUTOUT,
            zIndex: 5,
          }}
        />

        {/* Cadeau — toujours monté, opacity pilotée */}
        <motion.div
          animate={{
            left: giftLeft,
            bottom: giftBottom,
            opacity: giftOpacity,
            rotate: giftRotate,
          }}
          transition={{
            left: { duration: 1.2, ease: 'easeInOut' },
            bottom: { duration: 1.2 },
            opacity: { duration: 0.35 },
            rotate: { duration: 0.4, repeat: step === 6 ? 4 : 0, repeatType: 'reverse' },
          }}
          style={{
            position: 'absolute', width: '10vmin', height: '10vmin',
            transform: 'translateX(-50%)',
            filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.8))',
            zIndex: 6,
          }}
        >
          <GiftBox />
        </motion.div>

        {/* Explosion : montée seulement au step 7 */}
        <AnimatePresence>
          {step === 7 && (
            <ExplosionParticles key="boom" originLeft={VICTIM_X} originBottom={`calc(${CHAR_BOTTOM} + 15vmin)`} />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Flash blanc */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key="flash"
            className="absolute inset-0 bg-white pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, times: [0, 0.1, 0.4, 1] }}
          />
        )}
      </AnimatePresence>

      <Subtitle show={step === 3 || step === 4} speaker={killer.name}
        text={`${address(victim).monCher} ${victim.name}… j'ai un petit présent pour toi.`} />
      <Subtitle show={step === 5 || step === 6} speaker={victim.name}
        text="Pour… moi ? Tu n'aurais pas dû." />
      <Subtitle show={step >= 8} speaker={killer.name}
        text="Adieu, imbécile. MOUAHAHAHA !" />
    </motion.div>
  )
}

// ============================================================
// ================= SCÈNE 2 : POISON / TAVERNE ==============
// ============================================================
function Goblet({ tilt, mirror = false }) {
  // Les deux verres inclinent vers la droite quand on boit (direction choisie par Fred).
  return (
    <motion.svg viewBox="0 0 40 60" className="w-full h-full"
      animate={{ rotate: tilt ? 60 : 0 }}
      transition={{ duration: 0.5 }}
      style={{ transformOrigin: '50% 93%' }}
    >
      {/* pied */}
      <rect x="18" y="42" width="4" height="14" fill="#c09548" />
      <ellipse cx="20" cy="56" rx="10" ry="2.5" fill="#8a6a1f" />
      {/* coupe */}
      <path d="M 6 12 Q 6 40 20 42 Q 34 40 34 12 Z" fill="#d4a43d" stroke="#6a4a10" strokeWidth="1.5" />
      {/* vin */}
      <ellipse cx="20" cy="13" rx="13" ry="3" fill="#6a0a14" />
      <path d="M 7 13 Q 7 35 20 37 Q 33 35 33 13 Z" fill="#4a0810" opacity="0.7" />
      {/* highlight */}
      <ellipse cx="14" cy="18" rx="2" ry="5" fill="#fff" opacity="0.3" />
    </motion.svg>
  )
}

// POISON SCENE — Le tueur accueille sa "complice" avec son propre verre.
// Puis il offre un 2e verre, ils trinquent (verres s'inclinent vers l'extérieur), boivent.
// La victime est empoisonnée, s'effondre.
// Steps : 0=init, 1=victime entre, 2=tueur + son verre, 3=dialogue V, 4=2e verre apparaît + offre,
//         5=dialogue K, 6=ils trinquent (verres montent + tilt), 7=victime titube,
//         8=victime bascule, 9=dialogue K final, 10=rire.
function PoisonScene({ victim, killer }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const t = []
    const at = (ms, fn) => t.push(setTimeout(fn, ms))
    at(300,   () => setStep(1))
    at(1400,  () => { setStep(2); playRustle() })
    at(2400,  () => setStep(3))       // V1 s'écrit (~1.3s) + reste visible jusqu'à step 4
    at(4800,  () => { setStep(4); playRustle() })   // 2e verre apparaît + glisse
    at(5800,  () => setStep(5))       // K1 s'écrit
    at(8400,  () => setStep(6))       // ils trinquent et boivent
    at(9400,  () => { setStep(7); playThud() })    // victime titube (hue vert)
    at(10400, () => { setStep(8); playThud() })    // bascule
    at(11200, () => setStep(9))       // K2 s'écrit
    at(12800, () => { setStep(10); playEvilLaugh() })
    return () => t.forEach(clearTimeout)
  }, [])

  const CHAR_W = '28vmin'
  const CHAR_BOTTOM = '22%'
  const VICTIM_X = '30%'
  const KILLER_X = '65%'

  // Victime : position et orientation selon step
  const victimLeft = step >= 1 ? VICTIM_X : '-20%'
  const victimOpacity = step === 0 ? 0 : 1
  const victimRotate = step >= 8 ? 80 : 0
  const victimY = step >= 8 ? 40 : 0

  // Tueur
  const killerOpacity = step >= 2 ? 1 : 0
  const killerScaleKf = step === 10 ? [1, 1.08, 1, 1.08, 1] : 1
  const killerYKf     = step === 10 ? [0, -6, 0, -6, 0] : 0

  // Verre du tueur (toujours à sa main gauche = côté droit visuel : 60%, entre les 2 persos)
  // Apparaît au step 2 avec délai.
  const verreK_opacity = step >= 2 ? 1 : 0
  const verreK_left    = `calc(${KILLER_X} - 5vmin)`
  const verreK_bottom  = step === 6 ? 'calc(22% + 16vmin)' : 'calc(22% + 10vmin)'

  // Verre de la victime : apparaît au step 4 (le tueur le sort et l'offre). Glisse vers la victime.
  const verreV_opacity = (step >= 4 && step < 8) ? 1 : 0
  const verreV_left    = step >= 4 ? `calc(${VICTIM_X} + 2vmin)` : `calc(${KILLER_X} + 5vmin)`
  const verreV_bottom  = step === 6 ? 'calc(22% + 16vmin)' : 'calc(22% + 10vmin)'

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      <TavernBackdrop />

      {/* Victime */}
      <motion.img
        src={victim.avatar}
        alt=""
        animate={{
          left: victimLeft,
          opacity: victimOpacity,
          rotate: victimRotate,
          y: victimY,
        }}
        transition={{
          left:    { duration: 1.1, ease: 'easeOut' },
          opacity: { duration: 0.5 },
          rotate:  { duration: 0.8 },
          y:       { duration: 0.8 },
        }}
        style={{
          position: 'absolute', bottom: CHAR_BOTTOM,
          width: CHAR_W, height: CHAR_W, objectFit: 'contain',
          transform: 'translateX(-50%)',
          filter: step === 7 ? `${CUTOUT} hue-rotate(90deg) brightness(0.7)` : CUTOUT,
          transition: 'filter 0.4s',
          zIndex: 5,
        }}
      />

      {/* Tueur */}
      <motion.img
        src={killer.avatar}
        alt=""
        animate={{
          left: KILLER_X,
          opacity: killerOpacity,
          scale: killerScaleKf,
          y: killerYKf,
        }}
        transition={{
          opacity: { duration: 0.7 },
          scale:   { duration: 0.6, repeat: step === 10 ? 2 : 0 },
          y:       { duration: 0.6, repeat: step === 10 ? 2 : 0 },
        }}
        style={{
          position: 'absolute', bottom: CHAR_BOTTOM,
          width: CHAR_W, height: CHAR_W, objectFit: 'contain',
          transform: 'translateX(-50%) scaleX(-1)',
          filter: CUTOUT,
          zIndex: 5,
        }}
      />

      {/* Verre du TUEUR (le sien, à sa main gauche = côté intérieur). Présent dès step 2. */}
      <motion.div
        animate={{
          left: verreK_left,
          bottom: verreK_bottom,
          opacity: verreK_opacity,
        }}
        transition={{
          opacity: { duration: 0.5, delay: step === 2 ? 0.55 : 0 },
          bottom:  { duration: 0.5 },
        }}
        style={{
          position: 'absolute', width: '6vmin', height: '9vmin',
          transform: 'translateX(-50%)',
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.8))',
          zIndex: 6,
        }}
      >
        <Goblet tilt={step === 6} mirror />
      </motion.div>

      {/* Verre de la VICTIME : apparaît au step 4 (tueur le sort), glisse vers la victime. */}
      <motion.div
        animate={{
          left: verreV_left,
          bottom: verreV_bottom,
          opacity: verreV_opacity,
        }}
        transition={{
          opacity: { duration: 0.4 },
          left:    { duration: 1.1, ease: 'easeInOut' },
          bottom:  { duration: 0.5 },
        }}
        style={{
          position: 'absolute', width: '6vmin', height: '9vmin',
          transform: 'translateX(-50%)',
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.8))',
          zIndex: 6,
        }}
      >
        <Goblet tilt={step === 6} />
      </motion.div>

      <Subtitle show={step === 3} speaker={victim.name}
        text="Je ne refuse jamais un verre après un long voyage." />
      <Subtitle show={step === 5 || step === 6} speaker={killer.name}
        text="À ta santé. C'est un cru que j'ai gardé pour toi." />
      <Subtitle show={step >= 9} speaker={killer.name}
        text="Un bon vin ne s'oublie pas. Il emporte tout avec lui." />
    </motion.div>
  )
}

// ============================================================
// ================= SCÈNE 3 : TOIT / POUSSÉE ================
// ============================================================
// ROOFTOP SCENE — Victime arrive triomphante, tueur l'invite au bord, puis la pousse.
// Steps : 0=init, 1=victime entre, 2=tueur apparaît, 3=dialogue V, 4=tueur s'approche,
//         5=dialogue K, 6=tueur recule (élan), 7=PUSH + shock, 8=tueur regarde vide,
//         9=dialogue K final, 10=rire.
function RooftopScene({ victim, killer }) {
  const [step, setStep] = useState(0)
  const [shake, setShake] = useState(false)
  const [shock, setShock] = useState(false)

  useEffect(() => {
    const t = []
    const at = (ms, fn) => t.push(setTimeout(fn, ms))
    at(300,   () => setStep(1))
    at(1400,  () => setStep(2))
    at(2400,  () => setStep(3))
    at(5400,  () => setStep(4))
    at(6500,  () => setStep(5))
    at(8800,  () => setStep(6))
    at(9400,  () => {
      setStep(7)
      playThud()
      setShake(true); setShock(true)
      setTimeout(() => setShake(false), 400)
      setTimeout(() => setShock(false), 500)
    })
    at(10200, () => playThud())
    at(10700, () => setStep(8))
    at(11200, () => setStep(9))
    at(12600, () => { setStep(10); playEvilLaugh() })
    return () => t.forEach(clearTimeout)
  }, [])

  const CHAR_W = '28vmin'
  const CHAR_BOTTOM = '28%'
  const VICTIM_X = '31%'
  const KILLER_X_INIT = '68%'

  // Victime : positions scalaires (pas de keyframes conditionnels)
  const victimLeft    = step >= 7 ? '10%' : VICTIM_X
  const victimBottom  = step >= 7 ? '-50%' : CHAR_BOTTOM
  const victimOpacity = step === 0 ? 0 : (step >= 8 ? 0 : 1)
  const victimRotate  = step >= 7 ? -95 : 0
  const victimScale   = step >= 7 ? 0.35 : (step === 0 ? 0.85 : 1)

  // Tueur : positions selon step
  const killerLeft =
    step >= 8 ? '28%'
    : step === 7 ? `calc(${VICTIM_X} + 5vmin)`
    : step === 6 ? `calc(${VICTIM_X} + 16vmin)`
    : step >= 4 ? `calc(${VICTIM_X} + 12vmin)`
    : KILLER_X_INIT
  const killerOpacity = step >= 2 ? 1 : 0
  const killerY       = step === 8 ? 6 : 0
  const killerRotate  = step === 8 ? 10 : 0
  const killerScaleKf = step === 10 ? [1, 1.08, 1, 1.08, 1] : 1
  const killerYKf     = step === 10 ? [0, -6, 0, -6, 0] : killerY

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      <RooftopBackdrop />

      {/* Conteneur qui tremble au moment du push */}
      <motion.div
        className="absolute inset-0"
        animate={shake ? { x: [0, -6, 8, -4, 4, 0], y: [0, 3, -2, 3, 0] } : { x: 0, y: 0 }}
        transition={shake ? { duration: 0.4 } : { duration: 0 }}
      >
        {/* Victime — toujours montée */}
        <motion.img
          src={victim.avatar}
          alt=""
          animate={{
            left:    victimLeft,
            bottom:  victimBottom,
            opacity: victimOpacity,
            rotate:  victimRotate,
            scale:   victimScale,
          }}
          transition={{
            left:    { duration: step >= 7 ? 1 : 0.6, ease: step >= 7 ? 'easeIn' : 'easeOut' },
            bottom:  { duration: step >= 7 ? 1 : 0.6, ease: 'easeIn' },
            opacity: { duration: 0.5 },
            rotate:  { duration: step >= 7 ? 0.5 : 0.3 },
            scale:   { duration: step >= 7 ? 0.8 : 0.5 },
          }}
          style={{
            position: 'absolute',
            width: CHAR_W, height: CHAR_W, objectFit: 'contain',
            transform: 'translateX(-50%)',
            filter: CUTOUT,
            transformOrigin: '50% 100%',
            zIndex: 5,
          }}
        />

        {/* Tueur */}
        <motion.img
          src={killer.avatar}
          alt=""
          animate={{
            left:    killerLeft,
            opacity: killerOpacity,
            scale:   killerScaleKf,
            y:       killerYKf,
            rotate:  killerRotate,
          }}
          transition={{
            left:    { duration: step === 7 ? 0.35 : 1, ease: step === 7 ? 'easeIn' : 'easeInOut' },
            opacity: { duration: 0.7 },
            scale:   { duration: 0.6, repeat: step === 10 ? 2 : 0 },
            y:       { duration: 0.6, repeat: step === 10 ? 2 : 0 },
            rotate:  { duration: 0.5 },
          }}
          style={{
            position: 'absolute', bottom: CHAR_BOTTOM,
            width: CHAR_W, height: CHAR_W, objectFit: 'contain',
            transform: 'translateX(-50%) scaleX(-1)',
            filter: CUTOUT,
            transformOrigin: '50% 100%',
            zIndex: 5,
          }}
        />

        {/* Onde de choc au push */}
        <AnimatePresence>
          {shock && (
            <motion.div
              key="shock"
              initial={{ opacity: 0.9, scale: 0.1 }}
              animate={{ opacity: 0, scale: 3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: `calc(${VICTIM_X} + 3vmin)`,
                bottom: 'calc(28% + 10vmin)',
                width: '14vmin',
                height: '14vmin',
                borderRadius: '50%',
                border: '3px solid rgba(255,255,255,0.85)',
                transform: 'translate(-50%, 50%)',
                filter: 'blur(0.5px)',
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      <Subtitle show={step === 3} speaker={victim.name}
        text="Je monte rarement aussi haut. Quelle nuit claire…" />
      <Subtitle show={step === 4 || step === 5} speaker={killer.name}
        text="Avance au bord, la vue est imprenable d'ici." />
      <Subtitle show={step >= 9} speaker={killer.name}
        text="Le sommet n'est fait… que pour un seul." />
    </motion.div>
  )
}

// ============================================================
// ================= DÉCOR 4 : CRYPTE / CAVEAU ===============
// ============================================================
function CryptBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Mur pierre : dégradé sombre */}
      <div className="absolute inset-0" style={{
        background: `
          linear-gradient(180deg, #1a1612 0%, #0e0b08 65%, #040303 100%),
          repeating-linear-gradient(0deg, transparent 0 24px, rgba(0,0,0,0.5) 24px 25px),
          repeating-linear-gradient(90deg, transparent 0 48px, rgba(0,0,0,0.4) 48px 49px)
        `,
        backgroundBlendMode: 'normal, multiply, multiply',
      }} />
      {/* Fissures */}
      <svg className="absolute inset-0" preserveAspectRatio="none">
        <path d="M 100 0 Q 110 60 90 130 Q 85 200 120 280" stroke="rgba(0,0,0,0.5)" strokeWidth="1" fill="none" />
        <path d="M 600 20 Q 580 80 620 180 Q 590 260 630 340" stroke="rgba(0,0,0,0.5)" strokeWidth="1" fill="none" />
      </svg>
      {/* Torche à gauche avec flamme */}
      <div className="absolute" style={{
        top: '25%', left: '8%', width: '2vmin', height: '10vmin',
        background: 'linear-gradient(180deg, #2a1a0a 0%, #0a0604 100%)',
      }} />
      <motion.div
        animate={{ scaleY: [1, 1.12, 0.95, 1.08, 1], scaleX: [1, 0.92, 1.05, 0.96, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: 'calc(25% - 5vmin)', left: 'calc(8% - 1vmin)',
          width: '4vmin', height: '6vmin',
          background: 'radial-gradient(ellipse at 50% 100%, #fff4a0 0%, #ff9030 45%, #c83010 80%, transparent 100%)',
          borderRadius: '50% 50% 20% 20%',
          filter: 'blur(1px)',
          transformOrigin: '50% 100%',
        }}
      />
      {/* Halo de la torche */}
      <div className="absolute" style={{
        top: '18%', left: '-5%', width: '40vmin', height: '30vmin',
        background: 'radial-gradient(circle, rgba(255,140,40,0.22) 0%, transparent 70%)',
        filter: 'blur(6px)',
        pointerEvents: 'none',
      }} />

      {/* Torche à droite */}
      <div className="absolute" style={{
        top: '25%', right: '8%', width: '2vmin', height: '10vmin',
        background: 'linear-gradient(180deg, #2a1a0a 0%, #0a0604 100%)',
      }} />
      <motion.div
        animate={{ scaleY: [1, 0.95, 1.1, 0.97, 1], scaleX: [1, 1.04, 0.94, 1.02, 1] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        style={{
          position: 'absolute', top: 'calc(25% - 5vmin)', right: 'calc(8% - 1vmin)',
          width: '4vmin', height: '6vmin',
          background: 'radial-gradient(ellipse at 50% 100%, #fff4a0 0%, #ff9030 45%, #c83010 80%, transparent 100%)',
          borderRadius: '50% 50% 20% 20%',
          filter: 'blur(1px)',
          transformOrigin: '50% 100%',
        }}
      />
      <div className="absolute" style={{
        top: '18%', right: '-5%', width: '40vmin', height: '30vmin',
        background: 'radial-gradient(circle, rgba(255,140,40,0.22) 0%, transparent 70%)',
        filter: 'blur(6px)',
        pointerEvents: 'none',
      }} />

      {/* Sol en dalles */}
      <div className="absolute bottom-0 left-0 right-0" style={{
        height: '22%',
        background: `
          linear-gradient(180deg, #1f1a14 0%, #0a0604 100%),
          repeating-linear-gradient(0deg, transparent 0 18px, rgba(0,0,0,0.4) 18px 19px),
          repeating-linear-gradient(90deg, transparent 0 40px, rgba(0,0,0,0.4) 40px 41px)
        `,
        backgroundBlendMode: 'normal, multiply, multiply',
      }} />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 180px 60px rgba(0,0,0,0.95)' }} />
    </div>
  )
}

// ============================================================
// ================= SVG : DAGUE ==============================
// ============================================================
function Dagger() {
  return (
    <svg viewBox="0 0 40 80" className="w-full h-full">
      <defs>
        <linearGradient id="bladeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0f0f5" />
          <stop offset="50%" stopColor="#c0c0cc" />
          <stop offset="100%" stopColor="#707080" />
        </linearGradient>
        <linearGradient id="gardeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0a550" />
          <stop offset="100%" stopColor="#5a3810" />
        </linearGradient>
      </defs>
      {/* Lame */}
      <path d="M 20 3 L 23 5 L 23 50 L 20 56 L 17 50 L 17 5 Z" fill="url(#bladeGrad)" stroke="#20202a" strokeWidth="0.7" />
      {/* Reflet sur la lame */}
      <path d="M 19 8 L 21 8 L 21 46 L 19 48 Z" fill="#ffffff" opacity="0.4" />
      {/* Garde */}
      <rect x="8" y="50" width="24" height="4" fill="url(#gardeGrad)" stroke="#3a2408" strokeWidth="0.6" />
      {/* Poignée */}
      <rect x="17" y="54" width="6" height="18" fill="#3a1e08" stroke="#1a0e04" strokeWidth="0.6" />
      {/* Liens de cuir */}
      <line x1="17" y1="58" x2="23" y2="58" stroke="#1a0e04" strokeWidth="0.6" />
      <line x1="17" y1="62" x2="23" y2="62" stroke="#1a0e04" strokeWidth="0.6" />
      <line x1="17" y1="66" x2="23" y2="66" stroke="#1a0e04" strokeWidth="0.6" />
      {/* Pommeau */}
      <ellipse cx="20" cy="73" rx="4.5" ry="3" fill="url(#gardeGrad)" stroke="#3a2408" strokeWidth="0.6" />
    </svg>
  )
}

// ============================================================
// ================= SCÈNE 4 : DAGUE / BAISER DE JUDAS =======
// ============================================================
// DAGGER SCENE — Ils s'embrassent, le tueur plante une dague. La victime recule, s'écroule.
// Steps : 0=init, 1=victime entre triomphante, 2=tueur apparaît, 3=dialogue V,
//         4=ils s'approchent, 5=embrassade, 6=dague apparaît au-dessus,
//         7=coup porté + flash rouge + shake, 8=victime recule et s'affaisse,
//         9=dialogue K final, 10=rire.
function DaggerScene({ victim, killer }) {
  const [step, setStep] = useState(0)
  const [shake, setShake] = useState(false)
  const [flashRed, setFlashRed] = useState(false)

  useEffect(() => {
    const t = []
    const at = (ms, fn) => t.push(setTimeout(fn, ms))
    at(300,   () => setStep(1))
    at(1400,  () => setStep(2))
    at(2400,  () => setStep(3))
    at(5400,  () => setStep(4))
    at(6600,  () => setStep(5))   // embrassade
    at(7800,  () => setStep(6))   // dague apparaît
    at(8600,  () => {
      setStep(7); playThud()
      setShake(true); setFlashRed(true)
      setTimeout(() => setShake(false), 400)
      setTimeout(() => setFlashRed(false), 600)
    })
    at(9500,  () => setStep(8))   // victime recule
    at(10800, () => setStep(9))   // dialogue K2
    at(12400, () => { setStep(10); playEvilLaugh() })
    return () => t.forEach(clearTimeout)
  }, [])

  const CHAR_W = '30vmin'
  const CHAR_BOTTOM = '22%'
  const VICTIM_X_INIT = '28%'
  const KILLER_X_INIT = '68%'

  // Positions victime
  const victimLeft =
    step >= 8 ? '28%'
    : step >= 5 ? '42%'                                  // embrassade (se rejoint au centre)
    : step >= 4 ? `calc(${VICTIM_X_INIT} + 8vmin)`       // s'approche
    : step >= 1 ? VICTIM_X_INIT
    : '-20%'
  const victimOpacity = step === 0 ? 0 : (step >= 9 ? 0 : 1)
  const victimRotate  = step >= 8 ? 30 : 0
  const victimY       = step >= 8 ? 30 : 0
  const victimScale   = step >= 8 ? 0.85 : 1

  // Positions tueur
  const killerLeft =
    step >= 5 ? '54%'                                    // embrassade
    : step >= 4 ? `calc(${KILLER_X_INIT} - 8vmin)`
    : KILLER_X_INIT
  const killerOpacity = step >= 2 ? 1 : 0
  const killerScaleKf = step === 10 ? [1, 1.08, 1, 1.08, 1] : 1
  const killerYKf     = step === 10 ? [0, -6, 0, -6, 0] : 0

  // Dague
  const daggerOpacity = (step >= 6 && step < 9) ? 1 : 0
  const daggerLeft    = step >= 7 ? '44%' : '54%'
  const daggerBottom  = step >= 7 ? `calc(${CHAR_BOTTOM} + 8vmin)` : `calc(${CHAR_BOTTOM} + 14vmin)`
  const daggerRotate  = step >= 7 ? -85 : -25

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      <AlleyBackdrop />

      <motion.div
        className="absolute inset-0"
        animate={shake ? { x: [0, -5, 6, -3, 0] } : { x: 0 }}
        transition={shake ? { duration: 0.4 } : { duration: 0 }}
      >
        {/* Victime */}
        <motion.img
          src={victim.avatar}
          alt=""
          animate={{
            left: victimLeft,
            opacity: victimOpacity,
            rotate: victimRotate,
            y: victimY,
            scale: victimScale,
          }}
          transition={{
            left:    { duration: 1, ease: 'easeInOut' },
            opacity: { duration: 0.5 },
            rotate:  { duration: 0.6 },
            y:       { duration: 0.8 },
            scale:   { duration: 0.6 },
          }}
          style={{
            position: 'absolute', bottom: CHAR_BOTTOM,
            width: CHAR_W, height: CHAR_W, objectFit: 'contain',
            transform: 'translateX(-50%)',
            filter: CUTOUT,
            zIndex: 5,
          }}
        />

        {/* Tueur */}
        <motion.img
          src={killer.avatar}
          alt=""
          animate={{
            left: killerLeft,
            opacity: killerOpacity,
            scale: killerScaleKf,
            y: killerYKf,
          }}
          transition={{
            left:    { duration: 1, ease: 'easeInOut' },
            opacity: { duration: 0.7 },
            scale:   { duration: 0.6, repeat: step === 10 ? 2 : 0 },
            y:       { duration: 0.6, repeat: step === 10 ? 2 : 0 },
          }}
          style={{
            position: 'absolute', bottom: CHAR_BOTTOM,
            width: CHAR_W, height: CHAR_W, objectFit: 'contain',
            transform: 'translateX(-50%) scaleX(-1)',
            filter: CUTOUT,
            zIndex: 6,
          }}
        />

        {/* Dague */}
        <motion.div
          animate={{
            left: daggerLeft,
            bottom: daggerBottom,
            opacity: daggerOpacity,
            rotate: daggerRotate,
          }}
          transition={{ duration: 0.35, ease: 'easeIn' }}
          style={{
            position: 'absolute', width: '6vmin', height: '12vmin',
            transform: 'translateX(-50%)',
            filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.8))',
            zIndex: 7,
          }}
        >
          <Dagger />
        </motion.div>
      </motion.div>

      {/* Flash rouge */}
      <AnimatePresence>
        {flashRed && (
          <motion.div
            key="flashR"
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0.2, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, times: [0, 0.15, 0.5, 1] }}
            style={{ background: 'rgba(160,10,10,0.6)' }}
          />
        )}
      </AnimatePresence>

      <Subtitle show={step === 3} speaker={victim.name}
        text="Tu m'as convoqué comme un frère. Me voilà." />
      <Subtitle show={step === 4 || step === 5} speaker={killer.name}
        text="Viens dans mes bras, il est temps que je te remercie." />
      <Subtitle show={step >= 9} speaker={killer.name}
        text="Même les frères se poignardent. Surtout les frères." />
    </motion.div>
  )
}

// ============================================================
// ================= SCÈNE 5 : TRAPPE OUBLIÉE ================
// ============================================================
// TRAPDOOR SCENE — Crypte. Tueur invite la victime à avancer sur une dalle. La dalle bascule.
// Steps : 0=init, 1=tueur entre, 2=victime entre, 3=dialogue K (invitation),
//         4=victime avance sur la dalle, 5=dialogue V, 6=la dalle s'ouvre (victime tombe),
//         7=dalle fermée, 8=dialogue K final, 9=rire.
function TrapdoorScene({ victim, killer }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const t = []
    const at = (ms, fn) => t.push(setTimeout(fn, ms))
    at(300,   () => setStep(1))
    at(1400,  () => setStep(2))
    at(2500,  () => setStep(3))
    at(5500,  () => setStep(4))
    at(7000,  () => setStep(5))
    at(9300,  () => playTick())
    at(9400,  () => { setStep(6); playThud() })
    at(10200, () => playThud())
    at(11000, () => setStep(7))
    at(11600, () => setStep(8))
    at(13200, () => { setStep(9); playEvilLaugh() })
    return () => t.forEach(clearTimeout)
  }, [])

  const CHAR_W = '28vmin'
  const CHAR_BOTTOM = '22%'
  const VICTIM_X = '45%'
  const KILLER_X = '72%'
  const TRAP_X   = '45%'

  // Victime : entre par la gauche, avance, tombe au step 6
  const victimLeft    = step >= 4 ? VICTIM_X : step >= 2 ? '22%' : '-15%'
  const victimBottom  = step >= 6 ? '-40%' : CHAR_BOTTOM
  const victimOpacity = step === 0 ? 0 : (step >= 7 ? 0 : 1)
  const victimRotate  = step >= 6 ? 40 : 0
  const victimScale   = step >= 6 ? 0.4 : 1

  // Tueur : toujours visible après entrée
  const killerOpacity = step >= 1 ? 1 : 0
  const killerScaleKf = step === 9 ? [1, 1.08, 1, 1.08, 1] : 1
  const killerYKf     = step === 9 ? [0, -6, 0, -6, 0] : (step === 8 ? -3 : 0)

  // Dalle : rotateX 90° quand elle est ouverte (step 6)
  const dalleRotateX = step === 6 ? 90 : 0
  const holeOpacity  = step === 6 ? 1 : 0

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      <CryptBackdrop />

      {/* Trou dans le sol (noir) */}
      <motion.div
        animate={{ opacity: holeOpacity }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute', bottom: '19%', left: TRAP_X,
          width: '18vmin', height: '6vmin',
          transform: 'translateX(-50%)',
          background: 'radial-gradient(ellipse, #000 0%, #000 60%, rgba(0,0,0,0.7) 100%)',
          borderRadius: '50% / 40%',
          boxShadow: 'inset 0 6px 14px rgba(0,0,0,0.95)',
          zIndex: 4,
        }}
      />

      {/* La dalle */}
      <motion.div
        animate={{ rotateX: dalleRotateX }}
        transition={{ duration: 0.4, ease: 'easeIn' }}
        style={{
          position: 'absolute', bottom: '22%', left: TRAP_X,
          width: '18vmin', height: '2vmin',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(180deg, #3a2c1e 0%, #1a1208 100%)',
          border: '1px solid #0a0604',
          transformOrigin: '50% 0%',
          backfaceVisibility: 'hidden',
          zIndex: 3,
        }}
      />
      {/* Ligne du contour de la trappe au sol */}
      <div style={{
        position: 'absolute',
        bottom: 'calc(22% - 0.1vmin)', left: TRAP_X,
        width: '18vmin', height: '0.2vmin',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.7)',
        zIndex: 2,
      }} />

      {/* Tueur */}
      <motion.img
        src={killer.avatar}
        alt=""
        animate={{
          left: KILLER_X,
          opacity: killerOpacity,
          scale: killerScaleKf,
          y: killerYKf,
        }}
        transition={{
          opacity: { duration: 0.7 },
          scale:   { duration: 0.6, repeat: step === 9 ? 2 : 0 },
          y:       { duration: 0.6, repeat: step === 9 ? 2 : 0 },
        }}
        style={{
          position: 'absolute', bottom: CHAR_BOTTOM,
          width: CHAR_W, height: CHAR_W, objectFit: 'contain',
          transform: 'translateX(-50%) scaleX(-1)',
          filter: CUTOUT,
          zIndex: 5,
        }}
      />

      {/* Victime */}
      <motion.img
        src={victim.avatar}
        alt=""
        animate={{
          left: victimLeft,
          bottom: victimBottom,
          opacity: victimOpacity,
          rotate: victimRotate,
          scale: victimScale,
        }}
        transition={{
          left:    { duration: 1.1, ease: 'easeInOut' },
          bottom:  { duration: step >= 6 ? 0.7 : 0.5, ease: 'easeIn' },
          opacity: { duration: 0.5 },
          rotate:  { duration: 0.7 },
          scale:   { duration: 0.7 },
        }}
        style={{
          position: 'absolute',
          width: CHAR_W, height: CHAR_W, objectFit: 'contain',
          transform: 'translateX(-50%)',
          filter: CUTOUT,
          zIndex: 5,
        }}
      />

      <Subtitle show={step === 3} speaker={killer.name}
        text={`Avance donc, ${address(victim).monCherLow}. J'ai quelque chose à te montrer.`} />
      <Subtitle show={step === 5} speaker={victim.name}
        text="Où cela ? Je ne vois rien ici…" />
      <Subtitle show={step >= 8} speaker={killer.name}
        text="La sortie était sous tes pieds." />
    </motion.div>
  )
}

// ============================================================
// ================= SVG : PEAU DE BANANE =====================
// ============================================================
function BananaPeel() {
  return (
    <svg viewBox="0 0 100 50" className="w-full h-full">
      <defs>
        <radialGradient id="peelGrad" cx="0.5" cy="0.4">
          <stop offset="0%" stopColor="#fae462" />
          <stop offset="70%" stopColor="#e0b820" />
          <stop offset="100%" stopColor="#9a7010" />
        </radialGradient>
      </defs>
      {/* Forme étalée de la peau (étoile irrégulière) */}
      <path d="M 50 6 Q 20 12 10 34 Q 22 28 35 38 Q 48 50 60 38 Q 76 28 90 34 Q 78 12 50 6 Z"
            fill="url(#peelGrad)" stroke="#6a4e08" strokeWidth="1.2" />
      {/* Reliefs sombres */}
      <path d="M 30 16 Q 35 22 40 18" stroke="#8a6410" strokeWidth="0.9" fill="none" opacity="0.7" />
      <path d="M 60 18 Q 65 22 70 16" stroke="#8a6410" strokeWidth="0.9" fill="none" opacity="0.7" />
      <ellipse cx="50" cy="28" rx="8" ry="3" fill="#c29510" opacity="0.5" />
    </svg>
  )
}

// ============================================================
// ================= SCÈNE 6 : PEAU DE BANANE (comique) ======
// ============================================================
// BANANA SCENE — Le tueur pose une peau de banane, la victime arrive triomphante, glisse.
// Steps : 0=init, 1=tueur apparaît, 2=peau visible au sol, 3=victime entre,
//         4=dialogue V, 5=dialogue K, 6=victime avance, 7=GLISSE (vol plané),
//         8=hors écran, 9=dialogue K final, 10=rire.
// La glissade est la SEULE animation avec keyframes (nécessaire pour le vol parabolique).
function BananaScene({ victim, killer }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const t = []
    const at = (ms, fn) => t.push(setTimeout(fn, ms))
    at(300,   () => setStep(1))
    at(1800,  () => { setStep(2); playRustle() })
    at(2800,  () => setStep(3))
    at(3900,  () => setStep(4))
    at(6000,  () => setStep(5))
    at(8400,  () => setStep(6))
    at(9400,  () => { setStep(7); playRustle() })
    at(10300, () => playThud())
    at(10700, () => setStep(8))
    at(11400, () => setStep(9))
    at(13000, () => { setStep(10); playEvilLaugh() })
    return () => t.forEach(clearTimeout)
  }, [])

  const CHAR_W = '30vmin'
  const CHAR_BOTTOM = '22%'
  const VICTIM_X_INIT = '18%'
  const KILLER_X_INIT = '74%'
  const BANANA_X = '48%'

  // Peau : toujours rendue, opacity pilotée
  const peelOpacity = step >= 2 ? 1 : 0

  // Tueur
  const killerOpacity = step >= 1 ? 1 : 0
  const killerScaleKf = step === 10 ? [1, 1.08, 1, 1.08, 1] : 1
  const killerYKf     = step === 10 ? [0, -6, 0, -6, 0] : 0

  // Victime (hors phase glissade) : entrée par la gauche, avance au step 6
  const victimLeftRest    = step >= 6 ? '38%' : step >= 3 ? VICTIM_X_INIT : '-20%'
  const victimOpacityRest = step === 0 || step < 3 ? 0 : 1

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      <TavernBackdrop />

      {/* Peau de banane au sol */}
      <motion.div
        animate={{ opacity: peelOpacity, scale: peelOpacity ? 1 : 0.6 }}
        transition={{ duration: 0.4 }}
        style={{
          position: 'absolute',
          bottom: 'calc(22% + 0.2vmin)',
          left: BANANA_X,
          width: '8vmin', height: '4vmin',
          transform: 'translateX(-50%)',
          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.7))',
          zIndex: 3,
        }}
      >
        <BananaPeel />
      </motion.div>

      {/* Tueur */}
      <motion.img
        src={killer.avatar}
        alt=""
        animate={{
          left: KILLER_X_INIT,
          opacity: killerOpacity,
          scale: killerScaleKf,
          y: killerYKf,
        }}
        transition={{
          opacity: { duration: 0.7 },
          scale:   { duration: 0.6, repeat: step === 10 ? 2 : 0 },
          y:       { duration: 0.6, repeat: step === 10 ? 2 : 0 },
        }}
        style={{
          position: 'absolute', bottom: CHAR_BOTTOM,
          width: CHAR_W, height: CHAR_W, objectFit: 'contain',
          transform: 'translateX(-50%) scaleX(-1)',
          filter: CUTOUT,
          zIndex: 5,
        }}
      />

      {/* Victime : phase normale avant step 7, phase glissade à partir de step 7 */}
      {step < 7 ? (
        <motion.img
          key="v-norm"
          src={victim.avatar}
          alt=""
          animate={{
            left: victimLeftRest,
            opacity: victimOpacityRest,
            bottom: CHAR_BOTTOM,
            rotate: 0,
            scale: 1,
          }}
          transition={{
            left:    { duration: 1.1, ease: 'easeInOut' },
            opacity: { duration: 0.5 },
          }}
          style={{
            position: 'absolute',
            width: CHAR_W, height: CHAR_W, objectFit: 'contain',
            transform: 'translateX(-50%)',
            filter: CUTOUT,
            zIndex: 6,
            transformOrigin: '50% 50%',
          }}
        />
      ) : (
        <motion.img
          key="v-slip"
          src={victim.avatar}
          alt=""
          initial={{
            left: '38%', bottom: CHAR_BOTTOM, rotate: 0, scale: 1, opacity: 1,
          }}
          animate={{
            left:    ['38%', '52%', '66%', '80%'],
            bottom:  [CHAR_BOTTOM, 'calc(22% + 18vmin)', 'calc(22% + 10vmin)', '-12%'],
            rotate:  [0, 180, 360, 540],
            scale:   [1, 1, 0.9, 0.55],
            opacity: [1, 1, 1, 0],
          }}
          transition={{
            left:    { duration: 1.3, times: [0, 0.18, 0.55, 1], ease: 'easeOut' },
            bottom:  { duration: 1.3, times: [0, 0.3, 0.6, 1], ease: 'easeIn' },
            rotate:  { duration: 1.3, times: [0, 0.2, 0.55, 1], ease: 'linear' },
            scale:   { duration: 1.3 },
            opacity: { duration: 1.3, times: [0, 0.3, 0.75, 1] },
          }}
          style={{
            position: 'absolute',
            width: CHAR_W, height: CHAR_W, objectFit: 'contain',
            transform: 'translateX(-50%)',
            filter: CUTOUT,
            zIndex: 6,
            transformOrigin: '50% 50%',
          }}
        />
      )}

      <Subtitle show={step === 4} speaker={victim.name}
        text="L'auberge est paisible ce soir. Tu m'attendais ?" />
      <Subtitle show={step === 5 || step === 6} speaker={killer.name}
        text="Approche, j'ai préparé une petite surprise pour toi." />
      <Subtitle show={step >= 9} speaker={killer.name}
        text="Un roi qui trébuche… n'est plus un roi." />
    </motion.div>
  )
}

// ============================================================
// ================= DÉCOR 5 : FORÊT BRUMEUSE ================
// ============================================================
function ForestBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #020a12 0%, #041014 35%, #06140c 75%, #020604 100%)',
      }} />
      {/* Lune discrète */}
      <div className="absolute" style={{
        top: '12%', right: '20%', width: '80px', height: '80px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(220,230,200,0.5) 0%, transparent 70%)',
        filter: 'blur(3px)',
      }} />
      {/* Silhouettes d'arbres au fond (rangée arrière) */}
      <svg className="absolute" style={{ bottom: '22%', left: 0, width: '100%', height: '40%' }} viewBox="0 0 400 160" preserveAspectRatio="none">
        {Array.from({ length: 14 }).map((_, i) => (
          <polygon key={i}
            points={`${20 + i * 28},160 ${10 + i * 28},110 ${30 + i * 28},110 ${20 + i * 28},60 ${36 + i * 28},110 ${40 + i * 28},110`}
            fill="#020804" opacity="0.85" />
        ))}
      </svg>
      {/* Arbres proches */}
      <svg className="absolute" style={{ bottom: '18%', left: 0, width: '100%', height: '55%' }} viewBox="0 0 400 200" preserveAspectRatio="none">
        <polygon points="5,200 5,120 -10,120 20,50 50,120 35,120 35,200" fill="#010402" />
        <polygon points="360,200 360,130 340,130 380,40 420,130 400,130 400,200" fill="#010402" />
      </svg>
      {/* Sol (feuilles mortes) */}
      <div className="absolute bottom-0 left-0 right-0" style={{
        height: '22%',
        background: 'linear-gradient(180deg, #1a1408 0%, #050402 100%)',
      }} />
      {/* Brume mobile */}
      <motion.div
        animate={{ x: ['-10%', '110%'], opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        className="absolute"
        style={{
          bottom: '25%', width: '60vmin', height: '12vmin',
          background: 'radial-gradient(ellipse, rgba(200,220,200,0.2) 0%, transparent 70%)',
          filter: 'blur(8px)',
        }}
      />
      {/* Paire d'yeux inquiétants (loin) */}
      <motion.div
        animate={{ opacity: [0.6, 1, 0.5, 0.9, 0.6] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        className="absolute"
        style={{ bottom: '40%', right: '38%', width: '2px', height: '2px', background: '#ffa020', boxShadow: '0 0 4px 1px rgba(255,160,30,0.8)' }}
      />
      <motion.div
        animate={{ opacity: [0.5, 1, 0.6, 0.9, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.2 }}
        className="absolute"
        style={{ bottom: '40%', right: 'calc(38% - 8px)', width: '2px', height: '2px', background: '#ffa020', boxShadow: '0 0 4px 1px rgba(255,160,30,0.8)' }}
      />
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 200px 70px rgba(0,0,0,0.95)' }} />
    </div>
  )
}

// ============================================================
// ================= DÉCOR 6 : SALON / CHEMINÉE ==============
// ============================================================
function ParlorBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Mur bordeaux */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #3a1a1e 0%, #2a0e12 60%, #140608 100%)',
      }} />
      {/* Moulures (lignes horizontales) */}
      <div className="absolute" style={{ top: '30%', left: 0, right: 0, height: '2px', background: 'rgba(180,140,80,0.25)' }} />
      <div className="absolute" style={{ top: '32%', left: 0, right: 0, height: '1px', background: 'rgba(180,140,80,0.15)' }} />
      {/* Tableau à gauche */}
      <div className="absolute" style={{
        top: '12%', left: '14%', width: '12vmin', height: '16vmin',
        background: 'linear-gradient(180deg, #1a0a04 0%, #0a0402 100%)',
        border: '3px solid #7a5a20',
        boxShadow: '2px 3px 6px rgba(0,0,0,0.6)',
      }}>
        <div style={{ position: 'absolute', inset: '10%', background: 'linear-gradient(180deg, #4a2a1a 0%, #1a0a04 100%)' }} />
      </div>
      {/* Tableau à droite */}
      <div className="absolute" style={{
        top: '14%', right: '14%', width: '10vmin', height: '14vmin',
        background: 'linear-gradient(180deg, #1a0a04 0%, #0a0402 100%)',
        border: '3px solid #7a5a20',
      }}>
        <div style={{ position: 'absolute', inset: '10%', background: 'radial-gradient(circle, #5a3020 0%, #1a0a04 100%)' }} />
      </div>
      {/* Cheminée au centre */}
      <div className="absolute" style={{
        bottom: '22%', left: '50%', transform: 'translateX(-50%)',
        width: '30vmin', height: '28vmin',
        background: 'linear-gradient(180deg, #2a1608 0%, #1a0c04 60%, #0a0604 100%)',
        borderRadius: '6px 6px 0 0',
        border: '2px solid #140804',
        boxShadow: 'inset 0 3px 6px rgba(255,200,100,0.15), 0 4px 10px rgba(0,0,0,0.7)',
      }}>
        {/* Ouverture de cheminée (noir) */}
        <div style={{
          position: 'absolute', left: '18%', right: '18%', top: '18%', bottom: '12%',
          background: 'linear-gradient(180deg, #000 0%, #1a0a04 100%)',
          borderRadius: '4px 4px 0 0',
          overflow: 'hidden',
        }}>
          {/* Flammes animées */}
          <motion.div
            animate={{ scaleY: [1, 1.15, 0.95, 1.1, 1], scaleX: [1, 0.9, 1.05, 0.95, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{
              position: 'absolute', bottom: 0, left: '15%', right: '15%', height: '60%',
              background: 'radial-gradient(ellipse at 50% 100%, #fff3a0 0%, #ff9030 45%, #c23010 80%, transparent 100%)',
              borderRadius: '40% 40% 20% 20%',
              filter: 'blur(1.5px)',
              transformOrigin: '50% 100%',
            }}
          />
          {/* Bûches */}
          <div style={{
            position: 'absolute', bottom: '2%', left: '20%', width: '30%', height: '8%',
            background: 'linear-gradient(180deg, #4a2810 0%, #1a0c04 100%)',
            borderRadius: '3px',
          }} />
          <div style={{
            position: 'absolute', bottom: '2%', right: '20%', width: '30%', height: '8%',
            background: 'linear-gradient(180deg, #3a2010 0%, #1a0c04 100%)',
            borderRadius: '3px',
          }} />
        </div>
      </div>
      {/* Halo cheminée */}
      <div className="absolute" style={{
        bottom: '15%', left: '50%', transform: 'translateX(-50%)',
        width: '55vmin', height: '35vmin',
        background: 'radial-gradient(ellipse, rgba(255,140,40,0.2) 0%, transparent 70%)',
        filter: 'blur(8px)',
        pointerEvents: 'none',
      }} />
      {/* Plancher bois */}
      <div className="absolute bottom-0 left-0 right-0" style={{
        height: '22%',
        background: 'linear-gradient(180deg, #3a1e08 0%, #1a0e04 100%)',
      }} />
      <svg className="absolute bottom-0 left-0 right-0" style={{ height: '22%' }} viewBox="0 0 100 20" preserveAspectRatio="none">
        <line x1="0" y1="6" x2="100" y2="6" stroke="#0a0402" strokeWidth="0.3" />
        <line x1="0" y1="13" x2="100" y2="13" stroke="#0a0402" strokeWidth="0.3" />
      </svg>
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 180px 60px rgba(0,0,0,0.92)' }} />
    </div>
  )
}

// ============================================================
// ================= DÉCOR 7 : LABORATOIRE ====================
// ============================================================
function LabBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Mur métallique sombre */}
      <div className="absolute inset-0" style={{
        background: `
          linear-gradient(180deg, #0c1624 0%, #081018 50%, #040608 100%),
          repeating-linear-gradient(90deg, transparent 0 60px, rgba(0,0,0,0.4) 60px 61px)
        `,
        backgroundBlendMode: 'normal, multiply',
      }} />
      {/* Machine Tesla à gauche (globe avec éclairs) */}
      <div className="absolute" style={{
        top: '18%', left: '6%', width: '14vmin', height: '14vmin',
      }}>
        {/* pied */}
        <div style={{
          position: 'absolute', bottom: 0, left: '30%', width: '40%', height: '30%',
          background: 'linear-gradient(180deg, #3a3a48 0%, #14141c 100%)',
        }} />
        {/* sphère */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '70%',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #6a92ff 0%, #2a52a8 50%, #0a1428 90%)',
          boxShadow: 'inset 0 0 20px rgba(100,160,255,0.4), 0 0 30px 8px rgba(80,140,255,0.35)',
        }} />
        {/* éclairs */}
        <motion.div
          animate={{ opacity: [0.4, 1, 0.3, 0.9, 0.5] }}
          transition={{ duration: 0.4, repeat: Infinity }}
          style={{
            position: 'absolute', top: '8%', left: '15%', width: '70%', height: '55%',
            background: 'radial-gradient(circle, rgba(180,220,255,0.6) 0%, transparent 70%)',
            filter: 'blur(2px)',
          }}
        />
      </div>
      {/* Étagère avec fioles à droite */}
      <svg className="absolute" style={{ top: '20%', right: '5%', width: '18%', height: '25%' }} viewBox="0 0 140 110" preserveAspectRatio="none">
        <rect x="0" y="45" width="140" height="4" fill="#14141c" />
        <rect x="0" y="95" width="140" height="4" fill="#14141c" />
        {[10,32,54,76,98,120].map((x, i) => (
          <g key={i}>
            <rect x={x} y="15" width="12" height="30" fill={['#4a7a28','#7a2030','#287088','#c08020','#50308a','#20a078'][i]} opacity="0.8" />
            <rect x={x+3} y="10" width="6" height="6" fill="#0a0a14" />
          </g>
        ))}
        {[10,32,54,76,98,120].map((x, i) => (
          <g key={`row2-${i}`}>
            <rect x={x} y="65" width="12" height="30" fill={['#8a2070','#208a40','#5030a0','#a04020','#2050a0','#a08020'][i]} opacity="0.8" />
            <rect x={x+3} y="60" width="6" height="6" fill="#0a0a14" />
          </g>
        ))}
      </svg>
      {/* Établi au centre */}
      <div className="absolute" style={{
        bottom: '22%', left: '30%', right: '30%', height: '4vmin',
        background: 'linear-gradient(180deg, #2a2a34 0%, #14141c 100%)',
        border: '1px solid #04040c',
        boxShadow: '0 4px 10px rgba(0,0,0,0.7)',
      }} />
      {/* Sol */}
      <div className="absolute bottom-0 left-0 right-0" style={{
        height: '22%',
        background: `
          linear-gradient(180deg, #181820 0%, #06060a 100%),
          repeating-linear-gradient(90deg, transparent 0 50px, rgba(0,0,0,0.4) 50px 51px)
        `,
        backgroundBlendMode: 'normal, multiply',
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 180px 60px rgba(0,0,0,0.9)' }} />
    </div>
  )
}

// ============================================================
// ================= DÉCOR 8 : PONT SUR GORGE ================
// ============================================================
function BridgeBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Ciel crépusculaire */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #1a1528 0%, #2a1820 40%, #3a1810 65%, #1a0a08 100%)',
      }} />
      {/* Soleil couchant */}
      <div className="absolute" style={{
        top: '30%', left: '50%', transform: 'translateX(-50%)',
        width: '90px', height: '90px', borderRadius: '50%',
        background: 'radial-gradient(circle, #ff8030 0%, #c02808 60%, transparent 90%)',
        filter: 'blur(2px)',
        boxShadow: '0 0 70px 20px rgba(255,80,20,0.3)',
      }} />
      {/* Montagnes au fond */}
      <svg className="absolute" style={{ bottom: '38%', left: 0, width: '100%', height: '20%' }} viewBox="0 0 400 80" preserveAspectRatio="none">
        <polygon points="0,80 0,40 60,20 110,50 160,15 220,45 280,25 340,40 400,30 400,80" fill="#0a0608" />
      </svg>
      {/* Gorge (vide très noir en bas) */}
      <div className="absolute" style={{
        bottom: 0, left: 0, right: 0, height: '40%',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000 70%)',
      }} />
      {/* Falaise à gauche */}
      <div className="absolute" style={{
        bottom: 0, left: 0, width: '18%', height: '45%',
        background: 'linear-gradient(90deg, #1a1410 0%, #2a1e18 70%, #0a0804 100%)',
        boxShadow: '6px 0 14px rgba(0,0,0,0.8)',
      }} />
      {/* Falaise à droite */}
      <div className="absolute" style={{
        bottom: 0, right: 0, width: '18%', height: '45%',
        background: 'linear-gradient(270deg, #1a1410 0%, #2a1e18 70%, #0a0804 100%)',
        boxShadow: '-6px 0 14px rgba(0,0,0,0.8)',
      }} />
      {/* Deux cordes horizontales du pont (rail supérieur) */}
      <div className="absolute" style={{
        bottom: '40%', left: '18%', right: '18%', height: '2px',
        background: '#8a5a28',
        boxShadow: '0 1px 2px rgba(0,0,0,0.8)',
      }} />
      <div className="absolute" style={{
        bottom: '39%', left: '18%', right: '18%', height: '2px',
        background: '#5a3818',
        boxShadow: '0 1px 2px rgba(0,0,0,0.8)',
      }} />
      {/* Planches du tablier du pont */}
      <svg className="absolute" style={{ bottom: '33%', left: '18%', right: '18%', height: '3vmin' }} viewBox="0 0 100 6" preserveAspectRatio="none">
        {Array.from({ length: 30 }).map((_, i) => (
          <rect key={i} x={i * 3.3} y="0" width="3" height="6" fill={i % 2 ? '#4a2a14' : '#3a1e08'} stroke="#1a0e04" strokeWidth="0.2" />
        ))}
      </svg>
      {/* Cordes d'attache verticales */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="absolute" style={{
          bottom: '36%', left: `${18 + 6.4 * i}%`, width: '1px', height: '4vmin',
          background: '#5a3818',
        }} />
      ))}
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 180px 60px rgba(0,0,0,0.92)' }} />
    </div>
  )
}

// ============================================================
// ================= DÉCOR 9 : COUR / PUITS ==================
// ============================================================
function CourtyardBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Ciel nuit étoilée */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #050814 0%, #0e1422 45%, #1a1a14 75%, #050408 100%)',
      }} />
      {/* Quelques étoiles */}
      {Array.from({ length: 25 }).map((_, i) => (
        <div key={i} className="absolute rounded-full bg-white"
          style={{
            left: `${(i * 37) % 100}%`, top: `${(i * 17) % 40}%`,
            width: '1.5px', height: '1.5px', opacity: 0.6,
          }}
        />
      ))}
      {/* Mur du château à l'arrière */}
      <div className="absolute" style={{
        bottom: '32%', left: 0, right: 0, height: '30%',
        background: 'linear-gradient(180deg, #2a2420 0%, #14100a 100%)',
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent 0 24px, rgba(0,0,0,0.35) 24px 25px),
          repeating-linear-gradient(90deg, transparent 0 40px, rgba(0,0,0,0.35) 40px 41px)
        `,
        backgroundBlendMode: 'multiply',
        boxShadow: '0 4px 8px rgba(0,0,0,0.7)',
      }} />
      {/* Créneaux du mur */}
      <div className="absolute" style={{ bottom: '62%', left: 0, right: 0, height: '2.5vmin', display: 'flex' }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{
            width: '4vmin', height: '100%',
            marginRight: '1vmin',
            background: 'linear-gradient(180deg, #2a2420 0%, #14100a 100%)',
          }} />
        ))}
      </div>
      {/* Deux torches sur le mur */}
      {[15, 80].map((x, idx) => (
        <div key={idx}>
          <div className="absolute" style={{
            bottom: '50%', left: `${x}%`, width: '1vmin', height: '5vmin',
            background: '#1a0e04',
          }} />
          <motion.div
            animate={{ scaleY: [1, 1.15, 0.95, 1.1, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: idx * 0.3 }}
            style={{
              position: 'absolute', bottom: 'calc(50% + 4vmin)', left: `calc(${x}% - 1vmin)`,
              width: '3vmin', height: '4vmin',
              background: 'radial-gradient(ellipse at 50% 100%, #fff3a0 0%, #ff9030 50%, #c23010 85%, transparent 100%)',
              borderRadius: '50% 50% 20% 20%',
              filter: 'blur(1px)',
              transformOrigin: '50% 100%',
            }}
          />
        </div>
      ))}
      {/* Sol pavé */}
      <div className="absolute bottom-0 left-0 right-0" style={{
        height: '32%',
        background: `
          linear-gradient(180deg, #1a1814 0%, #06060a 100%),
          repeating-linear-gradient(0deg, transparent 0 18px, rgba(0,0,0,0.4) 18px 19px),
          repeating-linear-gradient(90deg, transparent 0 30px, rgba(0,0,0,0.35) 30px 31px)
        `,
        backgroundBlendMode: 'normal, multiply, multiply',
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 180px 60px rgba(0,0,0,0.94)' }} />
    </div>
  )
}

// ============================================================
// ================= SCÈNE : NOYADE ===========================
// ============================================================
function DrowningScene({ victim, killer }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = []
    const at = (ms, fn) => t.push(setTimeout(fn, ms))
    at(300, () => setStep(1))
    at(1400, () => setStep(2))
    at(2400, () => setStep(3))
    at(5400, () => setStep(4))   // s'approche de la fontaine
    at(6700, () => setStep(5))   // dialogue K
    at(9000, () => setStep(6))   // penche au-dessus de l'eau
    at(9600, () => { setStep(7); playThud() })  // tête plongée
    at(12000, () => setStep(8))
    at(12600, () => setStep(9))  // dialogue final
    at(14000, () => { setStep(10); playEvilLaugh() })
    return () => t.forEach(clearTimeout)
  }, [])

  const CHAR_W = '26vmin'
  const CHAR_BOTTOM = '22%'
  const VICTIM_X = step >= 4 ? '38%' : '20%'
  const KILLER_X = step >= 6 ? '52%' : '72%'

  const victimOpacity = step === 0 ? 0 : (step >= 8 ? 0 : 1)
  const victimRotate  = step >= 6 ? 70 : 0
  const victimScale   = step >= 7 ? 0.6 : 1
  const victimBottom  = step >= 7 ? 'calc(22% + 2vmin)' : CHAR_BOTTOM

  const killerOpacity = step >= 2 ? 1 : 0
  const killerScaleKf = step === 10 ? [1, 1.08, 1, 1.08, 1] : 1
  const killerYKf     = step === 10 ? [0, -6, 0, -6, 0] : 0

  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <CourtyardBackdrop />
      {/* Fontaine/bassin circulaire au centre */}
      <div className="absolute" style={{
        bottom: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '28vmin', height: '4vmin',
        background: 'linear-gradient(180deg, #2a2a32 0%, #14141a 100%)',
        borderRadius: '50% / 40%',
        border: '2px solid #0a0a12',
        zIndex: 3,
      }} />
      {/* Eau dans le bassin */}
      <div className="absolute" style={{
        bottom: '22%', left: '50%', transform: 'translateX(-50%)',
        width: '24vmin', height: '3vmin',
        borderRadius: '50% / 40%',
        background: 'radial-gradient(ellipse, #2060a0 0%, #0a3060 70%, #02122a 100%)',
        boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.8)',
        zIndex: 4,
      }} />
      {/* Ondulations */}
      <motion.div
        animate={{ scale: step === 7 ? [1, 1.3, 1.1, 1.4, 1] : 1 }}
        transition={{ duration: 0.5, repeat: step === 7 ? 2 : 0 }}
        style={{
          position: 'absolute', bottom: '22.5%', left: '50%', transform: 'translateX(-50%)',
          width: '16vmin', height: '1.5vmin',
          borderRadius: '50%',
          border: '1.5px solid rgba(150,200,255,0.5)',
          zIndex: 4,
          pointerEvents: 'none',
        }}
      />

      {/* Victime */}
      <motion.img
        src={victim.avatar} alt=""
        animate={{
          left: step >= 1 ? VICTIM_X : '-20%',
          opacity: victimOpacity,
          rotate: victimRotate,
          scale: victimScale,
          bottom: victimBottom,
        }}
        transition={{ left: { duration: 1.1, ease: 'easeInOut' }, opacity: { duration: 0.5 }, rotate: { duration: 0.6 }, scale: { duration: 0.6 }, bottom: { duration: 0.5 } }}
        style={{
          position: 'absolute',
          width: CHAR_W, height: CHAR_W, objectFit: 'contain',
          transform: 'translateX(-50%)',
          filter: CUTOUT,
          zIndex: 5,
        }}
      />
      {/* Tueur */}
      <motion.img
        src={killer.avatar} alt=""
        animate={{ left: KILLER_X, opacity: killerOpacity, scale: killerScaleKf, y: killerYKf }}
        transition={{ left: { duration: 1.1, ease: 'easeInOut' }, opacity: { duration: 0.7 }, scale: { duration: 0.6, repeat: step === 10 ? 2 : 0 }, y: { duration: 0.6, repeat: step === 10 ? 2 : 0 } }}
        style={{
          position: 'absolute', bottom: CHAR_BOTTOM,
          width: CHAR_W, height: CHAR_W, objectFit: 'contain',
          transform: 'translateX(-50%) scaleX(-1)',
          filter: CUTOUT,
          zIndex: 6,
        }}
      />

      <Subtitle show={step === 3} speaker={victim.name}
        text="Tu m'as fait venir jusqu'à la cour. Beau cadre pour parler." />
      <Subtitle show={step === 5} speaker={killer.name}
        text="Penche-toi sur l'eau, il y a quelque chose que tu dois voir." />
      <Subtitle show={step >= 9} speaker={killer.name}
        text="Dans un miroir d'eau, chacun voit sa propre fin." />
    </motion.div>
  )
}

// ============================================================
// ================= SCÈNE : MARTEAU ==========================
// ============================================================
function Hammer() {
  return (
    <svg viewBox="0 0 60 80" className="w-full h-full">
      <defs>
        <linearGradient id="hammerHead" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9a9aa4" />
          <stop offset="50%" stopColor="#606070" />
          <stop offset="100%" stopColor="#2a2a32" />
        </linearGradient>
      </defs>
      {/* manche */}
      <rect x="26" y="20" width="8" height="52" fill="#3a1e08" stroke="#1a0e04" strokeWidth="0.8" />
      <line x1="28" y1="26" x2="32" y2="26" stroke="#1a0e04" strokeWidth="0.5" />
      <line x1="28" y1="36" x2="32" y2="36" stroke="#1a0e04" strokeWidth="0.5" />
      {/* tête */}
      <rect x="8" y="6" width="44" height="22" fill="url(#hammerHead)" stroke="#141418" strokeWidth="1" rx="2" />
      <path d="M 10 10 L 50 10 L 48 16 L 12 16 Z" fill="#ffffff" opacity="0.15" />
    </svg>
  )
}

function HammerScene({ victim, killer }) {
  const [step, setStep] = useState(0)
  const [shake, setShake] = useState(false)
  const [flashRed, setFlashRed] = useState(false)

  useEffect(() => {
    const t = []
    const at = (ms, fn) => t.push(setTimeout(fn, ms))
    at(300, () => setStep(1))
    at(1400, () => setStep(2))
    at(2400, () => setStep(3))
    at(5400, () => setStep(4))   // marteau apparaît
    at(6500, () => setStep(5))
    at(8800, () => setStep(6))   // le marteau se lève haut
    at(9400, () => {
      setStep(7); playThud()
      setShake(true); setFlashRed(true)
      setTimeout(() => setShake(false), 400)
      setTimeout(() => setFlashRed(false), 500)
    })
    at(10400, () => setStep(8))
    at(11200, () => setStep(9))
    at(12800, () => { setStep(10); playEvilLaugh() })
    return () => t.forEach(clearTimeout)
  }, [])

  const CHAR_W = '28vmin'
  const CHAR_BOTTOM = '22%'
  const VICTIM_X = '30%'
  const KILLER_X = '62%'

  const victimLeft = step >= 1 ? VICTIM_X : '-20%'
  const victimOpacity = step === 0 ? 0 : (step >= 8 ? 0 : 1)
  const victimRotate  = step >= 7 ? 80 : 0
  const victimY       = step >= 7 ? 30 : 0
  const victimScale   = step >= 7 ? 0.85 : 1

  const killerOpacity = step >= 2 ? 1 : 0
  const killerScaleKf = step === 10 ? [1, 1.08, 1, 1.08, 1] : 1
  const killerYKf     = step === 10 ? [0, -6, 0, -6, 0] : 0

  const hammerOpacity = (step >= 4 && step < 8) ? 1 : 0
  const hammerBottom = step === 6 ? 'calc(22% + 22vmin)'
    : step === 7 ? 'calc(22% + 10vmin)'
    : 'calc(22% + 16vmin)'
  const hammerRotate = step === 6 ? 30 : step === 7 ? -70 : 0

  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <CryptBackdrop />

      <motion.div className="absolute inset-0" animate={shake ? { x: [0, -6, 8, -4, 0], y: [0, 3, -2, 2, 0] } : { x: 0, y: 0 }} transition={shake ? { duration: 0.4 } : { duration: 0 }}>
        <motion.img src={victim.avatar} alt=""
          animate={{ left: victimLeft, opacity: victimOpacity, rotate: victimRotate, y: victimY, scale: victimScale }}
          transition={{ left: { duration: 1.1, ease: 'easeOut' }, opacity: { duration: 0.5 }, rotate: { duration: 0.4 }, y: { duration: 0.4 }, scale: { duration: 0.4 } }}
          style={{ position: 'absolute', bottom: CHAR_BOTTOM, width: CHAR_W, height: CHAR_W, objectFit: 'contain', transform: 'translateX(-50%)', filter: CUTOUT, zIndex: 5 }}
        />
        <motion.img src={killer.avatar} alt=""
          animate={{ left: KILLER_X, opacity: killerOpacity, scale: killerScaleKf, y: killerYKf }}
          transition={{ opacity: { duration: 0.7 }, scale: { duration: 0.6, repeat: step === 10 ? 2 : 0 }, y: { duration: 0.6, repeat: step === 10 ? 2 : 0 } }}
          style={{ position: 'absolute', bottom: CHAR_BOTTOM, width: CHAR_W, height: CHAR_W, objectFit: 'contain', transform: 'translateX(-50%) scaleX(-1)', filter: CUTOUT, zIndex: 5 }}
        />
        {/* Marteau dans la main du tueur */}
        <motion.div
          animate={{
            left: `calc(${KILLER_X} - 8vmin)`,
            bottom: hammerBottom,
            opacity: hammerOpacity,
            rotate: hammerRotate,
          }}
          transition={{ duration: 0.35, ease: 'easeIn' }}
          style={{ position: 'absolute', width: '10vmin', height: '12vmin', transform: 'translateX(-50%)', filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.8))', zIndex: 7 }}
        >
          <Hammer />
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {flashRed && (
          <motion.div key="flR" className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.5, 0.2, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={{ background: 'rgba(160,10,10,0.7)' }} />
        )}
      </AnimatePresence>

      <Subtitle show={step === 3} speaker={victim.name}
        text="Tu as quelque chose à me montrer dans ce caveau ?" />
      <Subtitle show={step === 4 || step === 5} speaker={killer.name}
        text="Viens plus près, j'ai quelque chose à te confier." />
      <Subtitle show={step >= 9} speaker={killer.name}
        text="Et le marteau retombe sur le clou de trop." />
    </motion.div>
  )
}

// ============================================================
// ================= SCÈNE : PONT COUPÉ ======================
// ============================================================
function BridgeScene({ victim, killer }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = []
    const at = (ms, fn) => t.push(setTimeout(fn, ms))
    at(300, () => setStep(1))
    at(1400, () => setStep(2))
    at(2400, () => setStep(3))
    at(5400, () => setStep(4))   // victime avance sur le pont
    at(6500, () => setStep(5))
    at(8800, () => setStep(6))   // tueur sort une dague / coupe la corde
    at(9400, () => { setStep(7); playThud() })  // corde rompue, victime tombe
    at(10200, () => playThud())
    at(10800, () => setStep(8))
    at(11400, () => setStep(9))
    at(12800, () => { setStep(10); playEvilLaugh() })
    return () => t.forEach(clearTimeout)
  }, [])

  const CHAR_W = '26vmin'
  const CHAR_BOTTOM = '33%'   // ils sont sur le pont, plus haut
  const VICTIM_X = step >= 4 ? '48%' : '22%'   // avance sur le pont
  const KILLER_X = '78%'

  const victimOpacity = step === 0 ? 0 : (step >= 8 ? 0 : 1)
  const victimBottom  = step >= 7 ? '-50%' : CHAR_BOTTOM
  const victimRotate  = step >= 7 ? 160 : 0
  const victimScale   = step >= 7 ? 0.4 : 1

  const killerOpacity = step >= 2 ? 1 : 0
  const killerScaleKf = step === 10 ? [1, 1.08, 1, 1.08, 1] : 1

  // Pont qui se casse au step 7 : le tablier bascule vers la gauche
  const bridgeLeftRotate = step >= 7 ? -25 : 0

  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <BridgeBackdrop />
      {/* Tablier central qui bascule au step 7 */}
      <motion.div
        animate={{ rotate: bridgeLeftRotate, x: step >= 7 ? -30 : 0 }}
        transition={{ duration: 0.6, ease: 'easeIn' }}
        style={{
          position: 'absolute', bottom: '33%', left: '18%',
          width: '64%', height: '3vmin',
          background: 'linear-gradient(180deg, #4a2810 0%, #1a0c04 100%)',
          transformOrigin: '100% 50%',
          zIndex: 4,
          border: '1px solid #0a0604',
        }}
      />

      <motion.img src={victim.avatar} alt=""
        animate={{ left: step >= 1 ? VICTIM_X : '10%', opacity: victimOpacity, bottom: victimBottom, rotate: victimRotate, scale: victimScale }}
        transition={{ left: { duration: 1.2, ease: 'easeInOut' }, opacity: { duration: 0.5 }, bottom: { duration: 1, ease: 'easeIn' }, rotate: { duration: 1 }, scale: { duration: 1 } }}
        style={{ position: 'absolute', width: CHAR_W, height: CHAR_W, objectFit: 'contain', transform: 'translateX(-50%)', filter: CUTOUT, zIndex: 5 }}
      />
      <motion.img src={killer.avatar} alt=""
        animate={{ left: KILLER_X, opacity: killerOpacity, scale: killerScaleKf }}
        transition={{ opacity: { duration: 0.7 }, scale: { duration: 0.6, repeat: step === 10 ? 2 : 0 } }}
        style={{ position: 'absolute', bottom: CHAR_BOTTOM, width: CHAR_W, height: CHAR_W, objectFit: 'contain', transform: 'translateX(-50%) scaleX(-1)', filter: CUTOUT, zIndex: 5 }}
      />

      <Subtitle show={step === 3} speaker={victim.name}
        text="Le pont tient encore ? Tu es certain de toi ?" />
      <Subtitle show={step === 4 || step === 5} speaker={killer.name}
        text="Avance, je tiens la corde depuis mon côté." />
      <Subtitle show={step >= 9} speaker={killer.name}
        text="Un pont, c'est un piège tendu entre deux rives." />
    </motion.div>
  )
}

// ============================================================
// ================= SCÈNE : LOUP (forêt) ====================
// ============================================================
function WolfSilhouette() {
  return (
    <svg viewBox="0 0 120 80" className="w-full h-full">
      <defs>
        <linearGradient id="wolfBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2a30" />
          <stop offset="100%" stopColor="#0a0a12" />
        </linearGradient>
      </defs>
      {/* corps */}
      <path d="M 20 60 Q 30 45 60 45 Q 90 45 100 55 L 110 62 L 105 72 L 20 72 Z" fill="url(#wolfBody)" />
      {/* tête */}
      <path d="M 90 50 L 118 38 L 115 55 L 100 58 Z" fill="url(#wolfBody)" />
      {/* oreilles */}
      <polygon points="100,40 104,28 108,42" fill="#050508" />
      {/* yeux (rouges luminescents) */}
      <circle cx="110" cy="46" r="1.5" fill="#ff4020" />
      {/* pattes */}
      <rect x="26" y="60" width="4" height="14" fill="#0a0a12" />
      <rect x="42" y="60" width="4" height="14" fill="#0a0a12" />
      <rect x="80" y="60" width="4" height="14" fill="#0a0a12" />
      <rect x="94" y="60" width="4" height="14" fill="#0a0a12" />
      {/* queue */}
      <path d="M 20 55 Q 10 48 8 42" stroke="#0a0a12" strokeWidth="6" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function WolfScene({ victim, killer }) {
  const [step, setStep] = useState(0)
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    const t = []
    const at = (ms, fn) => t.push(setTimeout(fn, ms))
    at(300, () => setStep(1))
    at(1400, () => setStep(2))
    at(2400, () => setStep(3))
    at(5400, () => setStep(4))   // bruit sinistre
    at(6500, () => setStep(5))
    at(8800, () => setStep(6))   // le loup surgit de la droite
    at(9400, () => {
      setStep(7); playThud()
      setFlash(true); setTimeout(() => setFlash(false), 500)
    })
    at(10400, () => setStep(8))
    at(11200, () => setStep(9))
    at(12800, () => { setStep(10); playEvilLaugh() })
    return () => t.forEach(clearTimeout)
  }, [])

  const CHAR_W = '26vmin'
  const CHAR_BOTTOM = '22%'
  const VICTIM_X = '30%'
  const KILLER_X = '68%'

  const victimLeft = step >= 1 ? VICTIM_X : '-20%'
  const victimOpacity = step === 0 ? 0 : (step >= 8 ? 0 : 1)
  const victimRotate = step === 7 ? 25 : step >= 8 ? 70 : 0
  const victimScale  = step >= 7 ? 0.8 : 1

  const killerOpacity = step >= 2 ? 1 : 0
  const killerScaleKf = step === 10 ? [1, 1.08, 1, 1.08, 1] : 1

  // Loup surgit depuis la gauche (vient de derrière)
  const wolfOpacity = step >= 6 ? 1 : 0
  const wolfLeft    = step >= 7 ? '30%' : step >= 6 ? '-10%' : '-30%'

  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <ForestBackdrop />
      <motion.img src={victim.avatar} alt=""
        animate={{ left: victimLeft, opacity: victimOpacity, rotate: victimRotate, scale: victimScale }}
        transition={{ left: { duration: 1.1, ease: 'easeOut' }, opacity: { duration: 0.5 }, rotate: { duration: 0.4 }, scale: { duration: 0.4 } }}
        style={{ position: 'absolute', bottom: CHAR_BOTTOM, width: CHAR_W, height: CHAR_W, objectFit: 'contain', transform: 'translateX(-50%)', filter: CUTOUT, zIndex: 5 }}
      />
      <motion.img src={killer.avatar} alt=""
        animate={{ left: KILLER_X, opacity: killerOpacity, scale: killerScaleKf }}
        transition={{ opacity: { duration: 0.7 }, scale: { duration: 0.6, repeat: step === 10 ? 2 : 0 } }}
        style={{ position: 'absolute', bottom: CHAR_BOTTOM, width: CHAR_W, height: CHAR_W, objectFit: 'contain', transform: 'translateX(-50%) scaleX(-1)', filter: CUTOUT, zIndex: 5 }}
      />
      {/* Loup */}
      <motion.div
        animate={{ left: wolfLeft, opacity: wolfOpacity }}
        transition={{ left: { duration: 0.55, ease: 'easeIn' }, opacity: { duration: 0.3 } }}
        style={{ position: 'absolute', bottom: CHAR_BOTTOM, width: '20vmin', height: '14vmin', transform: 'translateX(-50%)', filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.9))', zIndex: 6 }}
      >
        <WolfSilhouette />
      </motion.div>

      <AnimatePresence>
        {flash && (
          <motion.div key="flash" className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.4, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={{ background: 'rgba(160,10,10,0.6)' }} />
        )}
      </AnimatePresence>

      <Subtitle show={step === 3} speaker={victim.name}
        text="Cette forêt est glaciale. Pourquoi ce chemin ?" />
      <Subtitle show={step === 4 || step === 5} speaker={killer.name}
        text="Chut… n'entends-tu pas quelque chose derrière toi ?" />
      <Subtitle show={step >= 9} speaker={killer.name}
        text="La meute a fait le travail. Je n'ai qu'à repartir seul." />
    </motion.div>
  )
}

// ============================================================
// ================= SCÈNE : ÉLECTROCUTION ===================
// ============================================================
function ElectrocutionScene({ victim, killer }) {
  const [step, setStep] = useState(0)
  const [zap, setZap] = useState(false)
  useEffect(() => {
    const t = []
    const at = (ms, fn) => t.push(setTimeout(fn, ms))
    at(300, () => setStep(1))
    at(1400, () => setStep(2))
    at(2400, () => setStep(3))
    at(5400, () => setStep(4))
    at(6500, () => setStep(5))
    at(8800, () => setStep(6))   // victime entre dans la zone
    at(9400, () => {
      setStep(7); playBoom()
      setZap(true); setTimeout(() => setZap(false), 900)
    })
    at(10500, () => setStep(8))
    at(11200, () => setStep(9))
    at(12800, () => { setStep(10); playEvilLaugh() })
    return () => t.forEach(clearTimeout)
  }, [])

  const CHAR_W = '26vmin'
  const CHAR_BOTTOM = '22%'
  const VICTIM_X = step >= 6 ? '40%' : '24%'
  const KILLER_X = '72%'

  const victimOpacity = step === 0 ? 0 : (step >= 8 ? 0 : 1)
  const victimRotate  = step === 7 ? 10 : 0
  const victimFilter  = step === 7 ? `${CUTOUT} hue-rotate(200deg) brightness(1.8)` : CUTOUT
  const victimScale   = step >= 8 ? 0.7 : 1

  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <LabBackdrop />
      <motion.img src={victim.avatar} alt=""
        animate={{ left: step >= 1 ? VICTIM_X : '-20%', opacity: victimOpacity, rotate: victimRotate, scale: victimScale }}
        transition={{ left: { duration: 1.1, ease: 'easeInOut' }, opacity: { duration: 0.5 }, scale: { duration: 0.4 } }}
        style={{ position: 'absolute', bottom: CHAR_BOTTOM, width: CHAR_W, height: CHAR_W, objectFit: 'contain', transform: 'translateX(-50%)', filter: victimFilter, zIndex: 5, transition: 'filter 0.2s' }}
      />
      <motion.img src={killer.avatar} alt=""
        animate={{ left: KILLER_X, opacity: step >= 2 ? 1 : 0, scale: step === 10 ? [1, 1.08, 1, 1.08, 1] : 1 }}
        transition={{ opacity: { duration: 0.7 }, scale: { duration: 0.6, repeat: step === 10 ? 2 : 0 } }}
        style={{ position: 'absolute', bottom: CHAR_BOTTOM, width: CHAR_W, height: CHAR_W, objectFit: 'contain', transform: 'translateX(-50%) scaleX(-1)', filter: CUTOUT, zIndex: 5 }}
      />

      {/* Éclairs */}
      <AnimatePresence>
        {zap && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div key={`bolt-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, delay: i * 0.08 }}
                style={{
                  position: 'absolute',
                  bottom: `calc(${CHAR_BOTTOM} + ${12 + i * 3}vmin)`,
                  left: `calc(${VICTIM_X} + ${(i - 1) * 3}vmin)`,
                  width: '3vmin', height: '18vmin',
                  background: 'linear-gradient(180deg, rgba(200,230,255,0.95) 0%, rgba(120,180,255,0.6) 50%, transparent 100%)',
                  filter: 'blur(1px)',
                  boxShadow: '0 0 12px 4px rgba(150,200,255,0.8)',
                  transform: 'translateX(-50%)',
                  zIndex: 7,
                }}
              />
            ))}
            <motion.div key="flashE" className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }} animate={{ opacity: [0, 0.6, 0.2, 0.5, 0] }} exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              style={{ background: 'rgba(140,200,255,0.5)' }}
            />
          </>
        )}
      </AnimatePresence>

      <Subtitle show={step === 3} speaker={victim.name}
        text="Ton laboratoire m'a toujours fasciné." />
      <Subtitle show={step === 4 || step === 5} speaker={killer.name}
        text="Viens toucher cette pièce de métal, dis-moi ce que tu ressens." />
      <Subtitle show={step >= 9} speaker={killer.name}
        text="La science a parfois besoin de cobayes volontaires." />
    </motion.div>
  )
}

// ============================================================
// ================= SCÈNE : FLÈCHE ==========================
// ============================================================
function Arrow() {
  return (
    <svg viewBox="0 0 80 10" className="w-full h-full">
      <polygon points="0,5 16,0 14,5 16,10" fill="#c8a048" stroke="#6a4810" strokeWidth="0.4" />
      <rect x="14" y="4" width="50" height="2" fill="#3a1e08" />
      <polygon points="64,5 72,1 72,4 80,5 72,6 72,9" fill="#a8a8b0" stroke="#3a3a40" strokeWidth="0.4" />
    </svg>
  )
}

function ArrowScene({ victim, killer }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = []
    const at = (ms, fn) => t.push(setTimeout(fn, ms))
    at(300, () => setStep(1))
    at(1400, () => setStep(2))
    at(2400, () => setStep(3))
    at(5400, () => setStep(4))
    at(6500, () => setStep(5))
    at(8800, () => setStep(6))   // tension, silence
    at(9400, () => { setStep(7); playThud() })  // FLÈCHE part et frappe
    at(10400, () => setStep(8))
    at(11200, () => setStep(9))
    at(12800, () => { setStep(10); playEvilLaugh() })
    return () => t.forEach(clearTimeout)
  }, [])

  const CHAR_W = '26vmin'
  const CHAR_BOTTOM = '22%'
  const VICTIM_X = '30%'
  const KILLER_X = '72%'

  const victimLeft = step >= 1 ? VICTIM_X : '-20%'
  const victimOpacity = step === 0 ? 0 : (step >= 8 ? 0 : 1)
  const victimRotate  = step >= 7 ? 75 : 0
  const victimScale   = step >= 7 ? 0.85 : 1

  const arrowOpacity = step >= 7 && step < 8 ? 1 : 0
  const arrowLeft    = step === 7 ? VICTIM_X : '110%'

  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <ForestBackdrop />
      <motion.img src={victim.avatar} alt=""
        animate={{ left: victimLeft, opacity: victimOpacity, rotate: victimRotate, scale: victimScale }}
        transition={{ left: { duration: 1.1, ease: 'easeOut' }, opacity: { duration: 0.5 }, rotate: { duration: 0.5 }, scale: { duration: 0.5 } }}
        style={{ position: 'absolute', bottom: CHAR_BOTTOM, width: CHAR_W, height: CHAR_W, objectFit: 'contain', transform: 'translateX(-50%)', filter: CUTOUT, zIndex: 5 }}
      />
      <motion.img src={killer.avatar} alt=""
        animate={{ left: KILLER_X, opacity: step >= 2 ? 1 : 0, scale: step === 10 ? [1, 1.08, 1, 1.08, 1] : 1 }}
        transition={{ opacity: { duration: 0.7 }, scale: { duration: 0.6, repeat: step === 10 ? 2 : 0 } }}
        style={{ position: 'absolute', bottom: CHAR_BOTTOM, width: CHAR_W, height: CHAR_W, objectFit: 'contain', transform: 'translateX(-50%) scaleX(-1)', filter: CUTOUT, zIndex: 5 }}
      />
      {/* Flèche */}
      <motion.div
        animate={{ left: arrowLeft, opacity: arrowOpacity }}
        transition={{ left: { duration: 0.25, ease: 'linear' }, opacity: { duration: 0.2 } }}
        style={{ position: 'absolute', bottom: `calc(${CHAR_BOTTOM} + 14vmin)`, width: '16vmin', height: '2vmin', transform: 'translate(-50%, 50%)', zIndex: 7 }}
      >
        <Arrow />
      </motion.div>

      <Subtitle show={step === 3} speaker={victim.name}
        text="Tu chasses encore à cette heure ? Quel courage." />
      <Subtitle show={step === 4 || step === 5} speaker={killer.name}
        text="Ne bouge plus. Un daim vient de passer juste derrière toi." />
      <Subtitle show={step >= 9} speaker={killer.name}
        text="Un bon archer ne rate jamais sa vraie cible." />
    </motion.div>
  )
}

// ============================================================
// ================= SCÈNE : PIQUES DU SOL ===================
// ============================================================
function SpikeTrapScene({ victim, killer }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = []
    const at = (ms, fn) => t.push(setTimeout(fn, ms))
    at(300, () => setStep(1))
    at(1400, () => setStep(2))
    at(2400, () => setStep(3))
    at(5400, () => setStep(4))
    at(6500, () => setStep(5))
    at(8800, () => setStep(6))
    at(9400, () => { setStep(7); playThud() })  // piques sortent
    at(10500, () => setStep(8))
    at(11200, () => setStep(9))
    at(12800, () => { setStep(10); playEvilLaugh() })
    return () => t.forEach(clearTimeout)
  }, [])

  const CHAR_W = '26vmin'
  const CHAR_BOTTOM = '22%'
  const VICTIM_X = step >= 4 ? '42%' : '24%'
  const KILLER_X = '72%'

  const victimOpacity = step === 0 ? 0 : (step >= 8 ? 0 : 1)
  const victimBottom  = step >= 7 ? 'calc(22% + 4vmin)' : CHAR_BOTTOM
  const victimRotate  = step >= 7 ? 6 : 0
  const victimScale   = step >= 8 ? 0.85 : 1

  const spikeHeight = step >= 7 ? '10vmin' : '0vmin'

  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <CryptBackdrop />
      {/* Piques qui sortent du sol */}
      <motion.div
        animate={{ height: spikeHeight }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{
          position: 'absolute', bottom: '22%', left: '42%',
          width: '16vmin',
          transform: 'translateX(-50%)',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-end',
          zIndex: 6,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{
            width: '2vmin', height: '100%',
            clipPath: 'polygon(50% 0, 100% 100%, 0 100%)',
            background: 'linear-gradient(180deg, #d8d0c8 0%, #6a5a48 70%, #2a1e14 100%)',
            boxShadow: '0 0 3px rgba(0,0,0,0.7)',
          }} />
        ))}
      </motion.div>

      <motion.img src={victim.avatar} alt=""
        animate={{ left: VICTIM_X, opacity: victimOpacity, bottom: victimBottom, rotate: victimRotate, scale: victimScale }}
        transition={{ left: { duration: 1.1, ease: 'easeInOut' }, opacity: { duration: 0.5 }, bottom: { duration: 0.3 }, rotate: { duration: 0.3 }, scale: { duration: 0.4 } }}
        style={{ position: 'absolute', width: CHAR_W, height: CHAR_W, objectFit: 'contain', transform: 'translateX(-50%)', filter: CUTOUT, zIndex: 5 }}
      />
      <motion.img src={killer.avatar} alt=""
        animate={{ left: KILLER_X, opacity: step >= 2 ? 1 : 0, scale: step === 10 ? [1, 1.08, 1, 1.08, 1] : 1 }}
        transition={{ opacity: { duration: 0.7 }, scale: { duration: 0.6, repeat: step === 10 ? 2 : 0 } }}
        style={{ position: 'absolute', bottom: CHAR_BOTTOM, width: CHAR_W, height: CHAR_W, objectFit: 'contain', transform: 'translateX(-50%) scaleX(-1)', filter: CUTOUT, zIndex: 5 }}
      />

      <Subtitle show={step === 3} speaker={victim.name}
        text="Le plan mène vraiment à cette crypte ?" />
      <Subtitle show={step === 4 || step === 5} speaker={killer.name}
        text="Avance au centre de la salle, le coffre est juste là-dessous." />
      <Subtitle show={step >= 9} speaker={killer.name}
        text="Le sol aussi rend ses hommages. Avec ses pointes." />
    </motion.div>
  )
}

// ============================================================
// ================= SCÈNE : CHEMINÉE ========================
// ============================================================
function FireplaceScene({ victim, killer }) {
  const [step, setStep] = useState(0)
  const [flames, setFlames] = useState(false)
  useEffect(() => {
    const t = []
    const at = (ms, fn) => t.push(setTimeout(fn, ms))
    at(300, () => setStep(1))
    at(1400, () => setStep(2))
    at(2400, () => setStep(3))
    at(5400, () => setStep(4))
    at(6500, () => setStep(5))
    at(8800, () => setStep(6))   // tueur s'approche
    at(9400, () => {
      setStep(7); playBoom()
      setFlames(true); setTimeout(() => setFlames(false), 1200)
    })
    at(10700, () => setStep(8))
    at(11400, () => setStep(9))
    at(12800, () => { setStep(10); playEvilLaugh() })
    return () => t.forEach(clearTimeout)
  }, [])

  const CHAR_W = '26vmin'
  const CHAR_BOTTOM = '22%'
  const VICTIM_X = step >= 7 ? '50%' : step >= 4 ? '42%' : '20%'
  const KILLER_X = step >= 6 ? '60%' : '74%'

  const victimOpacity = step === 0 ? 0 : (step >= 8 ? 0 : 1)
  const victimBottom  = step >= 7 ? 'calc(22% + 8vmin)' : CHAR_BOTTOM
  const victimScale   = step >= 7 ? 0.55 : 1
  const victimRotate  = step >= 7 ? -30 : 0

  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <ParlorBackdrop />
      <motion.img src={victim.avatar} alt=""
        animate={{ left: VICTIM_X, opacity: victimOpacity, bottom: victimBottom, rotate: victimRotate, scale: victimScale }}
        transition={{ left: { duration: 0.7, ease: 'easeInOut' }, opacity: { duration: 0.4 }, bottom: { duration: 0.4 }, rotate: { duration: 0.4 }, scale: { duration: 0.4 } }}
        style={{ position: 'absolute', width: CHAR_W, height: CHAR_W, objectFit: 'contain', transform: 'translateX(-50%)', filter: CUTOUT, zIndex: 5 }}
      />
      <motion.img src={killer.avatar} alt=""
        animate={{ left: KILLER_X, opacity: step >= 2 ? 1 : 0, scale: step === 10 ? [1, 1.08, 1, 1.08, 1] : 1 }}
        transition={{ left: { duration: 0.7, ease: 'easeInOut' }, opacity: { duration: 0.7 }, scale: { duration: 0.6, repeat: step === 10 ? 2 : 0 } }}
        style={{ position: 'absolute', bottom: CHAR_BOTTOM, width: CHAR_W, height: CHAR_W, objectFit: 'contain', transform: 'translateX(-50%) scaleX(-1)', filter: CUTOUT, zIndex: 6 }}
      />

      {/* Flammes qui jaillissent du foyer au step 7 */}
      <AnimatePresence>
        {flames && (
          <motion.div key="flames"
            initial={{ opacity: 0, scaleY: 0.4 }} animate={{ opacity: 1, scaleY: 1 }} exit={{ opacity: 0, scaleY: 0.6 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'absolute', bottom: '30%', left: '50%', transform: 'translateX(-50%)',
              width: '18vmin', height: '26vmin',
              background: 'radial-gradient(ellipse at 50% 100%, #fff4a0 0%, #ff9020 40%, #c22810 75%, transparent 100%)',
              borderRadius: '40% 40% 20% 20%',
              filter: 'blur(2px)',
              transformOrigin: '50% 100%',
              zIndex: 5,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      <Subtitle show={step === 3} speaker={victim.name}
        text="Ton manoir est magnifique. Merci de m'y recevoir." />
      <Subtitle show={step === 4 || step === 5} speaker={killer.name}
        text="Approche du feu, tu grelottes. Juste un peu plus près…" />
      <Subtitle show={step >= 9} speaker={killer.name}
        text="Certains aiment le feu. D'autres y finissent." />
    </motion.div>
  )
}

// ============================================================
// ================= SCÈNE : LUSTRE ==========================
// ============================================================
function Chandelier() {
  return (
    <svg viewBox="0 0 100 70" className="w-full h-full">
      <defs>
        <radialGradient id="chGold" cx="0.5" cy="0.3">
          <stop offset="0%" stopColor="#ffec8a" />
          <stop offset="100%" stopColor="#8a6818" />
        </radialGradient>
      </defs>
      {/* anneau supérieur */}
      <ellipse cx="50" cy="18" rx="30" ry="5" fill="none" stroke="url(#chGold)" strokeWidth="3" />
      {/* anneau inférieur */}
      <ellipse cx="50" cy="58" rx="42" ry="7" fill="none" stroke="url(#chGold)" strokeWidth="4" />
      {/* branches verticales */}
      <line x1="20" y1="20" x2="8" y2="58" stroke="url(#chGold)" strokeWidth="2.5" />
      <line x1="50" y1="14" x2="50" y2="58" stroke="url(#chGold)" strokeWidth="2.5" />
      <line x1="80" y1="20" x2="92" y2="58" stroke="url(#chGold)" strokeWidth="2.5" />
      {/* bougies */}
      {[8, 30, 50, 70, 92].map((x, i) => (
        <g key={i}>
          <rect x={x - 1.5} y="48" width="3" height="8" fill="#f8f4e2" />
          <path d={`M ${x} 46 Q ${x - 1} 42 ${x} 38 Q ${x + 1} 42 ${x} 46`} fill="#ffb040" />
        </g>
      ))}
    </svg>
  )
}

function ChandelierScene({ victim, killer }) {
  const [step, setStep] = useState(0)
  const [shake, setShake] = useState(false)
  useEffect(() => {
    const t = []
    const at = (ms, fn) => t.push(setTimeout(fn, ms))
    at(300, () => setStep(1))
    at(1400, () => setStep(2))
    at(2400, () => setStep(3))
    at(5400, () => setStep(4))   // victime avance sous lustre
    at(6500, () => setStep(5))
    at(8800, () => setStep(6))   // tueur coupe corde
    at(9200, () => {
      setStep(7); playThud()
      setShake(true); setTimeout(() => setShake(false), 500)
    })
    at(10400, () => setStep(8))
    at(11200, () => setStep(9))
    at(12800, () => { setStep(10); playEvilLaugh() })
    return () => t.forEach(clearTimeout)
  }, [])

  const CHAR_W = '26vmin'
  const CHAR_BOTTOM = '22%'
  const VICTIM_X = step >= 4 ? '45%' : '22%'
  const KILLER_X = '76%'

  const victimOpacity = step === 0 ? 0 : (step >= 8 ? 0 : 1)
  const victimScale   = step >= 7 ? 0.6 : 1
  const victimRotate  = step >= 7 ? -10 : 0

  const chandelierTop = step >= 7 ? '70%' : '4%'
  const chandelierRotate = step >= 7 ? 15 : 0

  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <ParlorBackdrop />
      <motion.div className="absolute inset-0" animate={shake ? { x: [0, -4, 4, -2, 0] } : { x: 0 }} transition={shake ? { duration: 0.4 } : { duration: 0 }}>
        {/* Chaîne */}
        <div style={{
          position: 'absolute', top: 0, left: '45%', transform: 'translateX(-50%)',
          width: '2px', height: step >= 7 ? '0' : '6%',
          background: '#4a4030',
          zIndex: 3,
        }} />
        {/* Chandelier */}
        <motion.div
          animate={{ top: chandelierTop, rotate: chandelierRotate }}
          transition={{ top: { duration: 0.4, ease: 'easeIn' }, rotate: { duration: 0.4 } }}
          style={{
            position: 'absolute', left: '45%',
            width: '22vmin', height: '16vmin',
            transform: 'translateX(-50%)',
            filter: 'drop-shadow(0 0 8px rgba(255,200,80,0.4))',
            zIndex: 4,
          }}
        >
          <Chandelier />
        </motion.div>

        <motion.img src={victim.avatar} alt=""
          animate={{ left: VICTIM_X, opacity: victimOpacity, rotate: victimRotate, scale: victimScale }}
          transition={{ left: { duration: 1, ease: 'easeInOut' }, opacity: { duration: 0.5 }, scale: { duration: 0.4 }, rotate: { duration: 0.4 } }}
          style={{ position: 'absolute', bottom: CHAR_BOTTOM, width: CHAR_W, height: CHAR_W, objectFit: 'contain', transform: 'translateX(-50%)', filter: CUTOUT, zIndex: 5 }}
        />
        <motion.img src={killer.avatar} alt=""
          animate={{ left: KILLER_X, opacity: step >= 2 ? 1 : 0, scale: step === 10 ? [1, 1.08, 1, 1.08, 1] : 1 }}
          transition={{ opacity: { duration: 0.7 }, scale: { duration: 0.6, repeat: step === 10 ? 2 : 0 } }}
          style={{ position: 'absolute', bottom: CHAR_BOTTOM, width: CHAR_W, height: CHAR_W, objectFit: 'contain', transform: 'translateX(-50%) scaleX(-1)', filter: CUTOUT, zIndex: 5 }}
        />
      </motion.div>

      <Subtitle show={step === 3} speaker={victim.name}
        text="C'est la première fois que je vois ton grand salon." />
      <Subtitle show={step === 4 || step === 5} speaker={killer.name}
        text="Place-toi au centre, je veux prendre ta mesure." />
      <Subtitle show={step >= 9} speaker={killer.name}
        text="Le luxe est lourd. Surtout quand il tombe sur la tête." />
    </motion.div>
  )
}

// ============================================================
// ================= SCÈNE : PUITS SANS FOND =================
// ============================================================
function WellScene({ victim, killer }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = []
    const at = (ms, fn) => t.push(setTimeout(fn, ms))
    at(300, () => setStep(1))
    at(1400, () => setStep(2))
    at(2400, () => setStep(3))
    at(5400, () => setStep(4))   // s'approchent du puits
    at(6500, () => setStep(5))
    at(8800, () => setStep(6))   // tueur prend élan
    at(9300, () => { setStep(7); playThud() })  // poussée dans le puits
    at(10200, () => playThud())  // impact lointain
    at(11000, () => setStep(8))
    at(11600, () => setStep(9))
    at(12800, () => { setStep(10); playEvilLaugh() })
    return () => t.forEach(clearTimeout)
  }, [])

  const CHAR_W = '26vmin'
  const CHAR_BOTTOM = '22%'
  const VICTIM_X = step >= 4 ? '45%' : '22%'
  const KILLER_X = step >= 6 ? '58%' : step >= 4 ? '60%' : '76%'

  const victimOpacity = step === 0 ? 0 : (step >= 8 ? 0 : 1)
  const victimBottom = step >= 7 ? '-10%' : CHAR_BOTTOM
  const victimScale  = step >= 7 ? 0.3 : 1
  const victimRotate = step >= 7 ? 180 : 0

  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <CourtyardBackdrop />

      {/* Puits : base circulaire */}
      <div className="absolute" style={{
        bottom: '19%', left: '45%', transform: 'translateX(-50%)',
        width: '22vmin', height: '7vmin',
        background: 'radial-gradient(ellipse, #3a2e24 0%, #1a120a 70%, #0a0604 100%)',
        borderRadius: '50% / 50%',
        border: '2px solid #1a120a',
        boxShadow: '0 4px 8px rgba(0,0,0,0.7)',
        zIndex: 3,
      }} />
      {/* Ouverture noire du puits */}
      <div className="absolute" style={{
        bottom: '22%', left: '45%', transform: 'translateX(-50%)',
        width: '18vmin', height: '5vmin',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, #000 0%, #000 65%, rgba(0,0,0,0.6) 100%)',
        boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.95)',
        zIndex: 4,
      }} />
      {/* Arc de fer au-dessus du puits */}
      <svg className="absolute" style={{ bottom: '26%', left: '45%', transform: 'translateX(-50%)', width: '20vmin', height: '12vmin' }} viewBox="0 0 100 60">
        <path d="M 10 60 Q 50 0 90 60" stroke="#3a3a40" strokeWidth="3" fill="none" />
        <rect x="48" y="5" width="4" height="25" fill="#3a3a40" />
      </svg>

      <motion.img src={victim.avatar} alt=""
        animate={{ left: VICTIM_X, opacity: victimOpacity, bottom: victimBottom, rotate: victimRotate, scale: victimScale }}
        transition={{ left: { duration: 1.1, ease: 'easeInOut' }, opacity: { duration: 0.5 }, bottom: { duration: 0.9, ease: 'easeIn' }, rotate: { duration: 0.9 }, scale: { duration: 0.9 } }}
        style={{ position: 'absolute', width: CHAR_W, height: CHAR_W, objectFit: 'contain', transform: 'translateX(-50%)', filter: CUTOUT, zIndex: 5 }}
      />
      <motion.img src={killer.avatar} alt=""
        animate={{ left: KILLER_X, opacity: step >= 2 ? 1 : 0, scale: step === 10 ? [1, 1.08, 1, 1.08, 1] : step === 7 ? 1.1 : 1 }}
        transition={{ left: { duration: 0.8, ease: 'easeInOut' }, opacity: { duration: 0.7 }, scale: { duration: 0.4, repeat: step === 10 ? 2 : 0 } }}
        style={{ position: 'absolute', bottom: CHAR_BOTTOM, width: CHAR_W, height: CHAR_W, objectFit: 'contain', transform: 'translateX(-50%) scaleX(-1)', filter: CUTOUT, zIndex: 6 }}
      />

      <Subtitle show={step === 3} speaker={victim.name}
        text="Ce puits est vieux de combien de siècles ?" />
      <Subtitle show={step === 4 || step === 5} speaker={killer.name}
        text="Penche-toi au bord. Il y a une pièce d'or, tout au fond." />
      <Subtitle show={step >= 9} speaker={killer.name}
        text="Un puits aime les secrets. Surtout ceux qui crient." />
    </motion.div>
  )
}

