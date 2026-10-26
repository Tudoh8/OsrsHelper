import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildAdvice } from './lib/advice';
import type { Tier } from './lib/data';
import type { Player, Progress, QuestState, Stats } from './lib/player';
import {
  BASELINE, BASELINE_DATE, clearSavedProgress, loadProgress, parseProgress, saveProgress,
  withDiaryDone, withQuestState,
} from './lib/progress';
import { fetchStats, LookupError } from './lib/wiseoldman';
import { LoadPanel } from './components/LoadPanel';
import { Summary } from './components/Summary';
import { NextSteps } from './components/NextSteps';
import { QuestsView } from './components/QuestsView';
import { MilestonesView } from './components/MilestonesView';
import { DiariesView } from './components/DiariesView';
import { SkillsView } from './components/SkillsView';

export type Tab = 'next' | 'quests' | 'unlocks' | 'diaries' | 'skills';

const TABS: { id: Tab; label: string }[] = [
  { id: 'next', label: 'What next' },
  { id: 'quests', label: 'Quests' },
  { id: 'unlocks', label: 'Key unlocks' },
  { id: 'diaries', label: 'Diaries' },
  { id: 'skills', label: 'Skills' },
];

const STATS_KEY = 'osrs-helper:stats';

function loadStats(): Stats | null {
  try {
    const s = localStorage.getItem(STATS_KEY);
    return s ? (JSON.parse(s) as Stats) : null;
  } catch {
    return null;
  }
}

function saveStats(s: Stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    // The page still works; levels are fetched again next visit.
  }
}

function setUrlRsn(rsn: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('rsn', rsn);
  window.history.replaceState(null, '', url);
}

export function App() {
  const urlRsn = new URLSearchParams(window.location.search).get('rsn');
  const cached = useMemo(loadStats, []);
  const [stats, setStats] = useState<Stats | null>(() =>
    cached && (!urlRsn || urlRsn.toLowerCase() === cached.username.toLowerCase()) ? cached : null);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('next');

  const lookup = useCallback(async (rsn: string) => {
    setLoading(true);
    setError(null);
    try {
      const s = await fetchStats(rsn);
      setStats(s);
      saveStats(s);
      setUrlRsn(s.username);
    } catch (e) {
      setError(e instanceof LookupError ? e.message : 'Something went wrong looking that name up.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh levels on every visit when a name is known.
  useEffect(() => {
    const rsn = urlRsn ?? cached?.username;
    if (rsn) lookup(rsn);
  }, []);

  const updateProgress = useCallback((next: (p: Progress) => Progress) => {
    setProgress((p) => {
      const n = next(p);
      saveProgress(n);
      return n;
    });
  }, []);

  const setQuest = useCallback(
    (name: string, state: QuestState) => updateProgress((p) => withQuestState(p, name, state)),
    [updateProgress],
  );
  const setDiary = useCallback(
    (diary: string, tier: Tier, done: number) => updateProgress((p) => withDiaryDone(p, diary, tier, done)),
    [updateProgress],
  );

  const player: Player | null = useMemo(() => (stats ? { ...stats, ...progress } : null), [stats, progress]);
  const advice = useMemo(() => (player ? buildAdvice(player) : null), [player]);

  const goTo = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app">
      <header className="site-header">
        <h1>OSRS Ironman Helper</h1>
        <p className="muted">Your stats, and what to train or quest next.</p>
      </header>

      <LoadPanel
        initialRsn={urlRsn ?? cached?.username ?? ''}
        loading={loading}
        error={error}
        compact={!!player}
        onLookup={lookup}
      />

      {player && advice && (
        <>
          <Summary player={player} diariesDone={advice.diariesDone} />

          <nav className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? 'active' : ''}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {tab === 'next' && <NextSteps advice={advice} goTo={goTo} onSetQuest={setQuest} />}
          {tab === 'quests' && <QuestsView advice={advice} onSetQuest={setQuest} />}
          {tab === 'unlocks' && <MilestonesView advice={advice} />}
          {tab === 'diaries' && <DiariesView advice={advice} player={player} onSetDiary={setDiary} />}
          {tab === 'skills' && <SkillsView advice={advice} />}

          <ProgressTools progress={progress} onReplace={(p) => updateProgress(() => p)} />
        </>
      )}

      <footer className="site-footer muted small">
        Levels from the official Hiscores via <a href="https://wiseoldman.net">Wise Old Man</a>. Quest and diary
        requirements from the <a href="https://github.com/Zoinkwiz/quest-helper">Quest Helper</a> plugin. Quest order from
        the OSRS Wiki&apos;s <a href="https://oldschool.runescape.wiki/w/Optimal_quest_guide/Ironman">ironman optimal quest guide</a>.
        Not affiliated with Jagex.
      </footer>
    </div>
  );
}

/** Backup, restore and reset for the quest and diary progress kept in this browser. */
function ProgressTools({ progress, onReplace }: { progress: Progress; onReplace: (p: Progress) => void }) {
  const [message, setMessage] = useState<string | null>(null);

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(progress, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'osrs-progress.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      onReplace(parseProgress(JSON.parse(await file.text())));
      setMessage('Progress restored from the backup.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not read that file.');
    }
  };

  const reset = () => {
    if (!window.confirm(`Throw away your changes and go back to the progress from ${BASELINE_DATE}?`)) return;
    clearSavedProgress();
    onReplace(BASELINE);
    setMessage(`Back to the progress from ${BASELINE_DATE}.`);
  };

  return (
    <details className="card progress-tools">
      <summary>Quest and diary progress</summary>
      <p className="muted small">
        Your progress is saved in this browser only, starting from your screenshots of {BASELINE_DATE}. Download a
        backup to keep it safe or to move it to another device.
      </p>
      <div className="row">
        <button className="secondary" onClick={exportFile}>Download backup</button>
        <label className="file-button">
          Restore backup
          <input type="file" accept="application/json,.json" onChange={(e) => importFile(e.target.files?.[0])} />
        </label>
        <button className="link-button" onClick={reset}>Reset to {BASELINE_DATE}</button>
      </div>
      {message && <p className="small">{message}</p>}
    </details>
  );
}
