import { FlameIcon } from '../ui/Icons';
import { C } from '../../lib/theme';

/* ----------------------------- MEJOR RACHA -----------------------------
   Port del bloque que arma viewHabitos() cuando `best>0`. Destaca la racha más larga
   entre TODOS los hábitos, no la de uno en particular — por eso vive suelto en la
   pantalla y no adentro de HabitRow. Sin ninguna racha activa, no se dibuja nada (esto lo
   decide quien llama, mirando `best`). */
export function BestStreakBanner({ best, name }) {
  return (
    <div className="beststreak">
      <div className="beststreak-icon"><FlameIcon color={C.green} size={28} /></div>
      <div className="grow">
        <div className="beststreak-label">Mejor racha</div>
        <div className="beststreak-row">
          <span className="fr beststreak-n">{best}</span>
          <span className="beststreak-sub">días · {name}</span>
        </div>
      </div>
    </div>
  );
}
