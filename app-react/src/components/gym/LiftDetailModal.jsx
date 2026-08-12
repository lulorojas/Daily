import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { LineChart } from '../ui/LineChart';
import { PencilIcon, CrossIcon } from '../ui/Icons';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useData } from '../../hooks/useData';
import { deleteLift } from '../../store/mutations';
import { fmtDateLong, fmtNum, shortDate } from '../../lib/dates';
import { C, accentedDashedStyle, tint } from '../../lib/theme';

/* ----------------------------- DETALLE DE UN EJERCICIO -----------------------------
   Port de liftDetailModal(): el número grande, el récord, el gráfico si hay al menos dos
   registros, y la lista completa (del más nuevo al más viejo) con editar y borrar.

   `desc`/`asc` son la misma lista en los dos órdenes: el gráfico necesita cronológico
   (asc) y la lista de abajo necesita "lo último arriba" (desc). Se calculan una vez acá,
   no en cada fila. */
export function LiftDetailModal({ lift, onClose, onLogWeight, onEditRecord }) {
  const { update } = useData();
  const [confirming, setConfirming] = useState(false);
  const [borrandoIdx, setBorrandoIdx] = useState(null);

  const col = lift.color, unit = lift.unit || 'kg';
  const asc = lift.history
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (a.p.date < b.p.date ? -1 : 1));
  const desc = asc.slice().reverse();
  const data = asc.map((x) => x.p.weight);
  const cur = data[data.length - 1], first = data[0];
  const gain = +(cur - first).toFixed(1);
  const pr = Math.max(...data);
  const prRecord = asc.find((x) => x.p.weight === pr).p;

  const handleDeleteLift = () => {
    update((draft) => deleteLift(draft, lift.id));
    setConfirming(false);
    onClose();
  };

  return (
    <>
      <Modal title={lift.name} onClose={onClose}>
        <div className="liftdetail-top">
          <div className="liftdetail-cur">
            <span className="fr liftdetail-val" style={{ color: col }}>{fmtNum(cur)}</span>
            <span className="liftdetail-unit">{unit}</span>
            {data.length > 1 && (
              <span className="deltapill inline" style={{ color: gain < 0 ? C.danger : C.green, background: tint(gain < 0 ? C.danger : C.green, '29') }}>
                {gain >= 0 ? '+' : ''}{fmtNum(gain)} {unit}
              </span>
            )}
          </div>
          <div className="liftdetail-pr">
            <div className="liftdetail-prlbl">RÉCORD</div>
            <div className="fr liftdetail-prval">{fmtNum(pr)} {unit}</div>
          </div>
        </div>

        {data.length > 1 ? (
          <div className="fld">
            <LineChart
              points={asc.map((x) => ({ date: x.p.date, v: x.p.weight }))}
              color={col}
              W={320}
              H={96}
              unit={unit}
              style={{ width: '100%', height: '96px' }}
            />
            <div className="chartlabels">
              <span>{shortDate(asc[0].p.date)}</span>
              <span style={{ color: C.amber }}>récord {shortDate(prRecord.date)}</span>
              <span>{shortDate(asc[asc.length - 1].p.date)}</span>
            </div>
          </div>
        ) : (
          <div className="fld"><div className="liftdetail-hint">Cargá otro registro para ver la evolución.</div></div>
        )}

        <div className="fld">
          <div className="flabel">Registros por fecha</div>
          <div className="card managelist">
            {desc.map(({ p, i }) => {
              const esPr = p.weight === pr;
              return (
                <div className="managerow" key={i}>
                  <span className="fr managerow-kg" style={{ color: col }}>{fmtNum(p.weight)} {unit}</span>
                  <span className="managerow-date">{fmtDateLong(p.date)}</span>
                  {esPr && <span className="prtag">récord</span>}
                  <div className="managerow-actions">
                    <button type="button" className="iconcirc" aria-label="Editar registro" onClick={() => onEditRecord(i)}>
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      className="iconcirc"
                      aria-label="Eliminar registro"
                      onClick={() => setBorrandoIdx(i)}
                    >
                      <CrossIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button type="button" className="dashed" style={accentedDashedStyle(col)} onClick={onLogWeight}>
          + Cargar peso
        </button>
        <button type="button" className="delbtn" onClick={() => setConfirming(true)}>Eliminar ejercicio</button>
      </Modal>

      {confirming && (
        <ConfirmDialog
          title={`¿Eliminar "${lift.name}"?`}
          description="Se borra el ejercicio y todo su historial de pesos."
          okLabel="Eliminar"
          onConfirm={handleDeleteLift}
          onCancel={() => setConfirming(false)}
        />
      )}

      {borrandoIdx !== null && (
        lift.history.length <= 1 ? (
          <ConfirmDialog
            title="No se puede borrar"
            description="Es el único registro del ejercicio. Editalo, o eliminá el ejercicio entero."
            okLabel="Entendido"
            onConfirm={() => setBorrandoIdx(null)}
            onCancel={() => setBorrandoIdx(null)}
          />
        ) : (
          <ConfirmDialog
            title="¿Eliminar este registro?"
            description={`${fmtNum(lift.history[borrandoIdx].weight)} kg del ${fmtDateLong(lift.history[borrandoIdx].date)}. Se quita del historial.`}
            okLabel="Eliminar"
            onConfirm={() => {
              update((draft) => {
                const l = draft.gym.lifts.find((x) => x.id === lift.id);
                if (l && l.history.length > 1) l.history.splice(borrandoIdx, 1);
              });
              setBorrandoIdx(null);
            }}
            onCancel={() => setBorrandoIdx(null)}
          />
        )
      )}
    </>
  );
}
