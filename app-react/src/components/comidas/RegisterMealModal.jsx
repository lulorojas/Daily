import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { MinusIcon, PlusIcon } from '../ui/Icons';
import { OffPlanForm } from './OffPlanForm';
import { itemsLabel, normalizeText, optionLabel } from '../../lib/meals';
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

   En el paso 2 también se puede "Sumar algo de otra opción" de esta misma comida (pedido
   explícito: "arroz con pollo con un wok de verduras"): se toca el alimento de la otra
   opción y queda como una fila más, marcada como sumada. No cambia el cumplimiento de la
   opción elegida (ver buildStructured en store/mutations.js).

   Con `initial` (corregir algo ya registrado desde "Tu día") arranca directo en el paso 2
   con lo que se había guardado — así "lo agrego después" es volver acá y ponerlo.

   El acento va explícito (C.violet): el modal vive fuera de #app y no lee var(--accent). */
const ACCENT = C.violet;

function qtysDelPlan(option) {
  return Object.fromEntries(option.items.map((it) => [it.id, it.qty]));
}

// Una fila de alimento con −/+ y el número editable. `nota` es lo que va debajo del
// nombre (lo del plan, de qué opción vino) y `accion` el link de la derecha de la nota.
function FilaCantidad({ name, qty, unit, valor, onChange, nota, accion }) {
  const gr = unit === 'gr';
  const paso = gr ? 10 : 1;
  return (
    <div className={`mealajustar-row${valor === 0 ? ' off' : ''}`}>
      <div className="grow">
        <div className="mealajustar-name">{name}</div>
        <div className="mealajustar-plan">
          {nota ?? `plan: ${gr ? `${qty} gr` : qty}`}
          {accion && <>{' · '}{accion}</>}
        </div>
      </div>
      <button type="button" className="stepbtn dec" onClick={() => onChange(Math.max(0, valor - paso))} aria-label={`Menos ${name}`}>
        <MinusIcon color="#F2F4F8" strokeWidth="2.8" />
      </button>
      <input
        className="inp mealajustar-val"
        type="number"
        min="0"
        inputMode="numeric"
        aria-label={`Cantidad de ${name}`}
        value={valor}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      />
      <span className="mealajustar-unit">{gr ? 'gr' : 'u'}</span>
      <button type="button" className="stepbtn" style={{ background: tint(ACCENT, '2E') }} onClick={() => onChange(valor + paso)} aria-label={`Más ${name}`}>
        <PlusIcon color={ACCENT} strokeWidth="2.8" />
      </button>
    </div>
  );
}

