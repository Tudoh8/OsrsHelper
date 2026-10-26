import { useMemo, useState } from 'react';
import type { Advice, QuestAdvice } from '../lib/advice';
import { formatXp, xpBetween } from '../lib/skills';
import { Gaps, QuestLink, RewardList, SkillIcon, StatusBadge } from './common';

type Filter = 'todo' | 'ready' | 'blocked' | 'done' | 'all';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'todo', label: 'Not done' },
  { id: 'ready', label: 'Ready now' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'done', label: 'Done' },
  { id: 'all', label: 'All' },
];

function matches(a: QuestAdvice, f: Filter) {
  const s = a.check.status;
  if (f === 'todo') return s !== 'done';
  if (f === 'ready') return s === 'ready' || s === 'boost';
  if (f === 'blocked') return s === 'blocked';
  if (f === 'done') return s === 'done';
  return true;
}

export function QuestsView({ advice }: { advice: Advice }) {
  const [filter, setFilter] = useState<Filter>('todo');
  const [minis, setMinis] = useState(true);
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return advice.quests.filter((a) =>
      matches(a, filter) && (minis || !a.quest.miniquest) && (!q || a.quest.name.toLowerCase().includes(q)));
  }, [advice, filter, minis, query]);

  const totalXp = advice.questCape.reduce((s, t) => s + xpBetween(t.have, t.level), 0);

  return (
    <div className="stack">
      <section className="card">
        <h3>Quest cape: skill levels still needed</h3>
        {advice.questCape.length ? (
          <>
            <p className="muted small">
              The highest level each remaining quest asks for, about {formatXp(totalXp)} XP in total. Boostable
              requirements are listed at their full level.
            </p>
            <div className="target-grid">
              {advice.questCape.map((t) => (
                <div key={t.skill} className="target">
                  <SkillIcon skill={t.skill} />
                  <span>
                    <strong>{t.skill}</strong> {t.have} → {t.level}
                  </span>
                  <span className="muted small">{t.source}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p>You meet every quest skill requirement. Only the quests themselves are left!</p>
        )}
      </section>

      <section className="card">
        <h3>Ironman quest path</h3>
        <p className="muted small">
          In the order of the OSRS Wiki&apos;s ironman optimal quest guide. Click a quest to see its requirements and rewards.
        </p>
        <div className="toolbar">
          <div className="segmented" role="tablist">
            {FILTERS.map((f) => (
              <button key={f.id} className={filter === f.id ? 'active' : ''} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={minis} onChange={(e) => setMinis(e.target.checked)} /> Miniquests
          </label>
          <input className="search" placeholder="Search quests" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <ol className="quest-list">
          {list.map((a) => (
            <QuestRow key={a.quest.name} a={a} />
          ))}
        </ol>
        {!list.length && <p className="muted">No quests match.</p>}
      </section>
    </div>
  );
}

function QuestRow({ a }: { a: QuestAdvice }) {
  const [open, setOpen] = useState(false);
  const q = a.quest;
  return (
    <li className={`quest-row status-${a.check.status}`}>
      <button className="quest-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="order">{a.orderIndex + 1}</span>
        <span className="quest-name">{q.name}</span>
        {q.miniquest && <span className="tag">mini</span>}
        {q.questPoints > 0 && <span className="muted small">{q.questPoints} QP</span>}
        <StatusBadge status={a.check.status} inProgress={a.inProgress} />
      </button>
      {open && (
        <div className="quest-detail">
          <Gaps check={a.check} />
          {q.skills.length > 0 && (
            <p className="small">
              <span className="muted">Skills: </span>
              {q.skills.map((r) => `${r.level} ${r.skill}${r.boostable ? '*' : ''}`).join(', ')}
            </p>
          )}
          {q.quests.length > 0 && (
            <p className="small">
              <span className="muted">Quests: </span>
              {q.quests.map((r, i) => (
                <span key={r.name}>
                  {i > 0 && ', '}
                  <QuestLink name={r.name} />
                  {r.state === 'started' && ' (started)'}
                </span>
              ))}
            </p>
          )}
          {q.questPointsRequired ? <p className="small"><span className="muted">Quest points: </span>{q.questPointsRequired}</p> : null}
          {q.incomplete && <p className="small muted">Requirement data for this quest may be incomplete; check the wiki.</p>}
          <RewardList rewards={q.rewards} />
          <p className="small"><QuestLink name={q.name} /> on the OSRS Wiki</p>
        </div>
      )}
    </li>
  );
}
