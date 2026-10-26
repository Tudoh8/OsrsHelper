import {
  DIARIES, DIARY_NAMES, IRONMAN_ORDER, ORDER_INDEX, QUESTS, QUEST_BY_NAME, TIERS,
  type DiaryTier, type Quest, type QuestReq, type Requirements, type SkillReq, type Tier,
} from './data';
import { MILESTONES, type Milestone } from './milestones';
import { SKILLS, combatLevel, xpBetween, xpForLevel, type Skill } from './skills';
import { isTierComplete, type Player } from './player';

/** Boostable requirements this close are treated as doable with a boost. */
export const BOOST_LEEWAY = 3;

export interface SkillGap extends SkillReq {
  have: number;
  /** XP still needed to reach the level. */
  xp: number;
}

/** XP still needed to reach `level`: exact with Hiscores XP, else from the start of the current level. */
export function xpTo(player: Player, skill: Skill, level: number): number {
  const xp = player.xp?.[skill];
  return xp === undefined ? xpBetween(player.levels[skill], level) : Math.max(0, xpForLevel(level) - xp);
}

export type Status = 'done' | 'ready' | 'boost' | 'blocked';

export interface Check {
  status: Status;
  skillGaps: SkillGap[];
  questGaps: QuestReq[];
  qpShort: number;
  combatShort: number;
}

export function questState(player: Player, name: string): 0 | 1 | 2 {
  return player.quests[name] ?? 0;
}

export function isQuestDone(player: Player, name: string): boolean {
  return questState(player, name) === 2;
}

function reqMet(player: Player, req: QuestReq): boolean {
  const state = questState(player, req.name);
  return req.state === 'started' ? state >= 1 : state === 2;
}

export function questPoints(player: Player): number {
  return QUESTS.reduce((sum, q) => (isQuestDone(player, q.name) ? sum + q.questPoints : sum), 0);
}

export function checkRequirements(player: Player, reqs: Requirements, done = false): Check {
  const skillGaps = reqs.skills
    .filter((r) => player.levels[r.skill] < r.level)
    .map((r) => ({ ...r, have: player.levels[r.skill], xp: xpTo(player, r.skill, r.level) }));
  const questGaps = reqs.quests.filter((r) => !reqMet(player, r));
  const qpShort = Math.max(0, (reqs.questPointsRequired ?? 0) - questPoints(player));
  const combatShort = Math.max(0, (reqs.combatLevel ?? 0) - combatLevel(player.levels));

  let status: Status;
  if (done) status = 'done';
  else if (!skillGaps.length && !questGaps.length && !qpShort && !combatShort) status = 'ready';
  else if (
    !questGaps.length && !qpShort && !combatShort &&
    skillGaps.every((g) => g.boostable && g.level - g.have <= BOOST_LEEWAY)
  ) status = 'boost';
  else status = 'blocked';

  return { status, skillGaps, questGaps, qpShort, combatShort };
}

export function checkQuest(player: Player, quest: Quest): Check {
  return checkRequirements(player, quest, isQuestDone(player, quest.name));
}

const byOrder = (a: string, b: string) => (ORDER_INDEX.get(a) ?? 1e9) - (ORDER_INDEX.get(b) ?? 1e9);

export interface ChainStep {
  quest: Quest;
  /** Only needs to be started, not finished. */
  startOnly: boolean;
  check: Check;
}

/**
 * Every unfinished quest needed to finish (or start) the targets, prerequisites first.
 * Among quests that could be done at the same point, the ironman guide's order wins.
 */
export function questChain(player: Player, finish: string[], start: string[] = []): ChainStep[] {
  const need = new Map<string, boolean>(); // name -> startOnly
  const visit = (name: string, startOnly: boolean) => {
    const state = questState(player, name);
    if (state === 2 || (startOnly && state >= 1)) return;
    if (need.has(name)) {
      if (!startOnly) need.set(name, false);
      return;
    }
    need.set(name, startOnly);
    const quest = QUEST_BY_NAME.get(name);
    quest?.quests.forEach((r) => visit(r.name, r.state === 'started'));
  };
  finish.forEach((n) => visit(n, false));
  start.forEach((n) => visit(n, true));

  // Topological sort, picking the earliest quest in the ironman guide each time.
  const pending = new Set(need.keys());
  const order: string[] = [];
  while (pending.size) {
    const available = [...pending]
      .filter((n) => !(QUEST_BY_NAME.get(n)?.quests ?? []).some((r) => pending.has(r.name)))
      .sort(byOrder);
    const next = available[0] ?? [...pending].sort(byOrder)[0]; // cycle guard
    order.push(next);
    pending.delete(next);
  }

  return order
    .map((name) => QUEST_BY_NAME.get(name))
    .filter((q): q is Quest => !!q && !q.aggregate)
    .map((quest) => {
      const startOnly = need.get(quest.name)!;
      // Starting a quest rarely needs its skill levels (e.g. Fairytale II for fairy rings).
      const check = startOnly ? checkRequirements(player, { ...quest, skills: [] }) : checkQuest(player, quest);
      return { quest, startOnly, check };
    });
}

