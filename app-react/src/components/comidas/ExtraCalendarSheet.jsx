import { useState } from 'react';
import { CalendarBlank, CaretLeft, CaretRight, Cookie, Minus, PencilSimple, Plus, Trash, Wine } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { extraEntriesDelMes } from '../../lib/meals';
import { DOW_FULL, DOW_MINI, MONTHS, dow, iso, parseISO, todayISO } from '../../lib/dates';
import { C } from '../../lib/theme';

/* ----------------------------- CALENDARIO DE ALCOHOL / PERMITIDO -----------------------------
   Rediseño Nocturne (sección 8 del handoff): tocar "Alcohol" o "Permitido" abre un
   calendario del mes con lo anotado en cada día (vasos de alcohol, o puntitos de permitidos).
   Tocás un día (de hoy hacia atrás): abajo aparece lo de ese día —tocar una entrada la
   edita o la borra— y el botón "Anotar el N" abre el formulario: hora y, según el caso,
   cuánto (vasos) o qué fue y en lugar de qué comida ("Suelto" = fuera de las comidas).

   Dos pantallas adentro del mismo modal, controladas por `paso`:
     'lista'   — el calendario, el detalle del día y "Anotar";
     'form'    — el formulario, para una entrada nueva o para corregir una (`editId`).
   `form` junta lo que se escribe en el formulario; `fecha` es el día elegido y puede
   cambiarse volviendo al calendario con "cambiar".

   No guarda nada por su cuenta: avisa con onAdd / onUpdate / onDelete y la página escribe en
   el documento (ver store/mutations.js). */
const TIPOS = {
  alcohol: { titulo: 'Alcohol', color: C.rose, Icono: Wine, hora: '21:00' },
  permitido: { titulo: 'Permitido', color: C.coral, Icono: Cookie, hora: '17:30' },
};

const labelDia = (dISO, hoy) => {
  const d = parseISO(dISO);
  return dISO === hoy ? `Hoy · ${DOW_FULL[dow(d)].toLowerCase()} ${d.getDate()}` : `${DOW_FULL[dow(d)]} ${d.getDate()} de ${MONTHS[d.getMonth()].toLowerCase()}`;
};

