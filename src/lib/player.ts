import type { Tier } from './data';
import type { Skill } from './skills';

/** 0 = not started, 1 = in progress, 2 = finished. */
export type QuestState = 0 | 1 | 2;

export interface DiaryTierProgress {
  done: number;
  total: number;
}

/** What the player has done: kept in the browser and edited on the site. */
export interface Progress {
  quests: Record<string, QuestState>;
  diaries: Record<string, Partial<Record<Tier, DiaryTierProgress>>>;
}

export type AccountType = 'regular' | 'ironman' | 'hardcore' | 'ultimate' | 'unknown';

/** Levels and XP from the Hiscores. */
export interface Stats {
  username: string;
  type: AccountType;
  updatedAt?: string;
  levels: Record<Skill, number>;
  xp?: Record<Skill, number>;
}

export interface Player extends Progress, Stats {}

export function isTierComplete(p?: DiaryTierProgress): boolean {
  return !!p && p.total > 0 && p.done >= p.total;
}
