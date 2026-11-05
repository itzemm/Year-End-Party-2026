export const CHARACTERS = [
  { name: "Alice", emoji: "🎀", suit: "♥" },
  { name: "The Mad Hatter", emoji: "🎩", suit: "♣" },
  { name: "The Cheshire Cat", emoji: "😸", suit: "♦" },
  { name: "The White Rabbit", emoji: "🐇", suit: "♠" },
  { name: "The Queen of Hearts", emoji: "👑", suit: "♥" },
  { name: "The March Hare", emoji: "🫖", suit: "♣" },
  { name: "The Caterpillar", emoji: "🐛", suit: "♦" },
  { name: "The Dormouse", emoji: "🐭", suit: "♠" },
];

export function characterFor(name) {
  return CHARACTERS.find((c) => c.name === name) || CHARACTERS[0];
}
