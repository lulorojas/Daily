import { useMemo, useState } from 'react';
import { LogoutButton } from '../components/auth/LogoutButton';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { dayProgress } from '../lib/progress';
import { gymHistory } from '../lib/gym';
import { todayISO } from '../lib/dates';
import { C } from '../lib/theme';

/* Placeholder de la app. Las cinco secciones llegan en la etapa 3; por ahora esta
   pantalla sirve para comprobar de punta a punta que los datos de Firestore llegan,
   se leen con los mismos helpers que usa la app vanilla y se ven.

   Los cálculos van dentro de useMemo: son funciones puras sobre el documento, así que
   solo hace falta rehacerlos cuando el documento cambia, no en cada render. */
export function HomePage() {
  const { user } = useAuth();
  const { data } = useData();
  const [error, setError] = useState(null);

  const resumen = useMemo(() => {
    const hoy = todayISO();
    return {
      items: data.items.length,
      habitos: data.habits.length,
      entrenos: gymHistory(data).length,
      ejercicios: data.gym.lifts.length,
      rutinas: data.gym.routines.length,
      pesos: data.gym.bodyWeights.length,
      dia: dayProgress(data, hoy),
    };
  }, [data]);

  const filas = [
    ['Ítems en la agenda', resumen.items],
    ['Hábitos', resumen.habitos],
    ['Entrenamientos marcados', resumen.entrenos],
    ['Ejercicios con carga', resumen.ejercicios],
    ['Rutinas guardadas', resumen.rutinas],
    ['Registros de peso', resumen.pesos],
  ];

  return (
    <div className="view auth" style={{ '--accent': C.amber }}>
      <div className="head">
        <div className="kicker">Daily · v4</div>
        <h1>Tus datos</h1>
        <div className="sub">Sesión iniciada como {user?.email}</div>
      </div>
      <div className="body">
        <div className="progday">
          <div className="r">
            <span className="t">Progreso del día</span>
            <span className="pc">{resumen.dia.pct}%</span>
          </div>
          <div className="track">
            <div className="fill" style={{ width: `${resumen.dia.pct}%`, background: `linear-gradient(90deg,${C.amber},${C.coral})` }} />
          </div>
          <span className="msg">{resumen.dia.done} de {resumen.dia.total} completados</span>
        </div>

        <div className="card" style={{ padding: '4px 6px' }}>
          {filas.map(([label, valor], i) => (
            <div key={label} className="managerow" style={i === filas.length - 1 ? { borderBottom: 'none' } : undefined}>
              <span style={{ flex: 1, fontSize: '14.5px', fontWeight: 500 }}>{label}</span>
              <span className="fr" style={{ fontWeight: 700, fontSize: '15.5px', color: C.amber }}>{valor}</span>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: '20px 18px' }}>
          <div className="empty">
            Las cinco secciones llegan en la etapa 3.<br />
            Estos números salen del mismo documento que usa la app actual.
          </div>
        </div>

        {error && <div className="auth-flash err" role="alert"><span>{error}</span></div>}
        <LogoutButton onError={setError} />
      </div>
    </div>
  );
}
