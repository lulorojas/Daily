import { TrendUp } from '@phosphor-icons/react';
import { LiftChart } from '../ui/LiftChart';

/* ----------------------------- PROGRESO DE CARGA -----------------------------
   Rediseño Nocturne: el gráfico de cada ejercicio (LiftChart) con una fila de botones para
   elegir cuál ver, en el mismo período que el resto de Progreso. Reemplaza al "mejor
   progreso + tres más": ahora se ve la evolución completa, punto por punto, no solo el
   saldo. Dos estados vacíos distintos a propósito: "no tenés ejercicios" no es lo mismo que
   "no hay con qué comparar" — este último lo dice el propio gráfico (necesita dos marcas
   en el rango). */
export function ProgCargas({ data, per, className = '' }) {
  const lifts = data.gym.lifts;

  return (
    <section className={`card progcard cargas ${className}`}>
      <div className="listcard-head">
        <TrendUp size={16} color="var(--rose)" aria-hidden="true" />
        <h2 className="listcard-title">Progreso de carga</h2>
      </div>
      <p className="progcard-hint">Cada punto es una marca cargada. Elegí el ejercicio.</p>
      {lifts.length === 0
        ? <div className="empty">Agregá ejercicios en Gimnasio para seguir tus cargas.</div>
        : <LiftChart lifts={lifts} period={per} chips selected={lifts[0].id} />}
    </section>
  );
}
