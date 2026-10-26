import { describe, expect, it } from 'vitest';
import sample from '../../public/sample-player.json';
import {
  allDiaryAdvice, allMilestones, checkQuest, closestDiaries, nextCombatLevel, questChain,
  questPoints, readyQuests, trainingSuggestions,
} from './advice';
import { DIARIES, IRONMAN_ORDER, MAX_QUEST_POINTS, QUESTS, QUEST_BY_NAME } from './data';
import { MILESTONES } from './milestones';
import { SKILLS, combatLevel, xpForLevel } from './skills';
import { parsePlayer, type Player } from './wikisync';

const player = parsePlayer(sample);

function fresh(): Player {
  const levels = Object.fromEntries(SKILLS.map((s) => [s, s === 'Hitpoints' ? 10 : 1])) as Player['levels'];
  return { username: 'new', levels, quests: {}, diaries: {} };
}

describe('data', () => {
  it('has every quest prerequisite defined', () => {
    for (const q of QUESTS) for (const r of q.quests) expect(QUEST_BY_NAME.has(r.name), `${q.name} -> ${r.name}`).toBe(true);
  });

  it('only references real quests in milestones', () => {
    for (const m of MILESTONES) {
      for (const n of [...m.quests, ...(m.start ?? [])]) expect(QUEST_BY_NAME.has(n), n).toBe(true);
    }
  });

  it('has all twelve diaries with four tiers', () => {
    expect(Object.keys(DIARIES)).toHaveLength(12);
    for (const d of Object.values(DIARIES)) expect(Object.keys(d).sort()).toEqual(['Easy', 'Elite', 'Hard', 'Medium']);
  });

  it('orders every non-aggregate quest', () => {
    expect(new Set(IRONMAN_ORDER).size).toBe(IRONMAN_ORDER.length);
    expect(IRONMAN_ORDER.length).toBe(QUESTS.filter((q) => !q.aggregate).length);
  });

  it('has a plausible quest point total', () => {
    expect(MAX_QUEST_POINTS).toBeGreaterThan(300);
    expect(MAX_QUEST_POINTS).toBeLessThan(400);
  });
});

describe('skills', () => {
  it('matches the OSRS XP table', () => {
    expect(xpForLevel(2)).toBe(83);
    expect(xpForLevel(50)).toBe(101_333);
    expect(xpForLevel(99)).toBe(13_034_431);
  });

  it('computes combat level', () => {
    expect(combatLevel(fresh().levels)).toBe(3);
    const maxed = Object.fromEntries(SKILLS.map((s) => [s, 99])) as Player['levels'];
    expect(combatLevel(maxed)).toBe(126);
  });
});

describe('parsePlayer', () => {
  it('reads WikiSync JSON', () => {
    expect(player.username).toBe('Sample Iron');
    expect(player.levels.Sailing).toBe(34);
    expect(player.diaries.Ardougne.Easy?.complete).toBe(true);
  });

  it('rejects other JSON', () => {
    expect(() => parsePlayer({ foo: 1 })).toThrow();
  });
});

describe('quests', () => {
  it('blocks Desert Treasure I on its prerequisites for a new account', () => {
    const c = checkQuest(fresh(), QUEST_BY_NAME.get('Desert Treasure I')!);
    expect(c.status).toBe('blocked');
    expect(c.questGaps.map((q) => q.name)).toContain('The Dig Site');
    expect(c.skillGaps.map((g) => g.skill)).toEqual(expect.arrayContaining(['Thieving', 'Magic', 'Firemaking']));
  });

  it("lets a new account start with Cook's Assistant", () => {
    expect(readyQuests(fresh()).map((a) => a.quest.name)).toContain("Cook's Assistant");
  });

  it('orders a quest chain with prerequisites first', () => {
    const chain = questChain(fresh(), ['Recipe for Disaster - Culinaromancer']).map((s) => s.quest.name);
    expect(chain.at(-1)).toBe('Recipe for Disaster - Culinaromancer');
    for (const [i, name] of chain.entries()) {
      for (const r of QUEST_BY_NAME.get(name)!.quests) {
        if (chain.includes(r.name)) expect(chain.indexOf(r.name), `${r.name} before ${name}`).toBeLessThan(i);
      }
    }
  });

  it('counts quest points from finished quests', () => {
    expect(questPoints(fresh())).toBe(0);
    expect(questPoints(player)).toBeGreaterThan(50);
  });
});

describe('milestones', () => {
  it('treats fairy rings as needing Fairytale II started, not finished', () => {
    const p = fresh();
    for (const n of ['Fairytale I - Growing Pains', 'Nature Spirit', 'Priest in Peril', 'The Restless Ghost', 'Jungle Potion', 'Druidic Ritual', 'Lost City']) p.quests[n] = 2;
    p.quests['Fairytale II - Cure a Queen'] = 1;
    const fr = allMilestones(p).find((m) => m.milestone.id === 'fairy-rings')!;
    expect(fr.done).toBe(true);
  });
});

describe('diaries', () => {
  it('covers 48 tiers and ranks unfinished ones', () => {
    expect(allDiaryAdvice(player)).toHaveLength(48);
    const closest = closestDiaries(player);
    expect(closest.every((d) => !d.complete)).toBe(true);
  });
});

describe('training', () => {
  it('suggests levels that unlock something', () => {
    const s = trainingSuggestions(player);
    expect(s.length).toBeGreaterThan(0);
    for (const t of s) {
      expect(t.to).toBeGreaterThan(t.from);
      expect(t.unlocks.length + t.helps.length).toBeGreaterThan(0);
    }
  });

  it('finds the cheapest next combat level', () => {
    const { current, options } = nextCombatLevel(fresh());
    expect(current).toBe(3);
    expect(options[0].levels).toBeGreaterThan(0);
  });
});
