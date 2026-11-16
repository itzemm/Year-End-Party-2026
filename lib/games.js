// The game segments in running order, as shown to guests and in the admin "live" switch.
export const GAMES = [
  {
    id: "stage",
    label: "Spotlight",
    icon: "🎤",
    blurb: "Five names are drawn at random to come up on stage. Then comes a funny question — and the host picks the winner!",
  },
  {
    id: "zoom",
    label: "Guess the Item",
    icon: "🔍",
    blurb: "A mystery picture zooms out every 10 seconds. Type what it is — 5 pictures, and the most correct answers in the fastest time wins.",
  },
  {
    id: "sun",
    label: "Smallest Unique Number",
    icon: "🔢",
    blurb: "You have 1 minute to pick a number from 1 to 100. The smallest number that nobody else picked wins!",
  },
];

export const gameById = (id) => GAMES.find((g) => g.id === id) || null;
