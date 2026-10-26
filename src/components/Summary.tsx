import { MAX_QUEST_POINTS, QUESTS } from '../lib/data';
import { combatLevel, SKILLS, totalLevel, formatXp } from '../lib/skills';
import type { AccountType, Player } from '../lib/player';
import { isQuestDone, questPoints, xpTo } from '../lib/advice';
import { SkillIcon } from './common';

const TYPE_LABEL: Record<AccountType, string | null> = {
  regular: null,
  ironman: 'Ironman',
  hardcore: 'Hardcore ironman',
  ultimate: 'Ultimate ironman',
  unknown: null,
};

function timeAgo(iso?: string): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hours ago`;
  return `${Math.round(hours / 24)} days ago`;
}

export function Summary({ player, diariesDone }: { player: Player; diariesDone: number }) {
  const quests = QUESTS.filter((q) => !q.miniquest && !q.aggregate);
  const questsDone = quests.filter((q) => isQuestDone(player, q.name)).length;
  const updated = timeAgo(player.updatedAt);
  const typeLabel = TYPE_LABEL[player.type];

  return (
    <section className="card summary">
      <div className="summary-head">
        <h2>
          {player.username} {typeLabel && <span className="tag">{typeLabel}</span>}
        </h2>
        {updated && <span className="muted small">Hiscores updated {updated}</span>}
      </div>
      <div className="stat-row">
        <Stat label="Total level" value={totalLevel(player.levels)} />
        <Stat label="Combat" value={combatLevel(player.levels)} />
        <Stat label="Quest points" value={`${questPoints(player)} / ${MAX_QUEST_POINTS}`} />
        <Stat label="Quests" value={`${questsDone} / ${quests.length}`} />
        <Stat label="Diary tiers" value={`${diariesDone} / 48`} />
      </div>
      <div className="skills-grid">
        {SKILLS.map((s) => {
          const lvl = player.levels[s];
          const xp = player.xp?.[s];
          const title = lvl >= 99
            ? `${s}: 99${xp ? ` (${formatXp(xp)} XP)` : ''}`
            : `${s}: ${lvl}, ${formatXp(xpTo(player, s, lvl + 1))} XP to ${lvl + 1}`;
          return (
            <div key={s} className={`skill-cell${lvl >= 99 ? ' maxed' : ''}`} title={title}>
              <SkillIcon skill={s} size={20} />
              <span className="skill-name">{s}</span>
              <span className="skill-level">{lvl}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
