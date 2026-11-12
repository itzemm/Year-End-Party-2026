// "Arriving as" options on the ticket. `mark` is the corner symbol on the ticket card.
export const CHARACTERS = [
  { name: "The Snow Queen", emoji: "👑", mark: "❄" },
  { name: "The Snowman", emoji: "⛄", mark: "❅" },
  { name: "The Reindeer", emoji: "🦌", mark: "❆" },
  { name: "The Polar Bear", emoji: "🐻‍❄️", mark: "❄" },
  { name: "The Penguin", emoji: "🐧", mark: "❅" },
  { name: "The Snow Owl", emoji: "🦉", mark: "❆" },
  { name: "The Ice Skater", emoji: "⛸️", mark: "❄" },
  { name: "The Gingerbread", emoji: "🍪", mark: "❅" },
];

export function characterFor(name) {
  return CHARACTERS.find((c) => c.name === name) || CHARACTERS[0];
}