export function RegisterMealModal({ slot, initial = null, onClose, onSave, onLibre, onSaltear }) {
  const editando = !!initial;
  const inicial = initial ? slot.options.find((o) => o.id === initial.optionId) ?? null : null;

  const [option, setOption] = useState(inicial?.items?.length ? inicial : null);
  const [qtys, setQtys] = useState(inicial?.items?.length ? { ...qtysDelPlan(inicial), ...initial.qtys } : {});
  const [pesado, setPesado] = useState(!!initial?.pesado);
  // Lo sumado de OTRAS opciones de esta comida (pedido explícito: "a una comida del plan
  // se le pueden agregar cosas de otras comidas del plan, por ejemplo arroz con pollo con
  // un wok de verduras"): [{ optionId, name, qty, unit?, tipo? }].
  const [suma, setSuma] = useState(initial?.suma ?? []);
  const [sumando, setSumando] = useState(false);

  const elegir = (o) => {
    if (!o.items?.length) {
      onSave({ optionId: o.id, qtys: {}, pesado: false, suma: [] });
      return;
    }
    setOption(o);
    setQtys(qtysDelPlan(o));
    setPesado(false);
    setSuma([]);
  };

  const fijar = (it, valor) => setQtys((q) => ({ ...q, [it.id]: Math.max(0, valor) }));

  const yaEsta = (name) => option.items.some((it) => normalizeText(it.name) === normalizeText(name))
    || suma.some((s) => normalizeText(s.name) === normalizeText(name));
  const sumar = (o, it) => setSuma((xs) => [...xs, {
    optionId: o.id, name: it.name, qty: it.qty, ...(it.unit ? { unit: it.unit } : {}), ...(it.tipo ? { tipo: it.tipo } : {}),
  }]);
  const fijarSuma = (i, qty) => setSuma((xs) => xs.map((s, j) => (j === i ? { ...s, qty } : s)));
  const quitarSuma = (i) => setSuma((xs) => xs.filter((_, j) => j !== i));
  const nombreOpcion = (id) => slot.options.find((o) => o.id === id)?.text ?? '';

  const hayPeso = option?.items.some((it) => it.unit === 'gr') || suma.some((s) => s.unit === 'gr');

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

        {!editando && onSaltear && (
          <div className="fld">
            <button type="button" className="nocomi" onClick={onSaltear}>
              <span className="grow">
                <span className="nocomi-t">No comí</span>
                <span className="nocomi-s">Queda anotado como comida salteada: cuenta 0% y es negativo para el día.</span>
              </span>
            </button>
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
      onSave={() => onSave({ optionId: option.id, qtys, pesado: hayPeso && pesado, suma: suma.filter((s) => s.qty > 0) })}
      onClose={onClose}
    >
      <div className="fld">
        <div className="flabel notopmargin">{optionLabel(option)}</div>
        <div className="managetypes-note mealajustar-hint">
          Arranca con lo que pide el plan. Ajustá si comiste más o menos, o sacá lo que no comiste.
        </div>

        <div className="mealajustar">
          {option.items.map((it) => {
            const valor = qtys[it.id] ?? 0;
            const sacado = valor === 0;
            return (
              <FilaCantidad
                key={it.id}
                name={it.name}
                qty={it.qty}
                unit={it.unit}
                valor={valor}
                onChange={(v) => fijar(it, v)}
                accion={(
                  <button
                    type="button"
                    className="mealajustar-toggle"
                    aria-label={sacado ? `Volver a poner ${it.name}` : `Sacar ${it.name}`}
                    onClick={() => fijar(it, sacado ? it.qty : 0)}
                  >
                    {sacado ? 'Volver a poner' : 'Sacar'}
                  </button>
                )}
              />
            );
          })}

          {suma.map((s, i) => (
            <FilaCantidad
              key={`${s.optionId}-${s.name}`}
              name={s.name}
              qty={s.qty}
              unit={s.unit}
              valor={s.qty}
              onChange={(v) => fijarSuma(i, v)}
              nota={`sumado, de ${nombreOpcion(s.optionId)}`}
              accion={(
                <button type="button" className="mealajustar-toggle" aria-label={`Quitar ${s.name}`} onClick={() => quitarSuma(i)}>
                  Quitar
                </button>
              )}
            />
          ))}
        </div>
      </div>

      {slot.options.length > 1 && (
        <div className="fld">
          {!sumando ? (
            <button type="button" className="dashed" onClick={() => setSumando(true)}>
              <PlusIcon size={16} strokeWidth="2.4" />
              Sumar algo de otra opción
            </button>
          ) : (
            <>
              <div className="flabel notopmargin">¿Qué le sumaste?</div>
              <div className="mealsumar">
                {slot.options.filter((o) => o.id !== option.id && o.items?.length).map((o) => {
                  const libres = o.items.filter((it) => !yaEsta(it.name));
                  if (!libres.length) return null;
                  return (
                    <div className="mealsumar-opt" key={o.id}>
                      <div className="mealajustar-plan">{optionLabel(o)}</div>
                      <div className="chips">
                        {libres.map((it) => (
                          <button
                            type="button"
                            className="chip"
                            key={it.id}
                            aria-label={`Sumar ${it.name} de ${optionLabel(o)}`}
                            onClick={() => sumar(o, it)}
                          >
                            + {it.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button type="button" className="mealvolver" onClick={() => setSumando(false)}>Listo</button>
            </>
          )}
        </div>
      )}

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
