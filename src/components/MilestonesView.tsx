import { Fragment } from 'react';
import type { Advice, MilestoneProgress } from '../lib/advice';
import { Chain, ProgressBar, SkillIcon } from './common';

const STAGES = [
  { id: 'early', label: 'Early game' },
  { id: 'mid', label: 'Mid game' },
  { id: 'late', label: 'Late game' },
] as const;

export function MilestonesView({ advice }: { advice: Advice }) {
  return (
    <div className="stack">
      {STAGES.map((stage) => {
        const ms = advice.milestones.filter((m) => m.milestone.stage === stage.id);
        const done = ms.filter((m) => m.done).length;
        return (
          <section key={stage.id} className="card">
            <h3>
              {stage.label} <span className="muted small">{done}/{ms.length} unlocked</span>
            </h3>
            <div className="milestone-grid">
              {ms.map((m) => (
                <MilestoneCard key={m.milestone.id} m={m} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function MilestoneCard({ m }: { m: MilestoneProgress }) {
  const { milestone } = m;
  return (
    <div className={`milestone${m.done ? ' done' : ''}`}>
      <div className="row">
        <strong>{milestone.title}</strong>
        {m.done && <span className="badge badge-done">Unlocked</span>}
      </div>
      <p className="small">{milestone.why}</p>
      {!m.done && (
        <>
          <ProgressBar value={m.total - m.remaining} max={m.total} />
          <p className="muted small">
            {m.total - m.remaining} of {m.total} quests done
          </p>
          {m.skillGaps.length > 0 && (
            <p className="small">
              Levels needed:{' '}
              {m.skillGaps.map((g, i) => (
                <Fragment key={g.skill}>
                  {i > 0 && ', '}
                  <span className="nowrap">
                    <SkillIcon skill={g.skill} size={14} /> {g.level} {g.skill} <span className="muted">({g.have})</span>
                  </span>
                </Fragment>
              ))}
            </p>
          )}
          {m.chain.length > 0 && <Chain steps={m.chain} limit={5} />}
        </>
      )}
      {milestone.note && <p className="note small">{milestone.note}</p>}
    </div>
  );
}
