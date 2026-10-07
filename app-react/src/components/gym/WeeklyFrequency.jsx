import { parseISO } from '../../lib/dates';
import { ABS_TYPE, allTypes, gymHistory, gymWeekDoubleDays, gymWeekTypeCounts, typeColor, weekKey } from '../../lib/gym';

/* ----------------------------- FRECUENCIA SEMANAL -----------------------------
   Nueva en el rediseño "Glass + aurora" (handoff Glass Gimnasio v4.dc.html): barras
   apiladas por tipo, últimas 8 semanas (incluida la actual), con un punto arriba de la
   barra por cada día de doble turno real esa semana.

   Sin boceto de vanilla ni de ninguna etapa anterior que portar: se armó entera sobre
   gymHistory()/gymWeekTypeCounts()/gymWeekDoubleDays() (lib/gym.js), que ya hacían toda la
   cuenta pesada para Progreso — acá solo se recortan las últimas 8 semanas y se apilan los
   colores. Barras con CSS (flex-direction:column-reverse + un <div> por segmento) en vez
   de SVG: con solo 8 columnas no hace falta la escala en tiempo real que sí paga la pena en
   los gráficos de líneas (progreso de carga, peso corporal). */
export function WeeklyFrequency({ data }) {
  const hist = gymHistory(data);
  const byWeek = gymWeekTypeCounts(hist);
  const doublesByWeek = gymWeekDoubleDays(data);
  const tipos = allTypes(data).filter((t) => !t.rest).concat([{ name: ABS_TYPE, color: typeColor(data, ABS_TYPE) }]);

  const weeks = Array.from({ length: 8 }, (_, i) => weekKey(i - 7));
  const totals = weeks.map((w) => tipos.reduce((a, t) => a + (byWeek[w]?.[t.name] || 0), 0));
  const max = Math.max(1, ...totals);
  const totalPeriodo = totals.reduce((a, n) => a + n, 0);
  const diasDoblesPeriodo = weeks.reduce((a, w) => a + (doublesByWeek[w] || 0), 0);

  const legend = tipos
    .map((t) => ({ ...t, total: weeks.reduce((a, w) => a + (byWeek[w]?.[t.name] || 0), 0) }))
    .filter((t) => t.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div className="sect">
      <div className="sectrow-baseline">
        <span className="sectlabel">Frecuencia semanal</span>
        <span className="mono tile-k">ENTRENOS POR SEMANA</span>
      </div>

      <div className="bigcard">
        <div className="bigcard-top">
          <div className="bigcard-val">
            <span className="fr bigcard-num freq-num">{totalPeriodo}</span>
            <span className="bigcard-unit">entrenos</span>
          </div>
          <span className="deltapill freq-doubles">{diasDoblesPeriodo} {diasDoblesPeriodo === 1 ? 'día doble' : 'días dobles'}</span>
        </div>

        <div className="freqbars">
          {weeks.map((w, i) => {
            const segs = tipos.filter((t) => byWeek[w]?.[t.name]);
            const dobles = doublesByWeek[w] || 0;
            const mon = parseISO(w);
            return (
              <div className="freqcol" key={w}>
                <div className="freqdots">
                  {Array.from({ length: dobles }, (_, d) => <span key={d} className="freqdot" />)}
                </div>
                <div className="freqbar">
                  {segs.map((t) => (
                    <div
                      key={t.name}
                      className="freqseg"
                      style={{ height: `${(byWeek[w][t.name] / max) * 100}%`, background: t.color }}
                      title={`${t.name}: ${byWeek[w][t.name]}`}
                    />
                  ))}
                </div>
                <span className="mono freqlbl">{mon.getDate()}/{mon.getMonth() + 1}</span>
              </div>
            );
          })}
        </div>

        <div className="cargas-resto">
          {legend.map((t) => (
            <div className="cargas-restrow" key={t.name}>
              <span className="cargas-dot" style={{ background: t.color }} />
              <span className="cargas-restname">{t.name}</span>
              <span className="mono cargas-restgain" style={{ color: t.color }}>{t.total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
