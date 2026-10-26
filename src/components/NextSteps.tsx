import type { Advice, MilestoneProgress } from '../lib/advice';
import { formatXp } from '../lib/skills';
import { Gaps, QuestLink, SkillIcon, StatusBadge } from './common';
import type { Tab } from '../App';
import type { QuestState } from '../lib/player';

const STAGE_RANK = { early: 0, mid: 1, late: 2 };

export function rankMilestones(ms: MilestoneProgress[]) {
  return ms
    .filter((m) => !m.done)
    .sort((a, b) =>
      STAGE_RANK[a.milestone.stage] - STAGE_RANK[b.milestone.stage] ||
      Number(!a.nextStep) - Number(!b.nextStep) ||
      a.remaining - b.remaining);
}

function shortReward(a: Advice['ready'][number]): string | null {
  const r = a.quest.rewards;
  if (r?.unlocks?.length) return r.unlocks[0];
  if (r?.xp?.length) return r.xp.map((x) => `${formatXp(x.xp)} ${x.skill}`).join(', ') + ' XP';
  return null;
}

export function NextSteps({ advice, goTo, onSetQuest }: { advice: Advice; goTo: (t: Tab) => void; onSetQuest: (name: string, state: QuestState) => void }) {
  const ready = advice.ready.slice(0, 6);
  const next = advice.next;
  const milestones = rankMilestones(advice.milestones).slice(0, 4);
  const training = advice.training.slice(0, 5);
  const diaries = advice.closestDiaries.slice(0, 4);

  return (
    <div className="next-grid">
      <section className="card">
        <h3>Quests you can do now</h3>
        {next && next.check.status === 'blocked' && (
          <div className="callout">
            The guide&apos;s next quest is <QuestLink name={next.quest.name} />, but you still need:
            <Gaps check={next.check} />
          </div>
        )}
        {ready.length ? (
          <ol className="plain-list">
            {ready.map((a) => (
              <li key={a.quest.name}>
                <div className="row">
                  <QuestLink name={a.quest.name} />
                  {a.inProgress && <StatusBadge status={a.check.status} inProgress />}
                  {a.check.status === 'boost' && <StatusBadge status="boost" />}
                  {a.quest.questPoints > 0 && <span className="muted small">{a.quest.questPoints} QP</span>}
                  <button className="link-button small push-right" onClick={() => onSetQuest(a.quest.name, 2)}>Mark done</button>
                </div>
                {shortReward(a) && <div className="muted small">{shortReward(a)}</div>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">Nothing is fully unlocked right now. Check the training suggestions.</p>
        )}
        <button className="link-button" onClick={() => goTo('quests')}>Full quest path →</button>
      </section>

      <section className="card">
        <h3>Train next</h3>
        {training.length ? (
          <ul className="plain-list">
            {training.map((t) => (
              <li key={t.skill}>
                <div className="row">
                  <SkillIcon skill={t.skill} />
                  <strong>{t.skill}</strong> {t.from} → {t.to}
                  <span className="muted small">{formatXp(t.xp)} XP</span>
                </div>
                <div className="small">
                  {t.unlocks.length > 0 && <>Unlocks {t.unlocks.map((u) => u.label).join(', ')}</>}
                  {t.unlocks.length > 0 && t.helps.length > 0 && '. '}
                  {t.helps.length > 0 && (
                    <span className="muted">Closer to {t.helps.map((u) => u.label).join(', ')}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No skill is the only thing holding back a quest or diary. Nice.</p>
        )}
        <button className="link-button" onClick={() => goTo('skills')}>All skill goals →</button>
      </section>

      <section className="card">
        <h3>Key unlocks within reach</h3>
        <ul className="plain-list">
          {milestones.map((m) => (
            <li key={m.milestone.id}>
              <div className="row">
                <strong>{m.milestone.title}</strong>
                <span className="muted small">
                  {m.remaining} quest{m.remaining === 1 ? '' : 's'} left
                </span>
              </div>
              <div className="small">
                {m.nextStep ? (
                  <>Next: <QuestLink name={m.nextStep.quest.name} />{m.nextStep.startOnly && ' (start it)'}</>
                ) : m.skillGaps.length ? (
                  <>Needs {m.skillGaps.map((g) => `${g.level} ${g.skill}`).join(', ')}</>
                ) : (
                  <span className="muted">Blocked further down the chain</span>
                )}
              </div>
            </li>
          ))}
        </ul>
        <button className="link-button" onClick={() => goTo('unlocks')}>All unlocks →</button>
      </section>

      <section className="card">
        <h3>Closest diaries</h3>
        <ul className="plain-list">
          {diaries.map((d) => (
            <li key={`${d.diary}-${d.tier}`}>
              <div className="row">
                <strong>{d.diary} {d.tier}</strong>
                <StatusBadge status={d.check.status} />
                {d.tasksTotal > 0 && <span className="muted small">{d.tasksDone}/{d.tasksTotal} tasks</span>}
              </div>
              <Gaps check={d.check} />
            </li>
          ))}
        </ul>
        <button className="link-button" onClick={() => goTo('diaries')}>All diaries →</button>
      </section>
    </div>
  );
}
