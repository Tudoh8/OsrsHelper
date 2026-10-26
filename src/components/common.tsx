import { useState, type ReactNode } from 'react';
import type { Check, ChainStep, Status } from '../lib/advice';
import { questWikiUrl, wikiUrl, type Rewards } from '../lib/data';
import { formatXp, skillIcon, type Skill } from '../lib/skills';

const STATUS_LABEL: Record<Status, string> = {
  done: 'Done',
  ready: 'Ready',
  boost: 'Ready with a boost',
  blocked: 'Blocked',
};

export function StatusBadge({ status, inProgress }: { status: Status; inProgress?: boolean }) {
  return (
    <span className={`badge badge-${status}`}>
      {inProgress && status !== 'done' ? 'In progress' : STATUS_LABEL[status]}
    </span>
  );
}

export function SkillIcon({ skill, size = 18 }: { skill: Skill; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      className="skill-icon"
      src={skillIcon(skill)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function WikiLink({ page, children }: { page: string; children: ReactNode }) {
  return (
    <a href={wikiUrl(page)} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export function QuestLink({ name }: { name: string }) {
  return (
    <a href={questWikiUrl(name)} target="_blank" rel="noreferrer">
      {name}
    </a>
  );
}

/** What is still missing for a quest or diary tier. */
export function Gaps({ check }: { check: Check }) {
  if (check.status === 'done' || check.status === 'ready') return null;
  return (
    <ul className="gaps">
      {check.skillGaps.map((g) => (
        <li key={g.skill}>
          <SkillIcon skill={g.skill} size={14} /> {g.level} {g.skill}{' '}
          <span className="muted">
            (you have {g.have}{g.boostable ? ', boostable' : ''}, {formatXp(g.xp)} XP)
          </span>
        </li>
      ))}
      {check.questGaps.map((q) => (
        <li key={q.name}>
          {q.state === 'started' ? 'Start ' : ''}
          <QuestLink name={q.name} />
        </li>
      ))}
      {check.qpShort > 0 && <li>{check.qpShort} more quest points</li>}
      {check.combatShort > 0 && <li>{check.combatShort} more combat levels</li>}
    </ul>
  );
}

export function RewardList({ rewards }: { rewards?: Rewards }) {
  if (!rewards) return null;
  const parts: ReactNode[] = [];
  if (rewards.xp?.length) {
    parts.push(
      <li key="xp">
        {rewards.xp.map((x, i) => (
          <span key={i} className="xp-reward">
            <SkillIcon skill={x.skill} size={14} /> {formatXp(x.xp)} {x.skill}
            {x.choice ? ' (choice)' : ''}
          </span>
        ))}
      </li>,
    );
  }
  rewards.unlocks?.forEach((u, i) => parts.push(<li key={`u${i}`}>{u}</li>));
  rewards.items?.forEach((it, i) => parts.push(<li key={`i${i}`}>{it}</li>));
  if (!parts.length) return null;
  return <ul className="rewards">{parts}</ul>;
}

/** Ordered list of quests still needed for a goal. */
export function Chain({ steps, limit = 8 }: { steps: ChainStep[]; limit?: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? steps : steps.slice(0, limit);
  return (
    <>
      <ol className="chain">
        {shown.map((s) => (
          <li key={s.quest.name}>
            <QuestLink name={s.quest.name} />
            {s.startOnly && <span className="muted"> (start only)</span>} <StatusBadge status={s.check.status} />
          </li>
        ))}
      </ol>
      {steps.length > limit && (
        <button className="link-button" onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${steps.length}`}
        </button>
      )}
    </>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
