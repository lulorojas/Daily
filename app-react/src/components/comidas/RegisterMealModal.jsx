import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { MinusIcon, PlusIcon } from '../ui/Icons';
import { itemsLabel, optionLabel } from '../../lib/meals';
import { C, tint } from '../../lib/theme';

/* ----------------------------- REGISTRAR UNA COMIDA -----------------------------
   Pedido explícito: "que yo pueda llevar de una manera fácil, clara y didáctica el
   registro de mis comidas". En vez de escribir y esperar que el bot entienda, se toca:

     1. elegir   — las opciones del plan para esta franja. Una opción sin ítems se
                   registra de una con un toque; una medible pasa al paso 2.
     2. ajustar  — cada ítem arranca en lo que pide el plan; con −/+ se corrige si comiste
                   más o menos ("comí 2 tostadas en vez de 3"). Unidades de a 1, gramos de
                   a 10 (también se puede escribir el número). Si hay algo en gramos,
                   aparece "Lo pesé en la balanza" (pedido explícito: "si pesé o no pesé").

   Abajo de la lista, "¿Comiste otra cosa?" anota texto libre en la bitácora — el bot igual
   lo mira (extras como "Comida libre" o "Alcohol" se reconocen solos).

   El acento va explícito (C.violet): el modal vive fuera de #app y no lee var(--accent). */
const ACCENT = C.violet;

export function RegisterMealModal({ slot, onClose, onSave, onOtraCosa }) {
  const [option, setOption] = useState(null);
  const [qtys, setQtys] = useState({});
  const [pesado, setPesado] = useState(false);
  const [otra, setOtra] = useState('');

  const elegir = (o) => {
    if (!o.items?.length) {
      onSave({ optionId: o.id, qtys: {}, pesado: false });
      return;
    }
    setOption(o);
    setQtys(Object.fromEntries(o.items.map((it) => [it.id, it.qty])));
    setPesado(false);
  };

  const cambiar = (it, delta) => {
    setQtys((q) => ({ ...q, [it.id]: Math.max(0, (Number(q[it.id]) || 0) + delta) }));
  };

  const hayPeso = option?.items.some((it) => it.unit === 'gr');

  if (!option) {
    return (
      <Modal title={slot.name} accent={ACCENT} onClose={onClose}>
        <div className="fld">
          <div className="flabel notopmargin">¿Qué comiste?</div>
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

        <div className="fld">
          <div className="flabel">¿Comiste otra cosa?</div>
          <div className="mealotra">
            <input
              className="inp"
              placeholder="Ej: pastel de carne, comida libre"
              aria-label="Comí otra cosa"
              value={otra}
              onChange={(e) => setOtra(e.target.value)}
            />
            <button
              type="button"
              className="pillbtn comidas"
              aria-label="Anotar otra cosa"
              disabled={!otra.trim()}
              onClick={() => onOtraCosa(otra.trim())}
            >
              Anotar
            </button>
          </div>
          <div className="managetypes-note">
            Queda en la bitácora. Si es algo que no está mal, agregá &quot;comida libre&quot; al texto para que cuente como fuera del plan pero bien.
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={slot.name}
      accent={ACCENT}
      saveLabel="Registrar"
      onSave={() => onSave({ optionId: option.id, qtys, pesado: hayPeso && pesado })}
      onClose={onClose}
    >
      <div className="fld">
        <div className="flabel notopmargin">{optionLabel(option)}</div>
        <div className="managetypes-note mealajustar-hint">
          Arranca con lo que pide el plan. Ajustá si comiste más o menos.
        </div>

        <div className="mealajustar">
          {option.items.map((it) => {
            const gr = it.unit === 'gr';
            const paso = gr ? 10 : 1;
            const valor = qtys[it.id] ?? 0;
            return (
              <div className="mealajustar-row" key={it.id}>
                <div className="grow">
                  <div className="mealajustar-name">{it.name}</div>
                  <div className="mealajustar-plan">plan: {gr ? `${it.qty} gr` : it.qty}</div>
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
                  onChange={(e) => setQtys((q) => ({ ...q, [it.id]: Math.max(0, Number(e.target.value) || 0) }))}
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
