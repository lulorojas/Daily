import { LineChart } from '../ui/LineChart';
import { EmptyCard, Section } from '../ui/Section';
import { PencilIcon } from '../ui/Icons';
import { bodyList } from '../../lib/gym';
import { fmtNum, shortDate } from '../../lib/dates';
import { C, accentedDashedStyle, tint } from '../../lib/theme';

/* ----------------------------- PESO CORPORAL -----------------------------
   Port de bodyWeightSection(). Sin registros, una tarjeta vacía; con uno solo, el número
   grande sin gráfico (hace falta un segundo punto para trazar una tendencia); con dos o
   más, el gráfico de [LineChart](../ui/LineChart.jsx) — el mismo componente que usan
   Progreso y el detalle de un ejercicio, así los tres se ven y se comportan igual. */
export function BodyWeightSection({ data, onNew, onManage }) {
  const log = bodyList(data);
  const col = C.rose;

  return (
    <Section
      label="Peso corporal"
      note={log.length ? `${log.length} ${log.length === 1 ? 'registro' : 'registros'}` : null}
      action={log.length > 0 && (
        <button type="button" className="iconcirc" onClick={onManage} aria-label="Administrar registros">
          <PencilIcon />
        </button>
      )}
    >
      {log.length === 0 ? (
        <EmptyCard size="sm">Todavía no registraste tu peso.</EmptyCard>
      ) : (
        <div className="bigcard">
          <div className="bigcard-top">
            <div className="bigcard-val">
              <span className="fr bigcard-num">{fmtNum(log[log.length - 1].kg)}</span>
              <span className="bigcard-unit">kg</span>
            </div>
            {log.length > 1 && (
              <BodyWeightDelta log={log} />
            )}
          </div>

          {log.length > 1 ? (
            <>
              <LineChart
                points={log.map((p) => ({ date: p.date, v: p.kg }))}
                color={col}
                W={320}
                H={110}
                unit="kg"
                style={{ width: '100%', height: '110px' }}
              />
              <div className="chartlabels">
                <span>{shortDate(log[0].date)}</span>
                <span>tocá un punto</span>
                <span>{shortDate(log[log.length - 1].date)}</span>
              </div>
            </>
          ) : (
            <div className="bigcard-note">Cargá otro registro para ver la tendencia.</div>
          )}
        </div>
      )}

      <button type="button" className="dashed" style={accentedDashedStyle(col)} onClick={onNew}>
        + Registrar peso
      </button>
    </Section>
  );
}

function BodyWeightDelta({ log }) {
  const gain = +(log[log.length - 1].kg - log[0].kg).toFixed(1);
  const col = gain < 0 ? C.green : C.danger;
  return (
    <div className="bigcard-delta">
      <span className="deltapill" style={{ background: tint(col, '29'), color: col }}>
        {gain >= 0 ? '+' : ''}{fmtNum(gain)} kg
      </span>
      <span className="bigcard-since">{shortDate(log[log.length - 1].date)}</span>
    </div>
  );
}
