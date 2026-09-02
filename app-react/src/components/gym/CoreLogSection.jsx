import { EmptyCard, Section } from '../ui/Section';
import { PencilIcon } from '../ui/Icons';
import { coreLogList, describeCoreLogEntry } from '../../lib/gym';
import { fmtDateLong } from '../../lib/dates';
import { C, accentedDashedStyle } from '../../lib/theme';

const ACCENT = C.violet;

/* ----------------------------- ABS Y MOVILIDAD -----------------------------
   Sin equivalente en vanilla (etapa 6). No hay un número que resumir como en peso
   corporal — cada registro es "qué categorías + si hubo movilidad", no una serie que
   promediar — así que el resumen es directo: el registro más reciente, con la cantidad
   total al lado. El historial completo (editar/borrar cualquiera) vive en
   [CoreLogManageModal](./CoreLogManageModal.jsx), igual que BodyWeightSection delega el
   historial completo a BodyManageModal. */
export function CoreLogSection({ data, onNew, onManage }) {
  const log = coreLogList(data);
  const last = log[log.length - 1];

  return (
    <Section
      label="Abs y movilidad"
      note={log.length ? `${log.length} ${log.length === 1 ? 'registro' : 'registros'}` : null}
      action={log.length > 0 && (
        <button type="button" className="iconcirc" onClick={onManage} aria-label="Administrar abs y movilidad">
          <PencilIcon />
        </button>
      )}
    >
      {log.length === 0 ? (
        <EmptyCard size="sm">Todavía no registraste abs ni movilidad.</EmptyCard>
      ) : (
        <div className="card managerow">
          <span className="managerow-name">{describeCoreLogEntry(last)}</span>
          <span className="managerow-date">{fmtDateLong(last.date)}</span>
        </div>
      )}

      <button type="button" className="dashed" style={accentedDashedStyle(ACCENT)} onClick={onNew}>
        + Registrar
      </button>
    </Section>
  );
}
