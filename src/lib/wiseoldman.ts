import { SKILLS, type Skill } from './skills';
import type { AccountType, Stats } from './player';

// Wise Old Man reads the official Hiscores and allows requests from other websites.
const API = 'https://api.wiseoldman.net/v2/players';

export class LookupError extends Error {
  constructor(
    message: string,
    readonly kind: 'not-found' | 'network' | 'rate-limit',
  ) {
    super(message);
  }
}

interface WomSkill {
  level: number;
  experience: number;
}

interface WomPlayer {
  displayName: string;
  type: string;
  updatedAt?: string;
  latestSnapshot?: { data: { skills: Record<string, WomSkill> } } | null;
}

// Wise Old Man's name for each skill, where it differs from ours.
const WOM_KEY: Partial<Record<Skill, string>> = { Runecraft: 'runecrafting' };

function toStats(p: WomPlayer): Stats {
  const skills = p.latestSnapshot?.data.skills;
  if (!skills) throw new LookupError(`No Hiscores data for "${p.displayName}" yet.`, 'not-found');
  const levels = {} as Record<Skill, number>;
  const xp = {} as Record<Skill, number>;
  for (const skill of SKILLS) {
    const s = skills[WOM_KEY[skill] ?? skill.toLowerCase()];
    // Unranked skills come back as -1; treat them as the starting level.
    const start = skill === 'Hitpoints' ? 10 : 1;
    levels[skill] = s && s.level > 0 ? s.level : start;
    xp[skill] = s && s.experience > 0 ? s.experience : 0;
  }
  const known: AccountType[] = ['regular', 'ironman', 'hardcore', 'ultimate'];
  return {
    username: p.displayName,
    type: known.includes(p.type as AccountType) ? (p.type as AccountType) : 'unknown',
    updatedAt: p.updatedAt,
    levels,
    xp,
  };
}

async function call(method: 'GET' | 'POST', name: string): Promise<Response> {
  try {
    return await fetch(`${API}/${encodeURIComponent(name.trim())}`, { method });
  } catch {
    throw new LookupError('Could not reach Wise Old Man.', 'network');
  }
}

/**
 * Asks Wise Old Man to refresh the player from the Hiscores (this also starts tracking a
 * new name), and falls back to the last stored snapshot if the refresh is refused,
 * e.g. because it was refreshed moments ago.
 */
export async function fetchStats(name: string): Promise<Stats> {
  const updated = await call('POST', name);
  if (updated.ok) return toStats(await updated.json());

  const stored = await call('GET', name);
  if (stored.ok) return toStats(await stored.json());
  if (updated.status === 429 || stored.status === 429) {
    throw new LookupError('Too many lookups in a minute. Wait a moment and try again.', 'rate-limit');
  }
  if (stored.status === 404) {
    throw new LookupError(
      `"${name}" isn't on the Hiscores. Check the spelling; new accounts show up once a skill is ranked.`,
      'not-found',
    );
  }
  throw new LookupError(`Wise Old Man answered with HTTP ${stored.status}.`, 'network');
}
