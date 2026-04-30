// difficulty: 'easy' (+25pts) | 'hard' (+75pts)
module.exports = [
  // Easy
  { id: 'e1',  description: "Coopère avec le même joueur deux manches de suite.", difficulty: 'easy' },
  { id: 'e2',  description: "Coopère lors de la première manche.", difficulty: 'easy' },
  { id: 'e3',  description: "Réussis une trahison.", difficulty: 'easy' },
  { id: 'e4',  description: 'Choisis "Profiter" au moins une fois dans la partie.', difficulty: 'easy' },
  { id: 'e5',  description: "Sois le premier à voter lors d'une manche.", difficulty: 'easy' },
  { id: 'e6',  description: "Joue avec les mêmes partenaires deux fois consécutives.", difficulty: 'easy' },
  { id: 'e8',  description: "Coopère lors de la dernière manche.", difficulty: 'easy' },
  { id: 'e9',  description: "Réussis un pacte à 2 (les deux ont choisi 1 seul partenaire).", difficulty: 'easy' },
  { id: 'e10', description: "Réussis un pacte à 3 (les trois ont choisi les 2 autres).", difficulty: 'easy' },
  { id: 'e11', description: "Réussis un pacte à 2 alors qu'un autre joueur vous voulait à 3.", difficulty: 'easy' },

  // Hard
  { id: 'h2',  description: "Remporte plus de 100 pts en une seule manche.", difficulty: 'hard' },
  { id: 'h3',  description: "Trahis un partenaire qui a voulu coopérer.", difficulty: 'hard' },
  { id: 'h4',  description: "Termine la partie avec exactement 0 trahisons.", difficulty: 'hard' },
  { id: 'h5',  description: "Atteins au moins 80 points avant la manche 3.", difficulty: 'hard' },
  { id: 'h7',  description: "Finis dans le top 3 final.", difficulty: 'hard' },
  { id: 'h8',  description: "Profite lors de trois manches différentes.", difficulty: 'hard' },
  { id: 'h9',  description: "Trahis avec succès lors de la dernière manche.", difficulty: 'hard' },
  { id: 'h11', description: "Trahis dans 3 manches différentes.", difficulty: 'hard' },
  { id: 'h12', description: "Trahis seul dans un pacte à 3 (les 2 autres ont coopéré).", difficulty: 'hard' },
  { id: 'h14', description: "Coopère 3 manches d'affilée.", difficulty: 'hard' },
  { id: 'h15', description: "Sois en pacte à 3 dans 3 manches différentes.", difficulty: 'hard' },
]
