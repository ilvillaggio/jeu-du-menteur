const MISSIONS = require('./missions')

const INTERMISSION_MS = 30 * 60 * 1000 // 30 min
const TEST_INTERMISSION_MS = 5000 // 5s en mode test
const DEFAULT_TOTAL_ROUNDS = 5
const TEAM_REVEAL_DELAY_MS = 8000 // 8s pour lire les pactes avant action
const BOT_NAMES = ['Alice', 'Bob', 'Claire', 'David', 'Emma', 'Franck', 'Greg', 'Hugo', 'Inès', 'Julie']

// 16 avatars Sprunki sélectionnés par Fred — distribués au hasard à chaque joueur
const AVATAR_POOL = [
  '/avatars/selected/CS_02_Red_Raddy.svg',
  '/avatars/selected/CS_14_Yellow_Simon.svg',
  '/avatars/selected/CS_15_Tan_Tunner.svg',
  '/avatars/selected/CS_17_White_Wenda.svg',
  '/avatars/selected/CS_18_Pink_Pinki.svg',
  '/avatars/selected/CS_20_Black_Black.svg',
  '/avatars/selected/CS_21_Pepper_Jalapenio_Cone_Zombie.svg',
  '/avatars/selected/P3_01_Orange_Oren.svg',
  '/avatars/selected/P3_02_Red_Raddy.svg',
  '/avatars/selected/P3_03_Silver_Clukr.svg',
  '/avatars/selected/P3_06_Gray_Gray.svg',
  '/avatars/selected/P3_09_Lime_OWAKCX.svg',
  '/avatars/selected/P3_10_Sky_blue_Sky.svg',
  '/avatars/selected/P3_15_Tan_Tunner.svg',
  '/avatars/selected/P3_17_White_Wenda.svg',
  '/avatars/selected/P3_18_Pink_Pinki.svg',
]

