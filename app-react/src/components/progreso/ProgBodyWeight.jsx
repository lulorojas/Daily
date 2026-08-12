import { LineChart } from '../ui/LineChart';
import { EmptyCard, Section } from '../ui/Section';
import { bodyList } from '../../lib/gym';
import { inPeriod, progLabel, progPeriodNote } from '../../lib/progress';
import { fmtNum, shortDate } from '../../lib/dates';
import { C, tint } from '../../lib/theme';

/* ----------------------------- PESO CORPORAL (PROGRESO) -----------------------------
   Port de progBodyWeight(). El número grande es el ÚLTIMO peso cargado, sin importar el
   período (`log[log.length-1]`, no el último DENTRO de la ventana): el período solo
   recorta la tendencia de abajo, no el dato actual. Es la misma distinción que hace
   "en los últimos 7 días" al lado de la variación, y no al lado del número grande. */
export function ProgBodyWeight({ data, per, start }) {
  const log = bodyList(data);

  return (
    <Section label="Peso corporal">
      {log.length === 0 ? (
        <EmptyCard size="tight">Cargá tu peso para ver la tendencia.</EmptyCard>
      ) : (
        <BodyWeightCard log={log} per={per} start={start} />
      )}
    </Section>
  );
}

function BodyWeightCard({ log, per, start }) {
  const win = log.filter((r) => inPeriod(r.date, start));
  const cur = log[log.length - 1];
  const hayTend = win.length > 1;
  const gain = hayTend ? +(win[win.length - 1].kg - win[0].kg).toFixed(1) : 0;

  return (
    <div className="bigcard">
      <div className="bigcard-top">
        <div className="bigcard-val">
          <span className="fr bigcard-num">{fmtNum(cur.kg)}</span>
          <span className="bigcard-unit">kg</span>
        </div>
        {hayTend && (
          <div className="bigcard-delta">
            <span className="deltapill" style={{ background: tint(gain < 0 ? C.green : C.danger, '29'), color: gain < 0 ? C.green : C.danger }}>
              {gain >= 0 ? '+' : ''}{fmtNum(gain)} kg
            </span>
            <span className="bigcard-since">{progLabel(per).toLowerCase()}</span>
          </div>
        )}
      </div>

      {hayTend ? (
        <>
          <LineChart points={win.map((r) => ({ date: r.date, v: r.kg }))} color={C.rose} W={320} H={110} unit="kg" style={{ width: '100%', height: '110px' }} />
          <div className="chartlabels">
            <span>{shortDate(win[0].date)}</span>
            <span>tocá un punto</span>
            <span>{shortDate(win[win.length - 1].date)}</span>
          </div>
        </>
      ) : (
        <div className="bigcard-note tight">
          {win.length ? 'Un solo registro' : 'Sin registros'} {progPeriodNote(per)}. Cargá otro para ver la tendencia.
        </div>
      )}
    </div>
  );
}
