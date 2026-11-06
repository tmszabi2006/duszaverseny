import type { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  totalGold: number;
  onRefresh: () => void;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '–';
  return new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium' }).format(date);
}

function medal(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return String(rank);
}

export function Leaderboard({ entries, loading, error, totalGold, onRefresh }: LeaderboardProps) {
  return (
    <section className="panel leaderboard-panel" aria-labelledby="leaderboard-title">
      <div className="panel-header">
        <div>
          <h2 id="leaderboard-title">Ranglista</h2>
          <p className="panel-subtitle">Minden játékos legjobb futása ezen a térképen.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-small" onClick={onRefresh} disabled={loading}>
          {loading ? 'Frissítés…' : 'Frissítés'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!error && entries.length === 0 && !loading && (
        <div className="empty-state compact">
          <p>Még senki nem futott ezen a térképen.</p>
          <p className="muted">Legyél te az első, aki aranyat hoz fel a felszínre!</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="table-wrap">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th scope="col">Hely</th>
                <th scope="col">Játékos</th>
                <th scope="col" className="num">
                  Arany
                </th>
                <th scope="col" className="num">
                  Lépés
                </th>
                <th scope="col" className="hide-small">
                  Dátum
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.userId} className={entry.isCurrentUser ? 'is-current-user' : ''}>
                  <td className="rank-cell">{medal(entry.rank)}</td>
                  <td>
                    <span className="leaderboard-name">{entry.username}</span>
                    {entry.isCurrentUser && <span className="you-badge">te</span>}
                  </td>
                  <td className="num gold-text">
                    {entry.gold}
                    <span className="muted"> / {totalGold}</span>
                  </td>
                  <td className="num">{entry.steps}</td>
                  <td className="hide-small muted">{formatDate(entry.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