class GameRoom {
  constructor(code, playerCount, io, testMode = false, totalRounds = DEFAULT_TOTAL_ROUNDS) {
    this.code = code
    this.playerCount = playerCount
    this.totalRounds = totalRounds
    this.io = io
    this.testMode = testMode
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

  // Tire un avatar aléatoire parmi les non-pris. Fallback emoji si tous pris.
  _pickRandomAvatar(fallback = '🎭') {
    const taken = new Set(this.players.map((p) => p.avatar).filter(Boolean))
    const available = AVATAR_POOL.filter((a) => !taken.has(a))
    if (available.length === 0) return fallback
    return available[Math.floor(Math.random() * available.length)]
  }

  addPlayer(socket, name, token = null) {
    this.players.push({
      id: socket.id, name, avatar: this._pickRandomAvatar('🎭'), role: null,
      score: 0, missionScore: 0, ready: false, voted: false,
      teamSubmitted: false, missionAcknowledged: false, missions: [],
      isBot: false,
      online: true,
      token, // identifiant stable côté client (localStorage), pour reconnexion
    })
    socket.data.playerId = socket.id
  }

  // Reconnecte un joueur existant (changement de socket.id après refresh).
  // Retourne { ok, player } ou { error }.
  reconnectPlayer(socket, token) {
    const p = this.players.find((x) => x.token === token && !x.isBot)
    if (!p) return { error: 'Joueur introuvable' }
    const oldId = p.id
    p.id = socket.id
    p.online = true
    socket.data.playerId = socket.id

    // Annule la suppression différée si elle était programmée
    if (this._cleanupTimer) {
      clearTimeout(this._cleanupTimer)
      this._cleanupTimer = null
    }

    // Mettre à jour les Maps qui indexent par playerId
    if (this.choices.has(oldId))      { this.choices.set(socket.id, this.choices.get(oldId));         this.choices.delete(oldId) }
    if (this.teamChoices.has(oldId))  { this.teamChoices.set(socket.id, this.teamChoices.get(oldId)); this.teamChoices.delete(oldId) }
    if (this.validTeams.has(oldId))   { this.validTeams.set(socket.id, this.validTeams.get(oldId));   this.validTeams.delete(oldId) }
    if (this.playerHistory.has(oldId)){ this.playerHistory.set(socket.id, this.playerHistory.get(oldId)); this.playerHistory.delete(oldId) }
    if (this.firstVoterThisRound === oldId) this.firstVoterThisRound = socket.id

    return { ok: true, player: p }
  }

  addBot(name) {
    const usedNames = new Set(this.players.map((p) => p.name))
    const availableName = name || BOT_NAMES.find((n) => !usedNames.has(n)) || `Bot${this.players.length}`
    this.players.push({
      id: `bot_${Math.random().toString(36).slice(2, 10)}`,
      name: availableName, avatar: this._pickRandomAvatar('🤖'), role: null,
      score: 0, missionScore: 0, ready: true, voted: false,
      teamSubmitted: false, missionAcknowledged: false, missions: [],
      isBot: true,
      online: true,
    })
  }

  removePlayer(id) {
    this.players = this.players.filter((p) => p.id !== id)
  }

  setReady(id, ready) {
    const p = this.players.find((p) => p.id === id)
    if (p) p.ready = ready
  }

  setAvatar(id, avatar) {
    const p = this.players.find((p) => p.id === id)
    if (!p) return { error: 'Joueur introuvable' }
    // Un avatar déjà pris par un autre joueur → refus (sauf si c'est le sien)
    const clash = this.players.find((x) => x.id !== id && x.avatar === avatar)
    if (clash) return { error: 'Avatar déjà pris' }
    p.avatar = avatar
    return { ok: true }
  }

  isFull()  { return this.players.length >= this.playerCount }
  isEmpty() { return this.players.length === 0 }

  // ─── Game flow ───

  startGame() {
    this._assignMissions()
    this.round = 0
    this._startMissionReveal()
  }

  // Phase 0 : révélation des missions au début de partie (chacun lit les siennes)
  _startMissionReveal() {
    this.phase = 'mission_reveal'
    this.players.forEach((p) => { p.missionAcknowledged = false })

    this.players.forEach((p) => {
      this.io.to(p.id).emit('game:state', {
        ...this._stateFor(p),
        phase: 'mission_reveal',
        missionAckCount: 0,
      })
    })

    this._triggerBots()
  }

  acknowledgeMission(id) {
    if (this.phase !== 'mission_reveal') return
    const p = this.players.find((x) => x.id === id)
    if (!p || p.missionAcknowledged) return
    p.missionAcknowledged = true

    const ackCount = this.players.filter((x) => x.missionAcknowledged).length
    this.io.to(this.code).emit('game:state', {
      missionAckCount: ackCount,
      totalPlayers: this.players.length,
    })

    if (ackCount >= this.players.length) {
      setTimeout(() => this._startRound(), 600)
    }
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

    this._triggerBots()
  }

  // Phase 1 → collecte les choix d'équipe
  registerTeamChoice(playerId, partners) {
    if (this.phase !== 'team_selection') return
    if (this.teamChoices.has(playerId)) return  // évite les doubles soumissions
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

    // En mode test : dès que le joueur humain a soumis, on redéclenche les bots
    // pour qu'ils puissent matcher ses choix et favoriser des pactes réussis.
    if (this.testMode && p && !p.isBot) {
      this._triggerBots()
    }

    if (submitted >= total) {
      setTimeout(() => this._resolveTeams(), 500)
    }
  }

  // Phase 2 : révélation des pactes (mutuels ou non)
  _resolveTeams() {
    // Règle stricte : l'INTENTION détermine le pacte, pas de fallback.
    //   - Choisir 2 partenaires = intention "pacte à 3". Valide UNIQUEMENT si les 3
    //     joueurs ont tous sélectionné exactement les 2 autres. Sinon : hors-jeu.
    //   - Choisir 1 partenaire = intention "pacte à 2". Valide UNIQUEMENT si les
    //     deux joueurs n'ont chacun sélectionné QUE l'autre. Sinon : hors-jeu.
    //   - Si les intentions ne matchent pas (un veut 2, l'autre veut 3) : pas de pacte.
    this.validTeams.clear()
    const ids = this.players.map((p) => p.id)
    const choicesOf = (id) => this.teamChoices.get(id) || []
    const engaged = new Set()

    // ── Phase 1 : pactes à 3 stricts ──
    // Les 3 joueurs ont chacun choisi exactement les 2 autres.
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        for (let k = j + 1; k < ids.length; k++) {
          const a = ids[i], b = ids[j], c = ids[k]
          if (engaged.has(a) || engaged.has(b) || engaged.has(c)) continue
          const A = choicesOf(a), B = choicesOf(b), C = choicesOf(c)
          if (
            A.length === 2 && B.length === 2 && C.length === 2 &&
            A.includes(b) && A.includes(c) &&
            B.includes(a) && B.includes(c) &&
            C.includes(a) && C.includes(b)
          ) {
            engaged.add(a); engaged.add(b); engaged.add(c)
            this.validTeams.set(a, [b, c])
            this.validTeams.set(b, [a, c])
            this.validTeams.set(c, [a, b])
          }
        }
      }
    }

