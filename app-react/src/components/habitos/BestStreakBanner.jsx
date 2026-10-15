import { FlameIcon } from '../ui/Icons';
import { habitDone } from '../../lib/habits';
import { addDays, iso, todayD } from '../../lib/dates';
import { C } from '../../lib/theme';

/* ----------------------------- MEJOR RACHA -----------------------------
   Port del bloque que arma viewHabitos() cuando `best>0`. Destaca la racha más larga
   entre TODOS los hábitos, no la de uno en particular — por eso vive suelto en la
   pantalla y no adentro de HabitRow. Sin ninguna racha activa, no se dibuja nada (esto lo
   decide quien llama, mirando `best`).

   Rediseño Nocturne: abajo del número va una barra de 28 casilleros — los últimos 28 días
   de ESE hábito, el de la mejor racha, con los días marcados encendidos y el porcentaje al
   costado. Son 28 <span> iguales y no un gráfico: cada uno solo cambia de color según si
   el hábito se marcó ese día (habitDone), así que no hace falta ninguna librería. */
export function BestStreakBanner({ best, name, data, habitId }) {
  const hoy = todayD();
  const dias = Array.from({ length: 28 }, (_, i) => habitDone(data, habitId, iso(addDays(hoy, i - 27))));
  const hechos = dias.filter(Boolean).length;

  return (
    <div className="beststreak sweep">
      <div className="beststreak-top">
        <div className="beststreak-icon"><FlameIcon color={C.green} size={30} /></div>
        <div className="grow">
          <div className="beststreak-label">Mejor racha</div>
          <div className="beststreak-row">
            <span className="fr beststreak-n">{best}</span>
            <span className="beststreak-sub">días · {name}</span>
          </div>
        </div>
      </div>
      <div className="beststreak-month">
        <div className="beststreak-monthhead"><span>Últimos 28 días</span><span>{Math.round((hechos / 28) * 100)}%</span></div>
        <div className="beststreak-bars">
          {dias.map((on, i) => <span key={i} className={on ? 'on' : ''} />)}
        </div>
      </div>
    </div>
  );
}
