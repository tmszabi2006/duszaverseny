import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="page">
      <div className="empty-state">
        <span className="empty-icon" aria-hidden="true">
          🕳
        </span>
        <h1>Ez a járat nem létezik</h1>
        <p>Az oldal, amit keresel, vagy soha nem is volt, vagy már beomlott.</p>
        <Link to="/" className="btn btn-primary">
          Vissza a bányaközpontba
        </Link>
      </div>
    </div>
  );
}