/** Highest level of each skill needed across a set of requirements, keeping only unmet ones. */
export function skillTargets(player: Player, reqLists: { source: string; reqs: SkillReq[] }[]) {
  const best = new Map<Skill, { level: number; source: string }>();
  for (const { source, reqs } of reqLists) {
    for (const r of reqs) {
      const cur = best.get(r.skill);
      if (!cur || r.level > cur.level) best.set(r.skill, { level: r.level, source });
    }
  }
  return [...best.entries()]
    .filter(([skill, t]) => player.levels[skill] < t.level)
    .map(([skill, t]) => ({ skill, level: t.level, have: player.levels[skill], xp: xpTo(player, skill, t.level), source: t.source }))
    .sort((a, b) => b.xp - a.xp);
}

// ---------------------------------------------------------------------------
// Quests

export interface QuestAdvice {
  quest: Quest;
  check: Check;
  inProgress: boolean;
  orderIndex: number;
}

export function allQuestAdvice(player: Player): QuestAdvice[] {
  return IRONMAN_ORDER.map((name, orderIndex) => {
    const quest = QUEST_BY_NAME.get(name)!;
    return { quest, check: checkQuest(player, quest), inProgress: questState(player, name) === 1, orderIndex };
  });
}

/** Unfinished quests you can do right now, in ironman guide order. */
export function readyQuests(player: Player): QuestAdvice[] {
  return allQuestAdvice(player).filter((a) => a.check.status === 'ready' || a.check.status === 'boost');
}

/** The first unfinished quest in the guide, and what stands in its way if anything. */
export function nextInGuide(player: Player): QuestAdvice | undefined {
  return allQuestAdvice(player).find((a) => a.check.status !== 'done');
}

export function questCapeTargets(player: Player) {
  const remaining = QUESTS.filter((q) => !q.miniquest && !q.aggregate && !isQuestDone(player, q.name));
  return skillTargets(player, remaining.map((q) => ({ source: q.name, reqs: q.skills })));
}

// ---------------------------------------------------------------------------
// Milestones

export interface MilestoneProgress {
  milestone: Milestone;
  done: boolean;
  chain: ChainStep[];
  /** Quests still needed vs. total quests involved (including finished ones). */
  remaining: number;
  total: number;
  skillGaps: ReturnType<typeof skillTargets>;
  nextStep?: ChainStep;
}

function closureSize(names: string[]): number {
  const seen = new Set<string>();
  const visit = (n: string) => {
    if (seen.has(n)) return;
    seen.add(n);
    QUEST_BY_NAME.get(n)?.quests.forEach((r) => visit(r.name));
  };
  names.forEach(visit);
  return [...seen].filter((n) => !QUEST_BY_NAME.get(n)?.aggregate).length;
}

export function milestoneProgress(player: Player, m: Milestone): MilestoneProgress {
  const chain = questChain(player, m.quests, m.start ?? []);
  const skillGaps = skillTargets(player, [
    ...chain.map((s) => ({ source: s.quest.name, reqs: s.startOnly ? [] : s.quest.skills })),
    { source: m.title, reqs: m.skills ?? [] },
  ]);
  return {
    milestone: m,
    done: chain.length === 0 && skillGaps.length === 0,
    chain,
    remaining: chain.length,
    total: closureSize([...m.quests, ...(m.start ?? [])]),
    skillGaps,
    nextStep: chain.find((s) => s.check.status === 'ready' || s.check.status === 'boost'),
  };
}

export function allMilestones(player: Player): MilestoneProgress[] {
  return MILESTONES.map((m) => milestoneProgress(player, m));
}

