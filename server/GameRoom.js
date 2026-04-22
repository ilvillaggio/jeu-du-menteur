const MISSIONS = require('./missions')

const INTERMISSION_MS = 30 * 60 * 1000 // 30 min
const TOTAL_ROUNDS = 5
const TEAM_REVEAL_DELAY_MS = 8000 // 8s pour lire les pactes avant action

class GameRoom {
  constructor(code, playerCount, io) {
    this.code = code
    this.playerCount = playerCount
    this.io = io
    this.players = []
    this.phase = 'waiting'
    this.round = 0
    this.choices = new Map()       // playerId → { action, mise }
    this.teamChoices = new Map()   // playerId → [partnerId, partnerId]
    this.validTeams = new Map()    // playerId → [mutualPartnerId, ...]
    this.playerHistory = new Map() // playerId → [{ round, action, mise, partners, delta }]
    this.firstVoterThisRound = null
  }

  // ─── Players ───

  addPlayer(socket, name) {
    this.players.push({
      id: socket.id, name, avatar: '🎭', role: null,
      score: 0, ready: false, voted: false,
      teamSubmitted: false, missions: [],
    })
    socket.data.playerId = socket.id
  }

  removePlayer(id) {
    this.players = this.players.filter((p) => p.id !== id)
  }

  setReady(id, ready) {
    const p = this.players.find((p) => p.id === id)
    if (p) p.ready = ready
  }

  isFull()  { return this.players.length >= this.playerCount }
  isEmpty() { return this.players.length === 0 }

  // ─── Game flow ───

  startGame() {
    this._assignMissions()
    this.round = 0
    this._startRound()
  }

  // Phase 1 : sélection d'équipe
  _startRound() {
    this.round++
    this.choices.clear()
    this.teamChoices.clear()
    this.validTeams.clear()
    this.firstVoterThisRound = null
    this.players.forEach((p) => { p.voted = false; p.teamSubmitted = false })
    this.phase = 'team_selection'

    this.players.forEach((p) => {
      this.io.to(p.id).emit('game:state', this._stateFor(p))
    })
  }

  // Phase 1 → collecte les choix d'équipe
  registerTeamChoice(playerId, partners) {
    if (this.phase !== 'team_selection') return
    this.teamChoices.set(playerId, partners)

    const p = this.players.find((x) => x.id === playerId)
    if (p) p.teamSubmitted = true

    const submitted = this.teamChoices.size
    const total = this.players.length
    this.io.to(this.code).emit('game:team_votes', { count: submitted, total })
    this.io.to(this.code).emit('game:state', {
      players: this.publicPlayers(), phase: 'team_selection',
      teamVotesCount: submitted, totalPlayers: total,
    })

    if (submitted >= total) {
      setTimeout(() => this._resolveTeams(), 500)
    }
  }

  // Phase 2 : révélation des pactes (mutuels ou non)
  _resolveTeams() {
    // Calcul des pactes mutuels
    this.players.forEach((p) => {
      const chosen = this.teamChoices.get(p.id) || []
      const mutual = chosen.filter((partnerId) => {
        const theirChoices = this.teamChoices.get(partnerId) || []
        return theirChoices.includes(p.id)
      })
      this.validTeams.set(p.id, mutual)
    })

    this.phase = 'team_reveal'

    // Envoie à chaque joueur son résultat personnalisé
    this.players.forEach((p) => {
      const chosen = this.teamChoices.get(p.id) || []
      const mutual = this.validTeams.get(p.id) || []
      const isActive = mutual.length > 0

      const pacts = chosen.map((pid) => {
        const partner = this.players.find((x) => x.id === pid)
        return { id: pid, name: partner?.name || '?', avatar: partner?.avatar || '🎭', valid: mutual.includes(pid) }
      })

      this.io.to(p.id).emit('game:team_reveal', { pacts, isActive, round: this.round })
    })

    // Si personne n'a d'équipe valide → round nul, on passe
    const anyActive = this.players.some((p) => (this.validTeams.get(p.id) || []).length > 0)
    if (!anyActive) {
      setTimeout(() => this._resolveRound(), TEAM_REVEAL_DELAY_MS)
    } else {
      setTimeout(() => this._startActionPhase(), TEAM_REVEAL_DELAY_MS)
    }
  }

  // Phase 3 : action + mise (seulement pour les joueurs avec équipe valide)
  _startActionPhase() {
    this.phase = 'choice'
    this.players.forEach((p) => {
      const validPartners = this.validTeams.get(p.id) || []
      this.io.to(p.id).emit('game:state', {
        ...this._stateFor(p),
        phase: 'choice',
        myValidPartners: validPartners,
        isActive: validPartners.length > 0,
      })
    })
  }