export function ExtraCalendarSheet({ kind, data, slots, initialDate, onClose, onAdd, onUpdate, onDelete }) {
  const hoy = todayISO();
  const t = TIPOS[kind];
  const esAlcohol = kind === 'alcohol';
  const [paso, setPaso] = useState('lista');
  const [fecha, setFecha] = useState(initialDate > hoy ? hoy : initialDate);
  const [form, setForm] = useState(null);

  // El mes que se ve sigue al día elegido.
  const mes = fecha.slice(0, 7);
  const [y, m] = mes.split('-').map(Number);
  const delMes = extraEntriesDelMes(data, kind, mes);
  const porDia = {};
  delMes.forEach((x) => { porDia[x.dISO] = (porDia[x.dISO] ?? 0) + (esAlcohol ? x.qty : 1); });
  const totalMes = delMes.reduce((a, x) => a + (esAlcohol ? x.qty : 1), 0);
  const delDia = delMes.filter((x) => x.dISO === fecha).sort((a, b) => (a.entry.time ?? '').localeCompare(b.entry.time ?? ''));

  const primerDow = dow(new Date(y, m - 1, 1));
  const diasMes = new Date(y, m, 0).getDate();
  const celdas = [...Array(primerDow).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)];
  while (celdas.length % 7) celdas.push(null);

  const irMes = (dir) => {
    const nuevo = iso(new Date(y, m - 1 + dir, 1));
    setFecha(nuevo > hoy ? hoy : nuevo);
  };
  const mesActual = mes === hoy.slice(0, 7);

  const nuevo = () => { setForm({ editId: null, time: t.hora, qty: 1, que: '', slotId: null }); setPaso('form'); };
  const editar = (x) => {
    setForm({ editId: x.entry.id, desde: x.dISO, time: x.entry.time ?? t.hora, qty: x.qty, que: x.que ?? '', slotId: x.slotId ?? null });
    setPaso('form');
  };
  const set = (p) => setForm((f) => ({ ...f, ...p }));

  const guardar = () => {
    if (!esAlcohol && !form.que.trim()) return;
    if (form.editId) onUpdate(form.editId, form.desde, { time: form.time, qty: form.qty, que: form.que, slotId: form.slotId, toDISO: fecha });
    else onAdd({ dISO: fecha, time: form.time, qty: form.qty, que: form.que, slotId: form.slotId });
    setPaso('lista');
  };
  const borrar = () => { onDelete(form.desde ?? fecha, form.editId); setPaso('lista'); };

  if (paso === 'form') {
    return (
      <Modal title={`${form.editId ? 'Editar' : 'Anotar'} ${t.titulo.toLowerCase()}`} accent={t.color} saveLabel={form.editId ? 'Guardar' : 'Anotar'} onSave={guardar} onClose={() => setPaso('lista')}>
        <div className="xs-form">
          {!esAlcohol && (
            <div className="fld">
              <div className="flabel notopmargin">¿Qué comiste?</div>
              <input className="inp" aria-label="Qué comiste" placeholder="Ej: un alfajor" value={form.que} onChange={(e) => set({ que: e.target.value })} />
            </div>
          )}

          <button type="button" className="xs-fecha" onClick={() => setPaso('lista')} aria-label="Cambiar el día">
            <CalendarBlank size={17} color={t.color} aria-hidden="true" />
            <span className="grow">{labelDia(fecha, hoy)}</span>
            <span className="xs-cambiar">cambiar</span>
          </button>

          <div className="xs-row">
            <div className="fld grow">
              <div className="flabel notopmargin">¿A qué hora?</div>
              <input className="inp" type="time" aria-label="Hora" value={form.time} onChange={(e) => set({ time: e.target.value })} />
            </div>
            {esAlcohol && (
              <div className="fld grow">
                <div className="flabel notopmargin">¿Cuánto?</div>
                <div className="xs-stepper">
                  <button type="button" aria-label="Un vaso menos" onClick={() => set({ qty: Math.max(1, form.qty - 1) })}><Minus size={14} aria-hidden="true" /></button>
                  <span>{form.qty} {form.qty === 1 ? 'vaso' : 'vasos'}</span>
                  <button type="button" aria-label="Un vaso más" onClick={() => set({ qty: form.qty + 1 })}><Plus size={14} aria-hidden="true" /></button>
                </div>
              </div>
            )}
          </div>

          {!esAlcohol && (
            <div className="fld">
              <div className="flabel notopmargin">¿En lugar de una comida?</div>
              <div className="xs-chips">
                {[{ id: null, name: 'Suelto, fuera de las comidas' }, ...slots].map((s) => {
                  const on = (form.slotId ?? null) === s.id;
                  return (
                    <button
                      type="button" key={s.id ?? 'suelto'} className={`xs-chip${on ? ' on' : ''}`} aria-pressed={on}
                      onClick={() => set({ slotId: s.id })}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {form.editId && (
            <button type="button" className="xs-borrar" onClick={borrar}><Trash size={15} aria-hidden="true" />Borrar</button>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={t.titulo} accent={t.color} onClose={onClose}>
      <div className="xs-lista" style={{ '--xs': t.color }}>
        <div className="xs-mes">
          <button type="button" className="xs-mesbtn" aria-label="Mes anterior" onClick={() => irMes(-1)}><CaretLeft size={14} aria-hidden="true" /></button>
          <span className="xs-mesnombre">{MONTHS[m - 1]} {y}</span>
          <span className="xs-mestotal">{totalMes} {esAlcohol ? (totalMes === 1 ? 'vaso' : 'vasos') : (totalMes === 1 ? 'permitido' : 'permitidos')} en el mes</span>
          <button type="button" className="xs-mesbtn" aria-label="Mes siguiente" disabled={mesActual} onClick={() => irMes(1)}><CaretRight size={14} aria-hidden="true" /></button>
        </div>

        <div className="xs-cal">
          {DOW_MINI.map((d, i) => <span key={i} className="xs-dow">{d}</span>)}
          {celdas.map((n, i) => {
            if (n === null) return <span key={`h${i}`} />;
            const dISO = iso(new Date(y, m - 1, n));
            const futuro = dISO > hoy;
            const v = porDia[dISO] ?? 0;
            const sel = dISO === fecha;
            return (
              <button
                type="button" key={dISO} disabled={futuro} aria-pressed={sel}
                aria-label={`${n} de ${MONTHS[m - 1].toLowerCase()}${v ? `, ${v} ${esAlcohol ? 'vasos' : 'permitidos'}` : ''}`}
                className={`xs-day${sel ? ' sel' : ''}${v ? ' has' : ''}${dISO === hoy ? ' hoy' : ''}`}
                onClick={() => setFecha(dISO)}
              >
                <span className="xs-n">{n}</span>
                <span className="xs-mark">{v ? (esAlcohol ? `${v} ${v === 1 ? 'vaso' : 'vasos'}` : '●'.repeat(Math.min(v, 3))) : ''}</span>
              </button>
            );
          })}
        </div>

        <div className="xs-dia">
          <div className="xs-dia-head">
            <span className="grow">{labelDia(fecha, hoy)}</span>
            {delDia.length > 0 && (
              <span className="xs-dia-n">
                {esAlcohol ? `${delDia.reduce((a, x) => a + x.qty, 0)} vasos` : `${delDia.length} ${delDia.length === 1 ? 'permitido' : 'permitidos'}`}
              </span>
            )}
          </div>
          {delDia.map((x) => (
            <button type="button" className="xs-entry" key={x.entry.id} onClick={() => editar(x)} aria-label={`Editar ${esAlcohol ? 'alcohol' : x.que}`}>
              <span className="xs-entry-t">{x.entry.time ?? '--:--'}</span>
              <span className="grow">
                <span className="xs-entry-what">{esAlcohol ? `${x.qty} ${x.qty === 1 ? 'vaso' : 'vasos'}` : x.que}</span>
                <span className="xs-entry-sub">
                  {esAlcohol ? 'Alcohol' : x.slotId ? `en lugar de ${slots.find((s) => s.id === x.slotId)?.name ?? 'una comida'}` : 'Suelto, fuera de las comidas'}
                </span>
              </span>
              <PencilSimple size={15} aria-hidden="true" />
            </button>
          ))}
          {delDia.length === 0 && <div className="xs-vacio">Nada anotado este día.</div>}
        </div>

        <button type="button" className="xs-anotar" onClick={nuevo}>
          <Plus size={16} aria-hidden="true" />
          {fecha === hoy ? 'Anotar hoy' : `Anotar el ${parseISO(fecha).getDate()}`}
        </button>
      </div>
    </Modal>
  );
}