// ---------------------------------------------------------------------------
// Achievement diaries

export interface DiaryAdvice {
  diary: string;
  tier: Tier;
  data: DiaryTier;
  complete: boolean;
  tasksDone: number;
  tasksTotal: number;
  check: Check;
  /** Rough XP still needed to meet every skill requirement. */
  xpNeeded: number;
  /** Unfinished quests needed first, prerequisites included. */
  questsNeeded: ChainStep[];
}

/** Rough cost of an unfinished quest, in XP-equivalents, for ranking. */
const QUEST_EFFORT_XP = 75_000;

export function allDiaryAdvice(player: Player): DiaryAdvice[] {
  const out: DiaryAdvice[] = [];
  for (const diary of DIARY_NAMES) {
    for (const tier of TIERS) {
      const data = DIARIES[diary][tier];
      if (!data) continue;
      const progress = player.diaries[diary]?.[tier];
      const complete = isTierComplete(progress);
      // Quest Helper's diary combat levels are mostly advice for a task's monster, not a game rule,
      // so they are shown as recommendations instead of blocking the tier.
      const check = checkRequirements(player, { ...data, combatLevel: undefined }, complete);
      out.push({
        diary,
        tier,
        data,
        complete,
        tasksDone: progress?.done ?? 0,
        tasksTotal: progress?.total ?? 0,
        check,
        xpNeeded: check.skillGaps.reduce((s, g) => s + g.xp, 0),
        questsNeeded: complete ? [] : questChain(
          player,
          check.questGaps.filter((q) => q.state === 'finished').map((q) => q.name),
          check.questGaps.filter((q) => q.state === 'started').map((q) => q.name),
        ),
      });
    }
  }
  return out;
}

export function diaryEffort(d: DiaryAdvice): number {
  return d.xpNeeded + QUEST_EFFORT_XP * d.questsNeeded.length;
}

const STATUS_RANK: Record<Status, number> = { ready: 0, boost: 1, blocked: 2, done: 3 };

/** Unfinished diary tiers, easiest to finish first. */
export function closestDiaries(player: Player): DiaryAdvice[] {
  return allDiaryAdvice(player)
    .filter((d) => !d.complete)
    .sort((a, b) =>
      STATUS_RANK[a.check.status] - STATUS_RANK[b.check.status] ||
      diaryEffort(a) - diaryEffort(b) ||
      TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier) ||
      (b.tasksTotal ? b.tasksDone / b.tasksTotal : 0) - (a.tasksTotal ? a.tasksDone / a.tasksTotal : 0));
}

// ---------------------------------------------------------------------------
// Skill training

export interface Unlockable {
  kind: 'quest' | 'diary';
  label: string;
  weight: number;
  skills: SkillReq[];
}

export interface TrainingSuggestion {
  skill: Skill;
  from: number;
  to: number;
  xp: number;
  /** Things that become doable once this level is reached. */
  unlocks: Unlockable[];
  /** Things this level gets you closer to but that need other skills too. */
  helps: Unlockable[];
  score: number;
}

const TIER_WEIGHT: Record<Tier, number> = { Easy: 0.5, Medium: 0.75, Hard: 1, Elite: 1.25 };

/** Quests and diary tiers whose only remaining blockers are skill levels. */
function skillBlockedUnlockables(player: Player): Unlockable[] {
  const milestoneQuests = new Set<string>();
  for (const m of allMilestones(player)) m.chain.forEach((s) => milestoneQuests.add(s.quest.name));
  const soon = new Set(allQuestAdvice(player).filter((a) => a.check.status !== 'done').slice(0, 25).map((a) => a.quest.name));

  const out: Unlockable[] = [];
  for (const a of allQuestAdvice(player)) {
    const c = a.check;
    if (c.status === 'done' || c.questGaps.length || c.qpShort || c.combatShort || !c.skillGaps.length) continue;
    out.push({
      kind: 'quest',
      label: a.quest.name,
      weight: 1 + (milestoneQuests.has(a.quest.name) ? 1 : 0) + (soon.has(a.quest.name) ? 0.5 : 0) + (a.quest.miniquest ? -0.3 : 0),
      skills: a.quest.skills,
    });
  }
  for (const d of allDiaryAdvice(player)) {
    const c = d.check;
    if (d.complete || c.questGaps.length || c.qpShort || c.combatShort || !c.skillGaps.length) continue;
    out.push({ kind: 'diary', label: `${d.diary} ${d.tier}`, weight: TIER_WEIGHT[d.tier], skills: d.data.skills });
  }
  return out;
}