  // Phase 3 → collecte les actions (uniquement actifs)
  registerChoice(playerId, choice) {
    if (this.phase !== 'choice') return
    const validPartners = this.validTeams.get(playerId) || []
    if (validPartners.length === 0) return // hors-jeu ce tour

    this.choices.set(playerId, choice)
    if (!this.firstVoterThisRound) this.firstVoterThisRound = playerId

    const p = this.players.find((x) => x.id === playerId)
    if (p) p.voted = true

    const activeCount = [...this.validTeams.values()].filter((v) => v.length > 0).length
    const votesCount = this.choices.size

    // Broadcast updated player list + vote counts to the whole room — NO phase change
    // (would yank players who haven't voted yet off the ChoicePage)
    this.io.to(this.code).emit('game:votes', { count: votesCount, total: activeCount })
    this.io.to(this.code).emit('game:state', {
      players: this.publicPlayers(),
      votesCount, totalPlayers: activeCount,
    })
    // Only the voter switches to the "waiting" view
    this.io.to(playerId).emit('game:state', { phase: 'voting', votesCount, totalPlayers: activeCount })

    if (votesCount >= activeCount) {
      setTimeout(() => this._resolveRound(), 1000)
    }
  }

  // Résolution du round
  _resolveRound() {
    const reveals = []

    this.players.forEach((p) => {
      const validPartners = this.validTeams.get(p.id) || []

      if (validPartners.length === 0) {
        // Hors-jeu ce tour : delta = 0
        reveals.push({ playerId: p.id, name: p.name, avatar: p.avatar, action: null, delta: 0, inactive: true })
        // Still record an empty entry so consecutive-checks don't carry across gaps
        const hist = this.playerHistory.get(p.id) || []
        hist.push({ round: this.round, action: null, mise: 0, partners: [], delta: 0 })
        this.playerHistory.set(p.id, hist)
        return
      }

      const choice = this.choices.get(p.id) || { action: 'cooperer', mise: 10 }
      let delta = 0

      if (choice.action === 'cooperer') {
        // Coopération réussie seulement si TOUS les partenaires ont aussi coopéré
        const allCooperated = validPartners.every((pid) => {
          const c = this.choices.get(pid)
          return c && c.action === 'cooperer'
        })
        delta = allCooperated ? Math.floor(choice.mise * 1.5) : 0
      } else if (choice.action === 'profiter') {
        // Profiter rapporte TOUJOURS des points (mise × 1.5)
        delta = Math.floor(choice.mise * 1.5)
      } else if (choice.action === 'trahir') {
        // Trahison réussie sauf si un partenaire a aussi trahi (= annulation mutuelle)
        const anyAlsoBetrayed = validPartners.some((pid) => {
          const c = this.choices.get(pid)
          return c && c.action === 'trahir'
        })
        delta = anyAlsoBetrayed ? -choice.mise * 2 : choice.mise * 2
      }

      p.score += delta
      reveals.push({ playerId: p.id, name: p.name, avatar: p.avatar, action: choice.action, delta })

      // Record history for mission checks
      const hist = this.playerHistory.get(p.id) || []
      hist.push({ round: this.round, action: choice.action, mise: choice.mise, partners: validPartners, delta })
      this.playerHistory.set(p.id, hist)
    })

    // Check mission completions for all players
    this._checkMissions()

    const results = { reveals, round: this.round }
    this.phase = 'results'
    this.io.to(this.code).emit('game:results', results)
    this.io.to(this.code).emit('game:state', { players: this.publicPlayers(), phase: 'results' })
    // Send updated missions to each player
    this.players.forEach((p) => {
      this.io.to(p.id).emit('game:state', { myMissions: p.missions })
    })

    if (this.round >= TOTAL_ROUNDS) {
      setTimeout(() => this._startFinal(), 4000)
    } else {
      setTimeout(() => this._startIntermission(), 4000)
    }
  }

