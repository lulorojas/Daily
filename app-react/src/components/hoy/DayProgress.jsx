import { progressMessage } from '../../lib/items';

/* ----------------------------- BARRA DE PROGRESO DEL DÍA -----------------------------
   Port del bloque .progday de viewHoy(). La cuenta ya la hacía dayProgress() en lib/
   (etapa 2): tareas del día completadas + marcas de hábitos, sobre el total posible.

   Acá solo se dibuja. El único estilo inline es el ancho de la barra, que es literalmente
   el dato; el degradé ámbar→coral pasó a una clase porque nunca cambia. */
export function DayProgress({ progress }) {
  return (
    <div className="progday">
      <div className="r">
        <span className="t">Progreso del día</span>
        <span className="pc">{progress.pct}%</span>
      </div>
      <div className="track">
        <div className="fill" style={{ width: `${progress.pct}%` }} />
      </div>
      <span className="msg">{progressMessage(progress)}</span>
    </div>
  );
}
