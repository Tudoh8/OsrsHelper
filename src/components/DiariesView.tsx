import { useState } from 'react';
import { type Advice, type DiaryAdvice } from '../lib/advice';
import { DIARY_NAMES, TIERS, diaryWikiUrl } from '../lib/data';
import { combatLevel, formatXp } from '../lib/skills';
import type { Player } from '../lib/player';
import type { Tier } from '../lib/data';
import { Chain, Gaps, RewardList, StatusBadge } from './common';

type SetDiary = (diary: string, tier: Tier, done: number) => void;

export function DiariesView({ advice, player, onSetDiary }: { advice: Advice; player: Player; onSetDiary: SetDiary }) {
  const byKey = new Map(advice.diaries.map((d) => [`${d.diary}|${d.tier}`, d]));
  const first = advice.closestDiaries[0];
  const [selectedKey, setSelectedKey] = useState(first ? `${first.diary}|${first.tier}` : null);
  // Look the tier up again on every render so edits show straight away.
  const selected = selectedKey ? byKey.get(selectedKey) : undefined;

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
                          onClick={() => setSelectedKey(`${diary}|${tier}`)}
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

      {selected && <DiaryDetail d={selected} player={player} onSetDiary={onSetDiary} />}
    </div>
  );
}

function DiaryDetail({ d, player, onSetDiary }: { d: DiaryAdvice; player: Player; onSetDiary: SetDiary }) {
  return (
    <section className="card">
      <div className="row">
        <h3>{d.diary} {d.tier}</h3>
        <StatusBadge status={d.check.status} />
      </div>
      {d.tasksTotal > 0 && (
        <div className="row stepper">
          <span>Tasks done:</span>
          <button className="secondary" aria-label="One task fewer" disabled={d.tasksDone <= 0} onClick={() => onSetDiary(d.diary, d.tier, d.tasksDone - 1)}>−</button>
          <strong>{d.tasksDone} / {d.tasksTotal}</strong>
          <button className="secondary" aria-label="One task more" disabled={d.tasksDone >= d.tasksTotal} onClick={() => onSetDiary(d.diary, d.tier, d.tasksDone + 1)}>+</button>
          {!d.complete && (
            <button className="link-button" onClick={() => onSetDiary(d.diary, d.tier, d.tasksTotal)}>Mark complete</button>
          )}
        </div>
      )}
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
