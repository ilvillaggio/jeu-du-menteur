// difficulty: 'easy' (+25pts) | 'hard' (+75pts)
// completed: explicitement false (le clone via spread { ...m, completed: false }
// dans _assignMissions garantit aussi cette valeur, mais on initialise ici par
// sécurité)
module.exports = [
  // Easy
  { id: 'e1',  description: "Coopère avec le même joueur deux manches de suite.", difficulty: 'easy', completed: false },
  { id: 'e2',  description: "Coopère lors de la première manche.", difficulty: 'easy', completed: false },
  { id: 'e3',  description: "Réussis une trahison.", difficulty: 'easy', completed: false },
  { id: 'e4',  description: 'Choisis "Profiter" au moins une fois dans la partie.', difficulty: 'easy', completed: false },
  { id: 'e5',  description: "Sois le premier à voter lors d'une manche.", difficulty: 'easy', completed: false },
  { id: 'e6',  description: "Joue avec les mêmes partenaires deux fois consécutives.", difficulty: 'easy', completed: false },
  { id: 'e8',  description: "Coopère lors de la dernière manche.", difficulty: 'easy', completed: false },
  { id: 'e9',  description: "Réussis un pacte à 2 (les deux ont choisi 1 seul partenaire).", difficulty: 'easy', completed: false },
  { id: 'e10', description: "Réussis un pacte à 3 (les trois ont choisi les 2 autres).", difficulty: 'easy', completed: false },
  { id: 'e11', description: "Réussis un pacte à 2 alors qu'un autre joueur vous voulait à 3.", difficulty: 'easy', completed: false },

  // Hard
  { id: 'h2',  description: "Remporte plus de 100 pts en une seule manche.", difficulty: 'hard', completed: false },
  { id: 'h3',  description: "Trahis un partenaire qui a voulu coopérer.", difficulty: 'hard', completed: false },
  { id: 'h4',  description: "Termine la partie avec exactement 0 trahisons.", difficulty: 'hard', completed: false },
  { id: 'h5',  description: "Atteins au moins 80 points avant la manche 3.", difficulty: 'hard', completed: false },
  { id: 'h7',  description: "Finis dans le top 3 final.", difficulty: 'hard', completed: false },
  { id: 'h8',  description: "Profite lors de trois manches différentes.", difficulty: 'hard', completed: false },
  { id: 'h9',  description: "Trahis avec succès lors de la dernière manche.", difficulty: 'hard', completed: false },
  { id: 'h11', description: "Trahis dans 3 manches différentes.", difficulty: 'hard', completed: false },
  { id: 'h12', description: "Trahis seul dans un pacte à 3 (les 2 autres ont coopéré).", difficulty: 'hard', completed: false },
  { id: 'h14', description: "Coopère 3 manches d'affilée.", difficulty: 'hard', completed: false },
  { id: 'h15', description: "Sois en pacte à 3 dans 3 manches différentes.", difficulty: 'hard', completed: false },
]
