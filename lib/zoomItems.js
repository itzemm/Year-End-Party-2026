// Built-in pictures for "Guess the Item". Vector images (Twemoji, CC-BY 4.0) so
// they stay sharp even zoomed 14×. Organisers can add their own photos in the game.
export const DEFAULT_ZOOM_ITEMS = [
  ["26c4", "Snowman"],
  ["1f384", "Christmas tree"],
  ["1f381", "Gift box"],
  ["1f9e4", "Gloves"],
  ["1f9e3", "Scarf"],
  ["26f8", "Ice skate"],
  ["1f6f7", "Sled"],
  ["1f427", "Penguin"],
  ["1f43b-200d-2744-fe0f", "Polar bear"],
  ["1f98c", "Reindeer"],
  ["2615", "Hot chocolate"],
  ["1f36a", "Cookie"],
  ["1f514", "Bell"],
  ["1f9e6", "Socks"],
  ["1f9e5", "Winter coat"],
  ["1f3d4", "Snowy mountain"],
  ["1f385", "Santa Claus"],
  ["1f37e", "Champagne"],
  ["1f386", "Fireworks"],
  ["1f56f", "Candle"],
  ["1f36d", "Lollipop"],
  ["1f9f8", "Teddy bear"],
  ["26f7", "Skier"],
  ["1f3c2", "Snowboarder"],
].map(([file, name]) => ({ id: `builtin-${file}`, name, src: `/zoom/${file}.svg`, builtin: true }));

// Zoom levels for each clue, from extreme close-up to the full picture.
export const ZOOM_LEVELS = [14, 9, 6, 4, 2.4, 1];
