// Petit moteur audio synthétique (Web Audio API) pour la séquence finale.
// Tout est généré en live : pas besoin de fichiers son à télécharger.

let ctx = null

function getCtx() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext
    if (!C) return null
    ctx = new C()
  }
  return ctx
}

export function unlockAudio() {
  const c = getCtx()
  if (c && c.state === 'suspended') c.resume().catch(() => {})
}

// --- Drone d'ambiance tendue (basse profonde + sub qui ondule) ---
export function startTensionDrone() {
  const c = getCtx()
  if (!c) return { stop: () => {} }
  const now = c.currentTime

  const master = c.createGain()
  master.gain.value = 0
  master.gain.linearRampToValueAtTime(0.09, now + 2.5)
  master.connect(c.destination)

  // Basse sawtooth filtrée
  const osc1 = c.createOscillator()
  osc1.type = 'sawtooth'
  osc1.frequency.value = 55
  const f1 = c.createBiquadFilter()
  f1.type = 'lowpass'
  f1.frequency.value = 220
  f1.Q.value = 8
  osc1.connect(f1).connect(master)
  osc1.start(now)

  // Sub sinus qui ondule légèrement (LFO)
  const osc2 = c.createOscillator()
  osc2.type = 'sine'
  osc2.frequency.value = 82.4
  const lfo = c.createOscillator()
  lfo.frequency.value = 0.25
  const lfoGain = c.createGain()
  lfoGain.gain.value = 4
  lfo.connect(lfoGain).connect(osc2.frequency)
  osc2.connect(master)
  osc2.start(now)
  lfo.start(now)

  // Nappe aigüe très ténue pour l'air malaisant
  const osc3 = c.createOscillator()
  osc3.type = 'triangle'
  osc3.frequency.value = 329.6
  const g3 = c.createGain()
  g3.gain.value = 0.015
  osc3.connect(g3).connect(master)
  osc3.start(now)

  return {
    stop: (fadeTime = 1) => {
      const t = c.currentTime
      master.gain.cancelScheduledValues(t)
      master.gain.setValueAtTime(master.gain.value, t)
      master.gain.linearRampToValueAtTime(0, t + fadeTime)
      const stopAt = t + fadeTime + 0.1
      try { osc1.stop(stopAt) } catch {}
      try { osc2.stop(stopAt) } catch {}
      try { osc3.stop(stopAt) } catch {}
      try { lfo.stop(stopAt) } catch {}
    },
  }
}

// --- Bruitage : froissement (papier cadeau qu'on tend) ---
export function playRustle() {
  const c = getCtx()
  if (!c) return
  const now = c.currentTime
  const dur = 0.5
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.18))
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'highpass'
  f.frequency.value = 1200
  const g = c.createGain()
  g.gain.value = 0.18
  src.connect(f).connect(g).connect(c.destination)
  src.start(now)
}

// --- Bruitage : tic-tac de suspense ---
export function playTick() {
  const c = getCtx()
  if (!c) return
  const now = c.currentTime
  const osc = c.createOscillator()
  osc.type = 'square'
  osc.frequency.value = 1800
  const g = c.createGain()
  g.gain.setValueAtTime(0.06, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
  osc.connect(g).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.05)
}

// --- Bruitage : explosion ---
export function playBoom() {
  const c = getCtx()
  if (!c) return
  const now = c.currentTime
  const dur = 1.4

  // Noise burst filtré
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.35))
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.setValueAtTime(1200, now)
  f.frequency.exponentialRampToValueAtTime(200, now + 0.8)
  const g = c.createGain()
  g.gain.setValueAtTime(0.55, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + dur)
  src.connect(f).connect(g).connect(c.destination)
  src.start(now)

  // Sub qui chute (le "boum" dans le ventre)
  const sub = c.createOscillator()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(95, now)
  sub.frequency.exponentialRampToValueAtTime(28, now + 0.7)
  const subG = c.createGain()
  subG.gain.setValueAtTime(0.7, now)
  subG.gain.exponentialRampToValueAtTime(0.001, now + 0.9)
  sub.connect(subG).connect(c.destination)
  sub.start(now)
  sub.stop(now + 0.95)
}

// --- Bruitage : rire sinistre (3 "ha" descendants, filtrés) ---
export function playEvilLaugh() {
  const c = getCtx()
  if (!c) return
  const now = c.currentTime
  const notes = [220, 196, 174, 155]
  notes.forEach((freq, i) => {
    const osc = c.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = freq
    const f = c.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 900
    const g = c.createGain()
    const t = now + i * 0.22
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.12, t + 0.04)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    osc.connect(f).connect(g).connect(c.destination)
    osc.start(t)
    osc.stop(t + 0.22)
  })
}

// --- Bruitage : impact sourd (coup, chute) ---
export function playThud() {
  const c = getCtx()
  if (!c) return
  const now = c.currentTime
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(130, now)
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.25)
  const g = c.createGain()
  g.gain.setValueAtTime(0.5, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
  osc.connect(g).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.35)
}

// --- Sting dramatique : stab orchestral synthétique ---
export function playSting() {
  const c = getCtx()
  if (!c) return
  const now = c.currentTime
  const freqs = [146.8, 220, 293.7] // accord mineur tendu
  freqs.forEach((freq) => {
    const osc = c.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = freq
    const f = c.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(2500, now)
    f.frequency.exponentialRampToValueAtTime(600, now + 0.8)
    const g = c.createGain()
    g.gain.setValueAtTime(0.12, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.9)
    osc.connect(f).connect(g).connect(c.destination)
    osc.start(now)
    osc.stop(now + 1)
  })
}
