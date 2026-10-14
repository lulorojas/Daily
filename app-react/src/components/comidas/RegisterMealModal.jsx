import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { MinusIcon, PlusIcon } from '../ui/Icons';
import { OffPlanForm } from './OffPlanForm';
import { itemsLabel, optionLabel } from '../../lib/meals';
import { C, tint } from '../../lib/theme';

/* ----------------------------- REGISTRAR UNA COMIDA -----------------------------
   Pedido explícito: "que yo pueda llevar de una manera fácil, clara y didáctica el
   registro de mis comidas". En vez de escribir y esperar que el bot entienda, se toca:

     1. elegir   — las opciones del plan para esta franja. Una opción sin alimentos se
                   registra de una con un toque; una medible pasa al paso 2. Abajo,
                   "¿Comiste otra cosa?": algo fuera del plan para ESTA franja, diciendo
                   qué ("unas galletas en el desayuno") y si fue distinto pero sano o un
                   permitido (OffPlanForm).
     2. ajustar  — cada alimento arranca en lo que pide el plan; con −/+ se corrige si
                   comiste más o menos (unidades de a 1, gramos de a 10). "Sacar" lo deja
                   en 0 sin perderlo de vista, y "Volver a poner" lo devuelve a lo del plan
                   (pedido explícito: "elegir una opción y sacarle algo por si lo quiero
                   agregar después"). Si hay algo en gramos aparece "Lo pesé en la balanza".

   Con `initial` (corregir algo ya registrado desde "Tu día") arranca directo en el paso 2
   con lo que se había guardado — así "lo agrego después" es volver acá y ponerlo.

   El acento va explícito (C.violet): el modal vive fuera de #app y no lee var(--accent). */
const ACCENT = C.violet;

function qtysDelPlan(option) {
  return Object.fromEntries(option.items.map((it) => [it.id, it.qty]));
}

export function RegisterMealModal({ slot, initial = null, onClose, onSave, onLibre }) {
  const editando = !!initial;
  const inicial = initial ? slot.options.find((o) => o.id === initial.optionId) ?? null : null;

  const [option, setOption] = useState(inicial?.items?.length ? inicial : null);
  const [qtys, setQtys] = useState(inicial?.items?.length ? { ...qtysDelPlan(inicial), ...initial.qtys } : {});
  const [pesado, setPesado] = useState(!!initial?.pesado);

  const elegir = (o) => {
    if (!o.items?.length) {
      onSave({ optionId: o.id, qtys: {}, pesado: false });
      return;
    }
    setOption(o);
    setQtys(qtysDelPlan(o));
    setPesado(false);
  };

  const fijar = (it, valor) => setQtys((q) => ({ ...q, [it.id]: Math.max(0, valor) }));
  const cambiar = (it, delta) => fijar(it, (Number(qtys[it.id]) || 0) + delta);

  const hayPeso = option?.items.some((it) => it.unit === 'gr');

  if (!option) {
    return (
      <Modal title={slot.name} accent={ACCENT} onClose={onClose}>
        <div className="fld">
          <div className="flabel notopmargin">¿Qué comiste del plan?</div>
          {slot.options.length === 0 ? (
            <div className="empty">Esta franja todavía no tiene opciones. Cargalas desde &quot;Editar&quot; en el plan.</div>
          ) : (
            <div className="mealopts">
              {slot.options.map((o) => (
                <button type="button" className="mealopt" key={o.id} onClick={() => elegir(o)}>
                  <span className="mealopt-name">{optionLabel(o)}</span>
                  {o.items?.length > 0 && <span className="mealopt-items">{itemsLabel(o.items)}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {!editando && (
          <div className="fld">
            <div className="flabel">¿Comiste otra cosa?</div>
            <OffPlanForm placeholder={`Ej: unas galletas en el ${slot.name.toLowerCase()}`} onAnotar={onLibre} />
          </div>
        )}
      </Modal>
    );
  }

  return (
    <Modal
      title={slot.name}
      accent={ACCENT}
      saveLabel={editando ? 'Guardar' : 'Registrar'}
      onSave={() => onSave({ optionId: option.id, qtys, pesado: hayPeso && pesado })}
      onClose={onClose}
    >
      <div className="fld">
        <div className="flabel notopmargin">{optionLabel(option)}</div>
        <div className="managetypes-note mealajustar-hint">
          Arranca con lo que pide el plan. Ajustá si comiste más o menos, o sacá lo que no comiste.
        </div>

        <div className="mealajustar">
          {option.items.map((it) => {
            const gr = it.unit === 'gr';
            const paso = gr ? 10 : 1;
            const valor = qtys[it.id] ?? 0;
            const sacado = valor === 0;
            return (
              <div className={`mealajustar-row${sacado ? ' off' : ''}`} key={it.id}>
                <div className="grow">
                  <div className="mealajustar-name">{it.name}</div>
                  <div className="mealajustar-plan">
                    plan: {gr ? `${it.qty} gr` : it.qty}
                    {' · '}
                    <button
                      type="button"
                      className="mealajustar-toggle"
                      aria-label={sacado ? `Volver a poner ${it.name}` : `Sacar ${it.name}`}
                      onClick={() => fijar(it, sacado ? it.qty : 0)}
                    >
                      {sacado ? 'Volver a poner' : 'Sacar'}
                    </button>
                  </div>
                </div>
                <button type="button" className="stepbtn dec" onClick={() => cambiar(it, -paso)} aria-label={`Menos ${it.name}`}>
                  <MinusIcon color="#F2F4F8" strokeWidth="2.8" />
                </button>
                <input
                  className="inp mealajustar-val"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  aria-label={`Cantidad de ${it.name}`}
                  value={valor}
                  onChange={(e) => fijar(it, Number(e.target.value) || 0)}
                />
                <span className="mealajustar-unit">{gr ? 'gr' : 'u'}</span>
                <button type="button" className="stepbtn" style={{ background: tint(ACCENT, '2E') }} onClick={() => cambiar(it, paso)} aria-label={`Más ${it.name}`}>
                  <PlusIcon color={ACCENT} strokeWidth="2.8" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {hayPeso && (
        <div className="fld">
          <div className="mealpesado">
            <div className="grow">
              <div className="mealajustar-name">Lo pesé en la balanza</div>
              <div className="mealajustar-plan">Si no, los gramos quedan como estimados a ojo.</div>
            </div>
            <button
              type="button"
              className={`switch${pesado ? ' on' : ''}`}
              style={pesado ? { background: ACCENT } : undefined}
              role="switch"
              aria-checked={pesado}
              aria-label="Lo pesé en la balanza"
              onClick={() => setPesado((p) => !p)}
            >
              <span className="knob" />
            </button>
          </div>
        </div>
      )}

      <button type="button" className="mealvolver" onClick={() => setOption(null)}>
        ← Elegir otra opción
      </button>
    </Modal>
  );
}
