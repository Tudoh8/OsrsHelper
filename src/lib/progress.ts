import baseline from '../data/myProgress.json';
import { QUEST_BY_NAME, TIERS, type Tier } from './data';
import type { Progress, QuestState } from './player';

const STORE_KEY = 'osrs-helper:progress';

/** Quest and diary progress read from the owner's screenshots. */
export const BASELINE: Progress = {
  quests: baseline.quests as Record<string, QuestState>,
  diaries: baseline.diaries as Progress['diaries'],
};
export const BASELINE_DATE = baseline.recordedAt;

export function loadProgress(): Progress {
  try {
    const s = localStorage.getItem(STORE_KEY);
    if (s) return parseProgress(JSON.parse(s));
  } catch {
    // Missing, blocked or corrupt storage: fall back to the baseline.
  }
  return BASELINE;
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(p));
  } catch {
    // Storage full or blocked; changes last until the page is closed.
  }
}

export function clearSavedProgress() {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Validates progress from storage or an imported backup file. */
export function parseProgress(raw: unknown): Progress {
  const data = raw as Partial<Progress> | null;
  if (!data || typeof data.quests !== 'object' || typeof data.diaries !== 'object') {
    throw new Error('That file is not an OSRS Helper progress backup.');
  }
  const quests: Progress['quests'] = {};
  for (const [name, state] of Object.entries(data.quests ?? {})) {
    if (QUEST_BY_NAME.has(name) && (state === 0 || state === 1 || state === 2)) quests[name] = state;
  }
  const diaries: Progress['diaries'] = {};
  for (const [diary, tiers] of Object.entries(data.diaries ?? {})) {
    diaries[diary] = {};
    for (const tier of TIERS) {
      const t = tiers?.[tier];
      if (t && Number.isFinite(t.done) && Number.isFinite(t.total)) {
        diaries[diary][tier] = { done: Math.max(0, Math.min(t.done, t.total)), total: t.total };
      }
    }
  }
  return { quests, diaries };
}

export function withQuestState(p: Progress, name: string, state: QuestState): Progress {
  const quests = { ...p.quests, [name]: state };
  // Keep "Recipe for Disaster" as a whole in step with its parts.
  if (name.startsWith('Recipe for Disaster - ')) {
    const parts = [...QUEST_BY_NAME.keys()].filter((n) => n.startsWith('Recipe for Disaster - '));
    const states = parts.map((n) => quests[n] ?? 0);
    quests['Recipe for Disaster'] = states.every((s) => s === 2) ? 2 : states.some((s) => s > 0) ? 1 : 0;
  }
  return { ...p, quests };
}

export function withDiaryDone(p: Progress, diary: string, tier: Tier, done: number): Progress {
  const cur = p.diaries[diary]?.[tier];
  if (!cur) return p;
  const next = { ...cur, done: Math.max(0, Math.min(done, cur.total)) };
  return { ...p, diaries: { ...p.diaries, [diary]: { ...p.diaries[diary], [tier]: next } } };
}