export function trainingSuggestions(player: Player): TrainingSuggestion[] {
  const items = skillBlockedUnlockables(player);
  const suggestions: TrainingSuggestion[] = [];

  for (const skill of SKILLS) {
    const have = player.levels[skill];
    const targets = new Set<number>();
    for (const it of items) for (const r of it.skills) if (r.skill === skill && r.level > have) targets.add(r.level);

    let best: TrainingSuggestion | undefined;
    for (const to of [...targets].sort((a, b) => a - b)) {
      const unlocks: Unlockable[] = [];
      const helps: Unlockable[] = [];
      for (const it of items) {
        const mine = it.skills.find((r) => r.skill === skill && r.level > have);
        if (!mine || mine.level > to) continue;
        const othersMet = it.skills.every((r) => r.skill === skill || player.levels[r.skill] >= r.level);
        (othersMet ? unlocks : helps).push(it);
      }
      const xp = xpTo(player, skill, to);
      const value = unlocks.reduce((s, u) => s + u.weight, 0) + 0.25 * helps.reduce((s, u) => s + u.weight, 0);
      // Diminishing cost so cheap unlocks win, without hiding bigger goals entirely.
      const score = value / Math.sqrt(1 + xp / 50_000);
      if (!best || score > best.score) best = { skill, from: have, to, xp, unlocks, helps, score };
    }
    // Far-off goals that only "help" are noise next to concrete unlocks.
    if (best && (best.unlocks.length || best.to - best.from <= 10)) suggestions.push(best);
  }
  return suggestions.sort((a, b) => b.score - a.score);
}

export interface BalanceNote {
  skill: Skill;
  level: number;
  median: number;
}

/** Skills lagging well behind the rest of the account. */
export function laggingSkills(player: Player): BalanceNote[] {
  const levels = SKILLS.map((s) => player.levels[s]).sort((a, b) => a - b);
  const median = levels[Math.floor(levels.length / 2)];
  return SKILLS.filter((s) => player.levels[s] <= median - 15)
    .map((skill) => ({ skill, level: player.levels[skill], median }))
    .sort((a, b) => a.level - b.level);
}

/** Skills closest to 99 (by XP still needed), excluding those already at 99. */
export function closestTo99(player: Player, n = 3) {
  return SKILLS.filter((s) => player.levels[s] < 99 && player.levels[s] >= 70)
    .map((skill) => ({ skill, level: player.levels[skill], xp: xpTo(player, skill, 99) }))
    .sort((a, b) => a.xp - b.xp)
    .slice(0, n);
}

/** What raises combat level by one, with the fewest levels in a single skill. */
export function nextCombatLevel(player: Player) {
  const current = combatLevel(player.levels);
  const options: { skill: Skill; levels: number }[] = [];
  for (const skill of ['Attack', 'Strength', 'Defence', 'Hitpoints', 'Prayer', 'Ranged', 'Magic'] as Skill[]) {
    for (let add = 1; player.levels[skill] + add <= 99; add++) {
      if (combatLevel({ ...player.levels, [skill]: player.levels[skill] + add }) > current) {
        options.push({ skill, levels: add });
        break;
      }
    }
  }
  return { current, options: options.sort((a, b) => a.levels - b.levels) };
}

// ---------------------------------------------------------------------------

export type Advice = ReturnType<typeof buildAdvice>;

export function buildAdvice(player: Player) {
  const quests = allQuestAdvice(player);
  const diaries = allDiaryAdvice(player);
  return {
    quests,
    ready: quests.filter((a) => a.check.status === 'ready' || a.check.status === 'boost'),
    next: quests.find((a) => a.check.status !== 'done'),
    milestones: allMilestones(player),
    diaries,
    closestDiaries: closestDiaries(player),
    diariesDone: diaries.filter((d) => d.complete).length,
    training: trainingSuggestions(player),
    questCape: questCapeTargets(player),
    allDiaries: skillTargets(player, diaries.filter((d) => !d.complete).map((d) => ({ source: `${d.diary} ${d.tier}`, reqs: d.data.skills }))),
    lagging: laggingSkills(player),
    to99: closestTo99(player),
    combat: nextCombatLevel(player),
  };
}
