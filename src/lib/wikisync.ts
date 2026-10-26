import { SKILLS, type Skill } from './skills';
import type { Tier } from './data';

/** 0 = not started, 1 = in progress, 2 = finished (WikiSync's encoding). */
export type QuestState = 0 | 1 | 2;

export interface DiaryTierProgress {
  complete: boolean;
  tasks: boolean[];
}

export interface Player {
  username: string;
  timestamp?: string;
  levels: Record<Skill, number>;
  quests: Record<string, QuestState>;
  diaries: Record<string, Partial<Record<Tier, DiaryTierProgress>>>;
}

export const WIKISYNC_URL = (rsn: string) =>
  `https://sync.runescape.wiki/runelite/player/${encodeURIComponent(rsn.trim())}/STANDARD`;

export class WikiSyncError extends Error {
  constructor(
    message: string,
    readonly kind: 'no-data' | 'network' | 'invalid',
  ) {
    super(message);
  }
}

export async function fetchPlayer(rsn: string): Promise<Player> {
  let res: Response;
  try {
    res = await fetch(WIKISYNC_URL(rsn));
  } catch {
    throw new WikiSyncError('Could not reach the WikiSync server.', 'network');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (body?.code === 'NO_USER_DATA') {
      throw new WikiSyncError(`WikiSync has no data for "${rsn}".`, 'no-data');
    }
    throw new WikiSyncError(body?.error ?? `WikiSync answered with HTTP ${res.status}.`, 'network');
  }
  return parsePlayer(body, rsn);
}

/** Accepts the JSON returned by the WikiSync player endpoint. */
export function parsePlayer(raw: unknown, fallbackName = 'Unknown'): Player {
  if (!raw || typeof raw !== 'object') throw new WikiSyncError('That is not WikiSync JSON.', 'invalid');
  const data = raw as Record<string, unknown>;
  const rawLevels = data.levels as Record<string, unknown> | undefined;
  const rawQuests = data.quests as Record<string, unknown> | undefined;
  if (!rawLevels || typeof rawLevels !== 'object' || !rawQuests || typeof rawQuests !== 'object') {
    throw new WikiSyncError('The JSON is missing "levels" or "quests".', 'invalid');
  }

  const levels = {} as Record<Skill, number>;
  for (const skill of SKILLS) {
    const lvl = Number(rawLevels[skill]);
    levels[skill] = Number.isFinite(lvl) && lvl > 0 ? lvl : skill === 'Hitpoints' ? 10 : 1;
  }

  const quests: Record<string, QuestState> = {};
  for (const [name, state] of Object.entries(rawQuests)) {
    if (state === 0 || state === 1 || state === 2) quests[name] = state;
  }

  const diaries: Player['diaries'] = {};
  const rawDiaries = (data.achievement_diaries ?? {}) as Record<string, Record<string, DiaryTierProgress>>;
  for (const [diary, tiers] of Object.entries(rawDiaries)) {
    diaries[diary] = {};
    for (const [tier, progress] of Object.entries(tiers ?? {})) {
      diaries[diary][tier as Tier] = {
        complete: Boolean(progress?.complete),
        tasks: Array.isArray(progress?.tasks) ? progress.tasks.map(Boolean) : [],
      };
    }
  }

  return {
    username: typeof data.username === 'string' ? data.username : fallbackName,
    timestamp: typeof data.timestamp === 'string' ? data.timestamp : undefined,
    levels,
    quests,
    diaries,
  };
}
