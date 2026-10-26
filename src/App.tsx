import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildAdvice } from './lib/advice';
import { fetchPlayer, parsePlayer, WikiSyncError, type Player } from './lib/wikisync';
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

type Source = 'wikisync' | 'paste' | 'sample';
const SOURCE_LABEL: Record<Source, string> = {
  wikisync: 'Live from WikiSync',
  paste: 'From pasted JSON',
  sample: 'Sample account',
};

const STORE_KEY = 'osrs-helper:last';

interface Stored {
  rsn: string;
  source: Source;
  raw: unknown;
}

function load(): Stored | null {
  try {
    const s = localStorage.getItem(STORE_KEY);
    return s ? (JSON.parse(s) as Stored) : null;
  } catch {
    return null;
  }
}

function save(s: Stored) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    // Storage full or blocked; the page still works without it.
  }
}

function errorMessage(e: unknown, rsn: string): string {
  if (e instanceof WikiSyncError) {
    if (e.kind === 'no-data') {
      return `WikiSync has no data for "${rsn}". Install the WikiSync plugin from the RuneLite Plugin Hub, log in to the game once, then try again.`;
    }
    if (e.kind === 'network') return `${e.message} Try again in a moment, or use "Paste JSON".`;
    return e.message;
  }
  return 'Something went wrong reading that data.';
}

function setUrlRsn(rsn: string | null) {
  const url = new URL(window.location.href);
  if (rsn) url.searchParams.set('rsn', rsn);
  else url.searchParams.delete('rsn');
  window.history.replaceState(null, '', url);
}

export function App() {
  const urlRsn = new URLSearchParams(window.location.search).get('rsn');
  const stored = useMemo(load, []);
  const [player, setPlayer] = useState<Player | null>(() => {
    if (!stored || (urlRsn && urlRsn.toLowerCase() !== stored.rsn.toLowerCase())) return null;
    try {
      return parsePlayer(stored.raw, stored.rsn);
    } catch {
      return null;
    }
  });
  const [source, setSource] = useState<Source>(stored?.source ?? 'wikisync');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('next');

  const lookup = useCallback(async (rsn: string) => {
    setLoading(true);
    setError(null);
    try {
      const p = await fetchPlayer(rsn);
      setPlayer(p);
      setSource('wikisync');
      save({ rsn, source: 'wikisync', raw: { ...p, achievement_diaries: p.diaries } });
      setUrlRsn(rsn);
    } catch (e) {
      setError(errorMessage(e, rsn));
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePaste = useCallback((text: string) => {
    setError(null);
    try {
      const raw = JSON.parse(text);
      const p = parsePlayer(raw);
      setPlayer(p);
      setSource('paste');
      save({ rsn: p.username, source: 'paste', raw });
      setUrlRsn(null);
    } catch (e) {
      setError(e instanceof SyntaxError ? 'That text is not valid JSON.' : errorMessage(e, ''));
    }
  }, []);

  const handleSample = useCallback(async () => {
    setError(null);
    try {
      const raw = await (await fetch(`${import.meta.env.BASE_URL}sample-player.json`)).json();
      setPlayer(parsePlayer(raw));
      setSource('sample');
      setUrlRsn(null);
    } catch {
      setError('Could not load the sample account.');
    }
  }, []);

  // Refresh from WikiSync on load when a name is known, so the page shows current data.
  useEffect(() => {
    const rsn = urlRsn ?? (stored?.source === 'wikisync' ? stored.rsn : null);
    if (rsn) lookup(rsn);
  }, []);

  const advice = useMemo(() => (player ? buildAdvice(player) : null), [player]);

  const goTo = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app">
      <header className="site-header">
        <h1>OSRS Ironman Helper</h1>
        <p className="muted">Your stats from WikiSync, and what to train or quest next.</p>
      </header>

      <LoadPanel
        initialRsn={urlRsn ?? stored?.rsn ?? ''}
        loading={loading}
        error={error}
        compact={!!player}
        onLookup={lookup}
        onPaste={handlePaste}
        onSample={handleSample}
      />

      {player && advice && (
        <>
          <Summary player={player} diariesDone={advice.diariesDone} sourceLabel={SOURCE_LABEL[source]} />

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

          {tab === 'next' && <NextSteps advice={advice} goTo={goTo} />}
          {tab === 'quests' && <QuestsView advice={advice} />}
          {tab === 'unlocks' && <MilestonesView advice={advice} />}
          {tab === 'diaries' && <DiariesView advice={advice} player={player} />}
          {tab === 'skills' && <SkillsView advice={advice} />}
        </>
      )}

      <footer className="site-footer muted small">
        Player data from <a href="https://oldschool.runescape.wiki/w/RuneScape:WikiSync">WikiSync</a>. Quest and diary
        requirements from the <a href="https://github.com/Zoinkwiz/quest-helper">Quest Helper</a> plugin. Quest order from
        the OSRS Wiki&apos;s <a href="https://oldschool.runescape.wiki/w/Optimal_quest_guide/Ironman">ironman optimal quest guide</a>.
        Not affiliated with Jagex.
      </footer>
    </div>
  );
}
