import { useState } from 'react';
import { type Advice, type DiaryAdvice } from '../lib/advice';
import { DIARY_NAMES, TIERS, diaryWikiUrl } from '../lib/data';
import { combatLevel, formatXp } from '../lib/skills';
import type { Player } from '../lib/wikisync';
import { Chain, Gaps, RewardList, StatusBadge } from './common';

export function DiariesView({ advice, player }: { advice: Advice; player: Player }) {
  const [selected, setSelected] = useState<DiaryAdvice | null>(advice.closestDiaries[0] ?? null);
  const byKey = new Map(advice.diaries.map((d) => [`${d.diary}|${d.tier}`, d]));

  return (
    <div className="stack">
      <section className="card">
        <h3>Achievement diaries</h3>
        <p className="muted small">Pick a tier to see what is missing and what it gives you.</p>
        <div className="diary-table-wrap">
          <table className="diary-table">
            <thead>
              <tr>
                <th>Diary</th>
                {TIERS.map((t) => <th key={t}>{t}</th>)}
              </tr>
            </thead>
            <tbody>
              {DIARY_NAMES.map((diary) => (
                <tr key={diary}>
                  <th scope="row">
                    <a href={diaryWikiUrl(diary)} target="_blank" rel="noreferrer">{diary}</a>
                  </th>
                  {TIERS.map((tier) => {
                    const d = byKey.get(`${diary}|${tier}`);
                    if (!d) return <td key={tier} />;
                    const isSel = selected?.diary === diary && selected?.tier === tier;
                    return (
                      <td key={tier}>
                        <button
                          className={`diary-cell status-${d.check.status}${isSel ? ' selected' : ''}`}
                          onClick={() => setSelected(d)}
                          aria-label={`${diary} ${tier}`}
                        >
                          {d.complete ? '✓' : d.tasksTotal ? `${d.tasksDone}/${d.tasksTotal}` : '–'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="legend small">
          <span className="dot status-done" /> Complete <span className="dot status-ready" /> Requirements met
          <span className="dot status-boost" /> Needs a boost <span className="dot status-blocked" /> Blocked
        </div>
      </section>

      {selected && <DiaryDetail d={selected} player={player} />}
    </div>
  );
}

function DiaryDetail({ d, player }: { d: DiaryAdvice; player: Player }) {
  return (
    <section className="card">
      <div className="row">
        <h3>{d.diary} {d.tier}</h3>
        <StatusBadge status={d.check.status} />
        {d.tasksTotal > 0 && <span className="muted small">{d.tasksDone}/{d.tasksTotal} tasks done</span>}
      </div>
      {!d.complete && d.check.status !== 'ready' && (
        <>
          <h4>Still needed</h4>
          <Gaps check={d.check} />
          {d.questsNeeded.length > 0 && (
            <>
              <p className="muted small">Quests to do, in order:</p>
              <Chain steps={d.questsNeeded} />
            </>
          )}
          {d.xpNeeded > 0 && <p className="muted small">Roughly {formatXp(d.xpNeeded)} XP of training.</p>}
        </>
      )}
      {!d.complete && d.check.status === 'ready' && (
        <p>You meet every skill and quest requirement. Go finish the remaining tasks!</p>
      )}
      {!d.complete && d.data.combatLevel ? (
        <p className="muted small">Recommended combat level: {d.data.combatLevel} (you are {combatLevel(player.levels)}).</p>
      ) : null}
      <h4>Rewards</h4>
      <RewardList rewards={d.data.rewards} />
      <p className="small">
        <a href={diaryWikiUrl(d.diary)} target="_blank" rel="noreferrer">Task list on the OSRS Wiki</a>
      </p>
    </section>
  );
}
