export const SKILLS = [
  'Attack', 'Hitpoints', 'Mining',
  'Strength', 'Agility', 'Smithing',
  'Defence', 'Herblore', 'Fishing',
  'Ranged', 'Thieving', 'Cooking',
  'Prayer', 'Crafting', 'Firemaking',
  'Magic', 'Fletching', 'Woodcutting',
  'Runecraft', 'Slayer', 'Farming',
  'Construction', 'Hunter', 'Sailing',
] as const;

export type Skill = (typeof SKILLS)[number];

export const COMBAT_SKILLS: Skill[] = ['Attack', 'Strength', 'Defence', 'Hitpoints', 'Ranged', 'Prayer', 'Magic'];

const XP_TABLE: number[] = (() => {
  const table = [0, 0];
  let points = 0;
  for (let lvl = 1; lvl < 127; lvl++) {
    points += Math.floor(lvl + 300 * Math.pow(2, lvl / 7));
    table.push(Math.floor(points / 4));
  }
  return table;
})();

/** Experience needed to reach `level` from scratch. */
export function xpForLevel(level: number): number {
  return XP_TABLE[Math.max(1, Math.min(level, 126))];
}

/**
 * WikiSync only reports levels, so assume the player sits at the start of their
 * current level. That overestimates the XP still needed by at most one level.
 */
export function xpBetween(from: number, to: number): number {
  return Math.max(0, xpForLevel(to) - xpForLevel(from));
}

export function combatLevel(levels: Record<Skill, number>): number {
  const base = 0.25 * (levels.Defence + levels.Hitpoints + Math.floor(levels.Prayer / 2));
  const melee = 0.325 * (levels.Attack + levels.Strength);
  const range = 0.325 * Math.floor(levels.Ranged * 1.5);
  const mage = 0.325 * Math.floor(levels.Magic * 1.5);
  return Math.floor(base + Math.max(melee, range, mage));
}

export function totalLevel(levels: Record<Skill, number>): number {
  return SKILLS.reduce((sum, s) => sum + levels[s], 0);
}

export function skillIcon(skill: Skill): string {
  return `https://oldschool.runescape.wiki/images/${skill}_icon.png`;
}

export function formatXp(xp: number): string {
  if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(xp >= 10_000_000 ? 0 : 1)}M`;
  if (xp >= 1_000) return `${(xp / 1_000).toFixed(xp >= 100_000 ? 0 : 1)}k`;
  return String(xp);
}