    // ── Phase 2 : pactes à 2 stricts ──
    // Les 2 joueurs ont chacun choisi 1 SEUL partenaire, et c'est l'autre.
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i], b = ids[j]
        if (engaged.has(a) || engaged.has(b)) continue
        const A = choicesOf(a), B = choicesOf(b)
        if (A.length === 1 && B.length === 1 && A[0] === b && B[0] === a) {
          engaged.add(a); engaged.add(b)
          this.validTeams.set(a, [b])
          this.validTeams.set(b, [a])
        }
      }
    }

    // ── Phase 3 : les restants n'ont aucun pacte (hors-jeu pour cette manche) ──
    for (const a of ids) {
      if (!this.validTeams.has(a)) {
        this.validTeams.set(a, [])
      }
    }

    this.phase = 'team_reveal'

    // Liste publique des joueurs qui se sont fait avoir (aucun pacte mutuel)
    const trickedPlayers = this.players
      .filter((p) => (this.validTeams.get(p.id) || []).length === 0)
      .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar }))

    // Envoie à chaque joueur son résultat personnalisé
    this.players.forEach((p) => {
      const chosen = this.teamChoices.get(p.id) || []
      const mutual = this.validTeams.get(p.id) || []
      const isActive = mutual.length > 0

      const pacts = chosen.map((pid) => {
        const partner = this.players.find((x) => x.id === pid)
        return { id: pid, name: partner?.name || '?', avatar: partner?.avatar || '🎭', valid: mutual.includes(pid) }
      })

      this.io.to(p.id).emit('game:team_reveal', { pacts, isActive, round: this.round, trickedPlayers })
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

    this._triggerBots()
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
        hist.push({
          round: this.round, action: null, mise: 0,
          partners: [], chosenIds: this.teamChoices.get(p.id) || [],
          delta: 0,
        })
        this.playerHistory.set(p.id, hist)
        return
      }

      const choice = this.choices.get(p.id) || { action: 'cooperer', mise: 10 }
      let delta = 0

      // ===== Payoffs par action =====
      // Profiter  : +25 garanti, ne participe à rien d'autre
      // Coopérer  : +50 si TOUT le pacte coopère (pas de traître, pas de profiteur)
      //             Si ≥ 2 traîtres : le coopérateur RAMASSE le butin (75 × nbTraîtres)
      //             partagé entre tous les coopérateurs du pacte
      //             Sinon : 0
      // Trahir    : +75 si seul à trahir dans le pacte, sinon -75 (pénalité)
      // Dernière manche : tous les gains/pertes sont doublés

      // Compteurs d'actions dans le pacte du joueur (inclut le joueur lui-même)
      const pactMembers = [p.id, ...validPartners]
      let nbCoop = 0, nbTrahir = 0, nbProfit = 0
      pactMembers.forEach((pid) => {
        const a = (pid === p.id ? choice : this.choices.get(pid))?.action
        if (a === 'cooperer') nbCoop++
        else if (a === 'trahir') nbTrahir++
        else if (a === 'profiter') nbProfit++
      })

      if (choice.action === 'cooperer') {
        if (nbTrahir === 0 && nbProfit === 0) {
          // Tout le pacte coopère : gain collectif
          delta = 50
        } else if (nbTrahir >= 2 && nbCoop > 0) {
          // Au moins 2 traîtres : leur butin est partagé entre les coopérateurs
          delta = Math.floor((75 * nbTrahir) / nbCoop)
        } else {
          // Un seul traître (qui empoche +75), ou au moins un profiteur : la coop échoue
          delta = 0
        }
      } else if (choice.action === 'profiter') {
        delta = 25
      } else if (choice.action === 'trahir') {
        delta = nbTrahir === 1 ? 75 : -75
      }

      // Double enjeu à la dernière manche
      if (this.round === this.totalRounds) {
        delta = delta * 2
      }

      p.score += delta
      reveals.push({ playerId: p.id, name: p.name, avatar: p.avatar, action: choice.action, delta })

      // Record history for mission checks + parcours personnel
      const hist = this.playerHistory.get(p.id) || []
      hist.push({
        round: this.round, action: choice.action, mise: choice.mise,
        partners: validPartners, chosenIds: this.teamChoices.get(p.id) || [],
        delta,
      })
      this.playerHistory.set(p.id, hist)
    })

    // Check mission completions for all players
    this._checkMissions()

    const results = { reveals, round: this.round }
    this.phase = 'results'
    this.players.forEach((p) => { p.resultsAcknowledged = false })

    this.io.to(this.code).emit('game:results', results)
    this.io.to(this.code).emit('game:state', {
      players: this.publicPlayers(),
      phase: 'results',
      resultsAckCount: 0,
      totalPlayers: this.players.length,
    })
    // Missions + score privé + historique perso à chaque joueur
    this.players.forEach((p) => {
      this.io.to(p.id).emit('game:state', {
        myMissions: p.missions,
        myMissionScore: p.missionScore,
        myHistory: this._historyForPlayer(p),
      })
    })

    // Les bots acceptent automatiquement — on attend le clic humain pour continuer
    this._triggerBots()
  }

  acknowledgeResults(id) {
    if (this.phase !== 'results') return
    const p = this.players.find((x) => x.id === id)
    if (!p || p.resultsAcknowledged) return
    p.resultsAcknowledged = true

    const ackCount = this.players.filter((x) => x.resultsAcknowledged).length
    this.io.to(this.code).emit('game:state', {
      resultsAckCount: ackCount,
      totalPlayers: this.players.length,
    })

    if (ackCount >= this.players.length) {
      setTimeout(() => {
        if (this.round >= this.totalRounds) this._startFinal()
        else this._startIntermission()
      }, 500)
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
          case 'e2': { // Coopère lors de la première manche
            if (this.round === 1 && lastEntry.action === 'cooperer') m.completed = true
            break
          }
          case 'e3': { // Réussis une trahison (sans double trahison)
            if (lastEntry.action === 'trahir' && lastEntry.delta > 0) m.completed = true
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
          case 'e7': { // Termine dans le top 3 à la fin d'une manche (classement réel, pas ex æquo avec le 4e)
            const rank = sortedByScore.findIndex((x) => x.id === p.id)
            const fourth = sortedByScore[3]?.score
            const isRealTop3 =
              rank < 3 &&
              (fourth === undefined || sortedByScore[rank].score > fourth)
            if (isRealTop3) m.completed = true
            break
          }
          case 'e8': { // Coopère lors de la dernière manche
            if (this.round === this.totalRounds && lastEntry.action === 'cooperer') m.completed = true
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
            if (this.round === this.totalRounds) {
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
            if (this.round === this.totalRounds && hist.length >= 2) {
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
            if (this.round === this.totalRounds) {
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

        // Si la mission vient d'être complétée, ajoute ses points au missionScore privé
        if (m.completed) {
          p.missionScore += (m.difficulty === 'hard' ? 35 : 15)
        }
      })
    })
  }

  _startIntermission() {
    this.phase = 'intermission'
    this.players.forEach((p) => { p.intermissionAcknowledged = false })

    this.io.to(this.code).emit('game:intermission', {
      scores: this.publicPlayers().map((p) => ({ id: p.id, name: p.name, score: p.score })),
      round: this.round,
    })
    this.io.to(this.code).emit('game:state', {
      phase: 'intermission',
      players: this.publicPlayers(),
      intermissionAckCount: 0,
      totalPlayers: this.players.length,
    })

    // Bots cliquent automatiquement après un petit délai
    this._triggerBots()
  }

  acknowledgeIntermission(id) {
    if (this.phase !== 'intermission') return
    const p = this.players.find((x) => x.id === id)
    if (!p || p.intermissionAcknowledged) return
    p.intermissionAcknowledged = true

    const ackCount = this.players.filter((x) => x.intermissionAcknowledged).length
    this.io.to(this.code).emit('game:state', {
      intermissionAckCount: ackCount,
      totalPlayers: this.players.length,
    })

    if (ackCount >= this.players.length) {
      setTimeout(() => this._startRound(), 400)
    }
  }

  _startFinal() {
    this.phase = 'final'
    // À la fin : on révèle missionScore + finalScore pour tous
    const playersWithFinal = this.publicPlayers().map((pub) => {
      const priv = this.players.find((x) => x.id === pub.id)
      const missionScore = priv?.missionScore ?? 0
      return { ...pub, missionScore, finalScore: (priv?.score ?? 0) + missionScore }
    })
    this.io.to(this.code).emit('game:final', { players: playersWithFinal, phase: 'final' })
  }

  // ─── Bots ───

  _triggerBots() {
    const bots = this.players.filter((p) => p.isBot)
    bots.forEach((bot) => {
      const delay = 800 + Math.random() * 1500

      if (this.phase === 'mission_reveal' && !bot.missionAcknowledged) {
        setTimeout(() => {
          if (this.phase !== 'mission_reveal') return
          this.acknowledgeMission(bot.id)
        }, delay)
      } else if (this.phase === 'results' && !bot.resultsAcknowledged) {
        // Bots acceptent vite pour ne pas bloquer l'humain
        setTimeout(() => {
          if (this.phase !== 'results') return
          this.acknowledgeResults(bot.id)
        }, 1000 + Math.random() * 1500)
      } else if (this.phase === 'intermission' && !bot.intermissionAcknowledged) {
        setTimeout(() => {
          if (this.phase !== 'intermission') return
          this.acknowledgeIntermission(bot.id)
        }, 1500 + Math.random() * 1500)
      } else if (this.phase === 'team_selection' && !bot.teamSubmitted) {
        setTimeout(() => {
          if (this.phase !== 'team_selection') return
          if (bot.teamSubmitted) return // déjà soumis (re-trigger après humain)

          // Mode test : si le humain a déjà soumis ET m'a choisi → 75% de chance
          // que je matche ses choix pour qu'on forme un pacte cohérent.
          if (this.testMode) {
            const human = this.players.find((x) => !x.isBot)
            const humanChoices = human ? this.teamChoices.get(human.id) : null
            if (humanChoices && humanChoices.includes(bot.id) && Math.random() < 0.75) {
              let matchedPicks
              if (humanChoices.length === 1) {
                // Pacte à 2 : le bot choisit uniquement le humain
                matchedPicks = [human.id]
              } else {
                // Pacte à 3 : le bot choisit le humain + l'autre choisi par le humain
                const otherInPact = humanChoices.find((id) => id !== bot.id)
                matchedPicks = otherInPact ? [human.id, otherInPact] : [human.id]
              }
              this.registerTeamChoice(bot.id, matchedPicks)
              return
            }
          }

          // Comportement aléatoire normal
          const others = this.players.filter((x) => x.id !== bot.id)
          const n = Math.random() < 0.5 ? 1 : 2
          let picks
          const human = this.testMode
            ? this.players.find((x) => !x.isBot && x.id !== bot.id)
            : null
          if (human && Math.random() < 0.5) {
            const rest = others.filter((x) => x.id !== human.id)
            const extras = [...rest].sort(() => Math.random() - 0.5).slice(0, n - 1).map((x) => x.id)
            picks = [human.id, ...extras]
          } else {
            picks = [...others].sort(() => Math.random() - 0.5).slice(0, n).map((x) => x.id)
          }
          this.registerTeamChoice(bot.id, picks)
        }, delay)
      } else if (this.phase === 'choice' && !bot.voted) {
        const validPartners = this.validTeams.get(bot.id) || []
        if (validPartners.length === 0) return
        setTimeout(() => {
          if (this.phase !== 'choice') return
          const actions = ['cooperer', 'cooperer', 'trahir', 'profiter']
          const action = actions[Math.floor(Math.random() * actions.length)]
          this.registerChoice(bot.id, { action, mise: 0 })
        }, delay)
      }
    })
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
      online: p.online !== false,
    }))
  }

  stateForAll() {
    return {
      phase: this.phase, round: this.round,
      players: this.publicPlayers(), totalPlayers: this.playerCount,
      totalRounds: this.totalRounds,
      votesCount: this.choices.size,
      teamVotesCount: this.teamChoices.size,
    }
  }

  _stateFor(player) {
    return {
      ...this.stateForAll(),
      myMissions: player.missions,
      myMissionScore: player.missionScore,
      myHistory: this._historyForPlayer(player),
    }
  }

  // Historique personnel enrichi avec les noms (pour l'affichage client)
  _historyForPlayer(player) {
    const hist = this.playerHistory.get(player.id) || []
    const byId = (id) => {
      const pp = this.players.find((x) => x.id === id)
      return { id, name: pp?.name || '?', avatar: pp?.avatar || '🎭' }
    }
    return hist.map((h) => ({
      round: h.round,
      action: h.action,
      mise: h.mise,
      delta: h.delta,
      chosen: (h.chosenIds || []).map(byId),
      validPartners: (h.partners || []).map(byId),
    }))
  }
}

module.exports = GameRoom
