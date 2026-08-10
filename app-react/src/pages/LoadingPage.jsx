import { C } from '../lib/theme';

/* Los primeros milisegundos, cuando Firebase todavía no dijo si hay sesión. Sin esta
   pantalla se vería el login por un instante y después la app: el clásico parpadeo. */
export function LoadingPage() {
  return (
    <div className="view auth" style={{ '--accent': C.amber }}>
      <div className="emptybig">
        <div className="authmark big" style={{ background: `linear-gradient(140deg,${C.amber},${C.coral})` }}>D</div>
        <div className="ex">Abriendo tu Daily…</div>
      </div>
    </div>
  );
}
