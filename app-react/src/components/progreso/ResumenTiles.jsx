import { DumbbellIcon, TaskIcon, HabitGlyphIcon } from '../ui/Icons';
import { C, tint } from '../../lib/theme';

/* ----------------------------- RESUMEN: TRES FICHAS -----------------------------
   Port de progResumen(). Entrenamientos del período, tareas completadas EN TODA LA
   HISTORIA (a propósito: vanilla no filtra `tareas` por período, solo entrenos —
   replicado tal cual) y hábitos de hoy. */
export function ResumenTiles({ entrenos, tareas, hoyOk, hoyTot }) {
  return (
    <div className="tiles">
      <Tile icon={<DumbbellIcon size={15} />} value={entrenos} label="Entrenamientos" color={C.rose} />
      <Tile icon={<TaskIcon size={15} />} value={tareas} label="Tareas hechas" color={C.amber} />
      <Tile icon={<HabitGlyphIcon />} value={hoyTot ? `${hoyOk}/${hoyTot}` : '—'} label="Hábitos hoy" color={C.green} />
    </div>
  );
}

function Tile({ icon, value, label, color }) {
  return (
    <div className="tile">
      <div className="tile-ic" style={{ background: tint(color, '24'), color }}>{icon}</div>
      <span className="v">{value}</span>
      <span className="l">{label}</span>
    </div>
  );
}
