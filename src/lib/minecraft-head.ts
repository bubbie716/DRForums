// Minotar API — https://minotar.net/
// Avatar URL format: https://minotar.net/avatar/{username}/{size}.png

const PLACEHOLDER_USERNAMES = [
  "Notch",
  "jeb_",
  "Dream",
  "Technoblade",
  "Philza",
  "CaptainSparklez",
  "Purpled",
  "TommyInnit",
  "WilburSoot",
  "Tubbo",
  "Ranboo",
  "Sapnap",
  "GeorgeNotFound",
  "BadBoyHalo",
  "Skeppy",
  "Punz",
  "Foolish",
  "Steve",
  "Alex",
  "Herobrine",
  "Etho",
  "VintageBeef",
  "Bdubs",
  "Grian",
  "Mumbo",
  "Scar",
  "ImpulseSV",
  "Tango",
  "iJevin",
  "Zedaph",
];

export function getMinecraftHeadUsername(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return PLACEHOLDER_USERNAMES[Math.abs(hash) % PLACEHOLDER_USERNAMES.length];
}

export function getMinecraftHeadUrl(username: string, size = 48): string {
  return `https://minotar.net/avatar/${encodeURIComponent(username)}/${size}.png`;
}

export function resolveMinecraftHeadUsername(
  seed: string,
  minecraftUsername?: string | null
): string {
  return minecraftUsername ?? getMinecraftHeadUsername(seed);
}