  _checkMissions() {
    const sortedByScore = [...this.players].sort((a, b) => b.score - a.score)

    this.players.forEach((p) => {
      const hist = this.playerHistory.get(p.id) || []
      const lastEntry = hist[hist.length - 1]
      if (!lastEntry) return // inactive this round

      p.missions.forEach((m) => {
        if (m.completed) return // already done

        switch (m.id) {
          case 'e1': { // Coopère avec le même joueur deux manches de suite
            if (hist.length >= 2) {
              const prev = hist[hist.length - 2]
              const cur  = hist[hist.length - 1]
              if (cur.action === 'cooperer' && prev.action === 'cooperer') {
                const sharedPartner = cur.partners.some((pid) => prev.partners.includes(pid))
                if (sharedPartner) m.completed = true
              }
            }
            break
          }
          case 'e2': { // Ne jamais trahir lors de la première manche
            if (this.round === 1 && lastEntry.action !== 'trahir') m.completed = true
            break
          }
          case 'e3': { // Termine une manche avec une mise de 50
            if (lastEntry.mise === 50) m.completed = true
            break
          }
          case 'e4': { // Choisis "Profiter" au moins une fois
            if (lastEntry.action === 'profiter') m.completed = true
            break
          }
          case 'e5': { // Sois le premier à voter
            if (this.firstVoterThisRound === p.id) m.completed = true
            break
          }
          case 'e6': { // Joue avec les mêmes partenaires deux fois consécutives
            if (hist.length >= 2) {
              const prev = hist[hist.length - 2]
              const cur  = hist[hist.length - 1]
              const sameTeam = cur.partners.length === prev.partners.length &&
                cur.partners.every((pid) => prev.partners.includes(pid))
              if (sameTeam) m.completed = true
            }
            break
          }
          case 'e7': { // Termine dans le top 3 à la fin d'une manche
            const rank = sortedByScore.findIndex((x) => x.id === p.id)
            if (rank < 3) m.completed = true
            break
          }
          case 'e8': { // Coopère lors de la dernière manche
            if (this.round === TOTAL_ROUNDS && lastEntry.action === 'cooperer') m.completed = true
            break
          }
          case 'h1': { // Trahis un joueur qui t'a choisi comme partenaire
            if (lastEntry.action === 'trahir') {
              // Check if any partner had chosen p.id
              const theyChoseMe = lastEntry.partners.some((pid) => {
                const theirChoices = this.teamChoices.get(pid) || []
                return theirChoices.includes(p.id)
              })
              if (theyChoseMe) m.completed = true
            }
            break
          }
          case 'h2': { // Remporte plus de 100 pts en une seule manche
            if (lastEntry.delta > 100) m.completed = true
            break
          }
          case 'h3': { // Convaincs deux partenaires de coopérer, puis trahis-les
            if (lastEntry.action === 'trahir' && lastEntry.partners.length >= 2) {
              const allPartnersCooped = lastEntry.partners.every((pid) => {
                const c = this.choices.get(pid)
                return c && c.action === 'cooperer'
              })
              if (allPartnersCooped) m.completed = true
            }
            break
          }
          case 'h4': { // Termine la partie avec exactement 0 trahisons
            if (this.round === TOTAL_ROUNDS) {
              const neverBetrayed = hist.every((h) => h.action !== 'trahir')
              if (neverBetrayed) m.completed = true
            }
            break
          }
          case 'h5': { // Sois premier au classement après la manche 3
            if (this.round === 3 && sortedByScore[0]?.id === p.id) m.completed = true
            break
          }
          case 'h6': { // Choisis les mêmes partenaires toute la partie
            if (this.round === TOTAL_ROUNDS && hist.length >= 2) {
              const firstPartners = hist[0].partners
              const alwaysSame = hist.every((h) =>
                h.partners.length === firstPartners.length &&
                h.partners.every((pid) => firstPartners.includes(pid))
              )
              if (alwaysSame) m.completed = true
            }
            break
          }
          case 'h7': { // Finis dans le top 2 final
            if (this.round === TOTAL_ROUNDS) {
              const rank = sortedByScore.findIndex((x) => x.id === p.id)
              if (rank < 2) m.completed = true
            }
            break
          }
          case 'h8': { // Profite lors de trois manches différentes
            const profitRounds = hist.filter((h) => h.action === 'profiter').length
            if (profitRounds >= 3) m.completed = true
            break
          }
        }
      })
    })
  }

  _startIntermission() {
    this.phase = 'intermission'
    const endsAt = Date.now() + INTERMISSION_MS
    this.io.to(this.code).emit('game:intermission', {
      endsAt,
      scores: this.publicPlayers().map((p) => ({ id: p.id, name: p.name, score: p.score })),
      round: this.round,
    })
    this.io.to(this.code).emit('game:state', { phase: 'intermission', players: this.publicPlayers() })
    setTimeout(() => this._startRound(), INTERMISSION_MS)
  }

  _startFinal() {
    this.phase = 'final'
    this.io.to(this.code).emit('game:final', { players: this.publicPlayers(), phase: 'final' })
  }

  // ─── Missions ───

  _assignMissions() {
    // Each player gets exactly 1 easy + 1 hard mission
    const easy = [...MISSIONS.filter((m) => m.difficulty === 'easy')].sort(() => Math.random() - 0.5)
    const hard = [...MISSIONS.filter((m) => m.difficulty === 'hard')].sort(() => Math.random() - 0.5)
    this.players.forEach((p, i) => {
      p.missions = [easy[i % easy.length], hard[i % hard.length]]
    })
  }

  // ─── State helpers ───

  publicPlayers() {
    return this.players.map((p) => ({
      id: p.id, name: p.name, avatar: p.avatar, role: p.role,
      score: p.score, ready: p.ready, voted: p.voted, teamSubmitted: p.teamSubmitted,
    }))
  }

  stateForAll() {
    return {
      phase: this.phase, round: this.round,
      players: this.publicPlayers(), totalPlayers: this.playerCount,
      votesCount: this.choices.size,
      teamVotesCount: this.teamChoices.size,
    }
  }

  _stateFor(player) {
    return {
      ...this.stateForAll(),
      myMissions: player.missions,
    }
  }
}

module.exports = GameRoom
