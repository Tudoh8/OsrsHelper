import questsJson from '../data/quests.json';
import diariesJson from '../data/diaries.json';
import ironmanOrderJson from '../data/ironmanQuestOrder.json';
import type { Skill } from './skills';

export interface SkillReq {
  skill: Skill;
  level: number;
  boostable: boolean;
}

export interface QuestReq {
  name: string;
  /** "started" means the quest only has to be begun, not finished. */
  state: 'finished' | 'started';
}

export interface Rewards {
  xp?: { skill: Skill; xp: number; choice?: boolean }[];
  items?: string[];
  unlocks?: string[];
}

export interface Requirements {
  skills: SkillReq[];
  quests: QuestReq[];
  questPointsRequired?: number;
  combatLevel?: number;
}

export interface Quest extends Requirements {
  name: string;
  miniquest: boolean;
  members: boolean;
  questPoints: number;
  rewards?: Rewards;
  /** Stands for a group of other quests (Recipe for Disaster as a whole). */
  aggregate?: boolean;
  /** Requirement data is hand-entered and may be missing things. */
  incomplete?: boolean;
}

export const TIERS = ['Easy', 'Medium', 'Hard', 'Elite'] as const;
export type Tier = (typeof TIERS)[number];

export interface DiaryTier extends Requirements {
  rewards?: Rewards;
}

export const QUESTS: Quest[] = questsJson as Quest[];
export const QUEST_BY_NAME: Map<string, Quest> = new Map(QUESTS.map((q) => [q.name, q]));
export const DIARIES = diariesJson as Record<string, Record<Tier, DiaryTier>>;
export const DIARY_NAMES = Object.keys(DIARIES).sort();

/** Quest order from the OSRS Wiki's "Optimal quest guide/Ironman", via Quest Helper. */
export const IRONMAN_ORDER: string[] = (() => {
  const order = (ironmanOrderJson as string[]).filter((n) => QUEST_BY_NAME.has(n));
  // Anything the guide doesn't place yet (new releases) goes at the end.
  for (const q of QUESTS) if (!order.includes(q.name) && !q.aggregate) order.push(q.name);
  return order;
})();

export const ORDER_INDEX: Map<string, number> = new Map(IRONMAN_ORDER.map((n, i) => [n, i]));

export const MAX_QUEST_POINTS = QUESTS.reduce((s, q) => s + q.questPoints, 0);

export function wikiUrl(page: string): string {
  return `https://oldschool.runescape.wiki/w/${encodeURIComponent(page.replace(/ /g, '_'))}`;
}

export function questWikiUrl(name: string): string {
  return wikiUrl(name.startsWith('Recipe for Disaster') ? 'Recipe for Disaster' : name);
}

export function diaryWikiUrl(diary: string): string {
  return wikiUrl(`${diary} Diary`);
}
