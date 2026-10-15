import { Flame } from '@phosphor-icons/react';
import { addDays, iso, mondayOf, parseISO, todayD } from '../../lib/dates';
import { gymHistory, gymTypeStreaks, typeColor } from '../../lib/gym';
import { tint } from '../../lib/theme';

/* ----------------------------- RACHAS DE ENTRENAMIENTO -----------------------------
   Port de progGymStreaks(), con el dibujo del rediseño Nocturne. Por TIPO, no por hábito:
   cuántas semanas seguidas se entrenó cada tipo. "Estado actual" porque no depende del
   selector de período — una racha es siempre sobre el presente.

   Cada tipo lleva ocho barritas, una por semana (la última es la actual): encendida si ese
   tipo se entrenó esa semana. Con ellas se ve la racha, no solo el número. */
const SEMANAS = 8;

export function ProgGymStreaks({ data, className = '' }) {
  const streaks = gymTypeStreaks(data);
  const hist = gymHistory(data);
  const curMon = mondayOf(todayD());
  const lunes = Array.from({ length: SEMANAS }, (_, i) => iso(addDays(curMon, (i - (SEMANAS - 1)) * 7)));

  return (
    <section className={`card progcard streaks ${className}`}>
      <div className="listcard-head">
        <Flame size={16} color="var(--amber)" aria-hidden="true" />
        <h2 className="listcard-title">Rachas de entrenamiento</h2>
        <span className="progcard-win">estado actual</span>
      </div>

      {streaks.length === 0 ? (
        <div className="empty">Repetí un tipo de entreno dos semanas seguidas para arrancar una racha.</div>
      ) : (
        <div className="streaks-list">
          {streaks.map((s) => {
            const col = typeColor(data, s.type);
            const enRacha = s.weeks >= 2;
            const semanasDelTipo = new Set(hist.filter((h) => h.type === s.type).map((h) => iso(mondayOf(parseISO(h.date)))));
            return (
              <div className="streaks-row" key={s.type}>
                <div className="grow">
                  <div className="streaks-top">
                    <span className="streaks-name">{s.type}</span>
                    <span className="streaks-sub">
                      {s.weeks} {s.weeks === 1 ? 'semana seguida' : 'semanas seguidas'}
                      {!enRacha && ' · una más y arranca la racha'}
                    </span>
                  </div>
                  <div className="streaks-weeks">
                    {lunes.map((l) => (
                      <span key={l} style={semanasDelTipo.has(l) ? { background: col, boxShadow: `0 0 6px ${tint(col, '88')}` } : undefined} />
                    ))}
                  </div>
                </div>
                {enRacha && (
                  <div className="streaks-n" style={{ color: col }}>
                    <Flame size={15} weight="fill" aria-hidden="true" style={{ filter: `drop-shadow(0 0 6px ${col})` }} />
                    <span>{s.weeks}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
