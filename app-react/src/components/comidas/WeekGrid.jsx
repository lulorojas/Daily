import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { dayMealSummary, optionLabel } from '../../lib/meals';
import { DOW_SHORT, MONTHS, addDays, iso, mondayOf, parseISO, todayISO } from '../../lib/dates';
import { C } from '../../lib/theme';

/* ----------------------------- TU SEMANA -----------------------------
   La semana del día que se está mirando como una grilla: un renglón por día, una celda por
   comida, pintada con el color del estado. De un vistazo se ve en qué comida de qué día se
   pifió o falta algo. Tocar una celda de un día de hoy hacia atrás abre el registro de ESA
   comida de ESE día (se puede completar o corregir cualquier día pasado); los días que
   todavía no llegaron se ven, pero no se tocan. Arriba a la derecha, el % de la semana
   (el promedio del % del plan de los días que ya pasaron).

   Cada día sale de dayMealSummary() — la misma cuenta que la órbita y que "Cómo comés". */
const DEL_PLAN = { cumplida: C.green, parcial: C.amber, poco: C.danger, permitido: C.coral, sana: C.teal, pendiente: '#75798c' };
const LEYENDA = [
  ['Cumplida', C.green], ['Parcial', C.amber], ['Poco', C.danger], ['Distinta, sana', C.teal], ['Permitido', C.coral],
];

// Qué decir en la celda: lo que se comió (la opción o lo de fuera del plan) o el estado.
function textoDeCelda(f) {
  if (f.registros[0]) return optionLabel(f.registros[0].option);
  if (f.libres[0]) return f.libres[0].que;
  return f.status.label;
}

export function WeekGrid({ data, day, slots, onSemana, onOpen }) {
  const hoy = todayISO();
  const lunes = mondayOf(parseISO(day));
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = iso(addDays(lunes, i));
    return { dISO: d, i, futuro: d > hoy, resumen: slots.length ? dayMealSummary(data, d) : null };
  });

  const conPct = dias.filter((d) => !d.futuro && d.resumen && d.resumen.pct !== null);
  const semana = conPct.length ? conPct.reduce((a, d) => a + d.resumen.pct, 0) / conPct.length : 0;
  const C2 = 2 * Math.PI * 18;
  const domingo = addDays(lunes, 6);
  const rango = `${lunes.getDate()} – ${domingo.getDate()} ${MONTHS[domingo.getMonth()].slice(0, 3).toUpperCase()}`;

  return (
    <div className="card weekgrid">
      <div className="weekgrid-head">
        <h2 className="listcard-title">Tu semana</h2>
        <button type="button" className="weeknav-btn" aria-label="Semana anterior de comidas" onClick={() => onSemana(-1)}><CaretLeft size={14} aria-hidden="true" /></button>
        <span className="weekgrid-range">{rango}</span>
        <button type="button" className="weeknav-btn" aria-label="Semana siguiente de comidas" onClick={() => onSemana(1)}><CaretRight size={14} aria-hidden="true" /></button>
        <div className="weekgrid-ring" title="% del plan de la semana">
          <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
            <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(233,233,237,.08)" strokeWidth="3.5" />
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--violet)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(semana * C2).toFixed(1)} ${C2.toFixed(1)}`} className="weekgrid-fill" />
          </svg>
          <div className="weekgrid-pct">{Math.round(semana * 100)}%</div>
        </div>
      </div>

      <div className="weekgrid-cols">
        <span />
        {slots.map((s) => <span key={s.id} className="weekgrid-colhead">{s.name.slice(0, 3).toUpperCase()}</span>)}
      </div>

      <div className="weekgrid-rows">
        {dias.map((d) => {
          const sel = d.dISO === day;
          const esHoy = d.dISO === hoy;
          return (
            <div
              key={d.dISO}
              className={`weekgrid-row${sel ? ' sel' : ''}`}
              style={{ gridTemplateColumns: `44px repeat(${Math.max(slots.length, 1)}, minmax(0, 1fr))` }}
            >
              <div className="weekgrid-day">
                <span className="weekgrid-dow" style={{ color: sel || esHoy ? 'var(--violet)' : d.futuro ? 'var(--color-neutral-600)' : undefined }}>{esHoy ? 'HOY' : DOW_SHORT[d.i].toUpperCase()}</span>
                <span className="weekgrid-n" style={{ color: d.futuro ? 'var(--color-neutral-600)' : undefined }}>{parseISO(d.dISO).getDate()}</span>
              </div>
              {d.resumen && d.resumen.franjas.map((f) => {
                const pend = f.status.key === 'pendiente';
                const col = DEL_PLAN[f.status.key];
                if (d.futuro) return <div key={f.slot.id} className="weekgrid-cell futuro" />;
                return (
                  <button
                    type="button"
                    key={f.slot.id}
                    className={`weekgrid-cell${pend ? ' pend' : ''}`}
                    title={f.status.label}
                    aria-label={`${DOW_SHORT[d.i]} ${parseISO(d.dISO).getDate()}, ${f.slot.name}: ${f.status.label}`}
                    style={pend ? undefined : { background: `${col}1c`, borderColor: `${col}55`, boxShadow: `inset 0 0 14px ${col}22` }}
                    onClick={() => onOpen(d.dISO, f.slot)}
                  >
                    <span className="weekgrid-dot" style={{ background: pend ? 'transparent' : col, boxShadow: pend ? 'none' : `0 0 6px ${col}` }} />
                    <span className="weekgrid-txt">{pend ? '+ Registrar' : textoDeCelda(f)}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="weekgrid-legend">
        {LEYENDA.map(([l, c]) => <span key={l}><span style={{ background: c }} />{l}</span>)}
      </div>
    </div>
  );
}
