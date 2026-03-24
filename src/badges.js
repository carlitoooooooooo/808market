export const BADGES = [
  { id: "first_hard", label: "First Like", emoji: "🔥", desc: "Like your first beat", check: (stats) => stats.totalHards >= 1 },
  { id: "ten_hards", label: "Hard Heads", emoji: "💯", desc: "Like 10 beats", check: (stats) => stats.totalHards >= 10 },
  { id: "trash_talk", label: "Trash Talk", emoji: "💀", desc: "Pass on 5 beats", check: (stats) => stats.totalTrash >= 5 },
  { id: "genre_king", label: "Genre King", emoji: "👑", desc: "Like beats from 5 different genres", check: (stats) => stats.uniqueGenres >= 5 },
  { id: "critic", label: "The Critic", emoji: "🎯", desc: "Rate 20 beats", check: (stats) => stats.totalRated >= 20 },
  { id: "early_adopter", label: "Early Adopter", emoji: "⚡", desc: "One of the first on 808market", check: () => true },
];
