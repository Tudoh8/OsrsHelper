import { useState, type FormEvent } from 'react';
import { WIKISYNC_URL } from '../lib/wikisync';

interface Props {
  initialRsn: string;
  loading: boolean;
  error: string | null;
  compact: boolean;
  onLookup: (rsn: string) => void;
  onPaste: (json: string) => void;
  onSample: () => void;
}

export function LoadPanel({ initialRsn, loading, error, compact, onLookup, onPaste, onSample }: Props) {
  const [rsn, setRsn] = useState(initialRsn);
  const [showPaste, setShowPaste] = useState(false);
  const [text, setText] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (rsn.trim()) onLookup(rsn.trim());
  };

  const readFile = async (file: File | undefined) => {
    if (file) onPaste(await file.text());
  };

  return (
    <section className={`card load-panel${compact ? ' compact' : ''}`}>
      <form onSubmit={submit} className="lookup">
        <label htmlFor="rsn" className="sr-only">RuneScape name</label>
        <input
          id="rsn"
          value={rsn}
          onChange={(e) => setRsn(e.target.value)}
          placeholder="Your RuneScape name"
          maxLength={12}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" disabled={loading || !rsn.trim()}>
          {loading ? 'Loading…' : compact ? 'Refresh' : 'Look up'}
        </button>
        <button type="button" className="secondary" onClick={() => setShowPaste(!showPaste)}>
          Paste JSON
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {!compact && !showPaste && (
        <p className="muted small">
          Needs the <strong>WikiSync</strong> plugin in RuneLite. Log in once with it enabled and your quests, diaries
          and levels are synced to the OSRS Wiki. No data yet?{' '}
          <button className="link-button" onClick={onSample}>Try the sample account</button>.
        </p>
      )}

      {showPaste && (
        <div className="paste">
          <p className="muted small">
            Open{' '}
            <a href={WIKISYNC_URL(rsn || 'YOUR_NAME')} target="_blank" rel="noreferrer">
              {WIKISYNC_URL(rsn || 'YOUR_NAME')}
            </a>{' '}
            in your browser, copy everything and paste it here, or upload a saved .json file.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='{"username": "...", "quests": {...}, "levels": {...}, ...}'
            rows={6}
          />
          <div className="paste-actions">
            <button type="button" disabled={!text.trim()} onClick={() => onPaste(text)}>Use this data</button>
            <label className="file-button">
              Upload .json
              <input type="file" accept="application/json,.json" onChange={(e) => readFile(e.target.files?.[0])} />
            </label>
          </div>
        </div>
      )}
    </section>
  );
}
