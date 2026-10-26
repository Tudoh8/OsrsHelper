import type { Advice } from '../lib/advice';
import { formatXp, xpBetween } from '../lib/skills';
import { SkillIcon } from './common';

export function SkillsView({ advice }: { advice: Advice }) {
  return (
    <div className="stack">
      <section className="card">
        <h3>Best levels to train for unlocks</h3>
        <p className="muted small">
          Ranked by what each level opens up (quests whose other requirements you already meet, and diary tiers),
          weighed against the XP it costs. Key-unlock quests count extra.
        </p>
        {advice.training.length ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Skill</th>
                <th>Goal</th>
                <th>XP</th>
                <th>Unlocks</th>
              </tr>
            </thead>
            <tbody>
              {advice.training.map((t) => (
                <tr key={t.skill}>
                  <td className="nowrap"><SkillIcon skill={t.skill} /> {t.skill}</td>
                  <td className="nowrap">{t.from} → {t.to}</td>
                  <td>{formatXp(t.xp)}</td>
                  <td className="small">
                    {t.unlocks.map((u) => u.label).join(', ')}
                    {t.helps.length > 0 && (
                      <span className="muted">
                        {t.unlocks.length ? '; closer to ' : 'Closer to '}
                        {t.helps.map((u) => u.label).join(', ')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">Nothing is held back only by skill levels right now.</p>
        )}
      </section>

      <div className="two-col">
        <section className="card">
          <h3>Combat</h3>
          <p>
            Combat level <strong>{advice.combat.current}</strong>.
            {advice.combat.options.length > 0 && (
              <> Quickest next level: {advice.combat.options.slice(0, 3).map((o) => `+${o.levels} ${o.skill}`).join(' or ')}.</>
            )}
          </p>
        </section>

        <section className="card">
          <h3>Closest to 99</h3>
          {advice.to99.length ? (
            <ul className="plain-list">
              {advice.to99.map((s) => (
                <li key={s.skill} className="row">
                  <SkillIcon skill={s.skill} /> {s.skill} {s.level} <span className="muted small">{formatXp(s.xp)} XP left</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No skills at 70+ yet.</p>
          )}
        </section>
      </div>

      {advice.lagging.length > 0 && (
        <section className="card">
          <h3>Lagging skills</h3>
          <p className="muted small">At least 15 levels below your median skill ({advice.lagging[0].median}).</p>
          <div className="target-grid">
            {advice.lagging.map((s) => (
              <div key={s.skill} className="target">
                <SkillIcon skill={s.skill} /> <span><strong>{s.skill}</strong> {s.level}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h3>Levels needed for every diary</h3>
        {advice.allDiaries.length ? (
          <div className="target-grid">
            {advice.allDiaries.map((t) => (
              <div key={t.skill} className="target">
                <SkillIcon skill={t.skill} />
                <span><strong>{t.skill}</strong> {t.have} → {t.level}</span>
                <span className="muted small">{t.source} · {formatXp(xpBetween(t.have, t.level))} XP</span>
              </div>
            ))}
          </div>
        ) : (
          <p>You meet every diary skill requirement.</p>
        )}
      </section>
    </div>
  );
}
