import { useState, type FormEvent } from 'react';

interface Props {
  initialRsn: string;
  loading: boolean;
  error: string | null;
  compact: boolean;
  onLookup: (rsn: string) => void;
}

export function LoadPanel({ initialRsn, loading, error, compact, onLookup }: Props) {
  const [rsn, setRsn] = useState(initialRsn);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (rsn.trim()) onLookup(rsn.trim());
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
          {loading ? 'Loading…' : compact ? 'Update levels' : 'Look up'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {!compact && (
        <p className="muted small">
          Levels come from the official Hiscores through Wise Old Man. Quests and diaries are tracked on this site:
          mark them done as you go.
        </p>
      )}
    </section>
  );
}
