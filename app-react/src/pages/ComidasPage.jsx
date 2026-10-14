import { useState } from 'react';
import { WeekStrip } from '../components/ui/WeekStrip';
import { EmptyCard, Section } from '../components/ui/Section';
import { DayMealsCard } from '../components/comidas/DayMealsCard';
import { RegisterMealModal } from '../components/comidas/RegisterMealModal';
import { OffPlanForm } from '../components/comidas/OffPlanForm';
import { Modal } from '../components/ui/Modal';
import { C } from '../lib/theme';
import { MealPlanCard } from '../components/comidas/MealPlanCard';
import { MealPlanManager } from '../components/comidas/MealPlanManager';
import { MealExtraRow } from '../components/comidas/MealExtraRow';
import { MealExtrasManager } from '../components/comidas/MealExtrasManager';
import { MealLogBubble } from '../components/comidas/MealLogBubble';
import { MealLogComposer } from '../components/comidas/MealLogComposer';
import { PencilIcon } from '../components/ui/Icons';
import { useData } from '../hooks/useData';
import { activePlan, dayMealSummary, extraCount, extraStreak, missingFromTemplate } from '../lib/meals';
import { PLAN_NUTRI_2026_10 } from '../lib/mealPlanTemplates';
import {
  addMealExtraEntry, addMealLogEntry, addMealLogLibre, addMealLogStructured, deleteMealLogEntry, loadMealPlanTemplate,
  updateMealLogStructured,
} from '../store/mutations';
import { iso, mondayOf, parseISO, todayISO } from '../lib/dates';
import { shiftWeek } from '../lib/items';

/* ============================================================================
   COMIDAS

   Sexta sección, sin equivalente en vanilla. Reordenada alrededor de "Tu día" (pedido
   explícito: "que yo pueda llevar de una manera fácil, clara y didáctica el registro de
   mis comidas con lo que te expliqué y el plan que te mandé"):

     Tu día    — una fila por franja del plan con su estado (pendiente/parcial/cumplida/
                 libre) y un botón "Registrar" que abre RegisterMealModal: elegís la opción
                 que comiste y ajustás las cantidades con −/+ (o sacás lo que no comiste),
                 sin escribir nada — o anotás algo fuera del plan en esa franja (distinto
                 pero sano, o un permitido). "Editar" en un registro vuelve a abrirlo para
                 corregirlo. Al final, los permitidos sueltos ("un alfajor a la tarde").
                 Arriba, una frase ("Te falta: Cena.") y el % del plan del día.
     Extras    — café, alcohol, comida libre… con cuántas veces aparecieron esta semana, y
                 un "+" para anotarlos de un toque.
     Bitácora  — todo lo registrado ese día, en orden. Abajo, el cuadro de texto libre de
                 siempre: lo que escribas lo sigue reconociendo el bot (matchEntry).
     Plan      — lo que tenés que comer, de solo lectura, con la guía del nutricionista;
                 se edita desde "Editar". Si falta algo del plan de la nutricionista
                 (borrado sin querer, o sumado después a la plantilla), un aviso ofrece
                 agregarlo.

   Sin plan todavía, "Tu día" ofrece cargar de un toque el plan que mandó Lulo en PDF
   (PLAN_NUTRI_2026_10 en lib/mealPlanTemplates.js) — o armarlo a mano.

   El día que se mira es estado LOCAL de esta pantalla (como el mes en Calendario o la
   semana en Gimnasio), no la URL: la bitácora de comidas no se comparte con ninguna otra
   pantalla, así que no hay nada que sincronizar por ?d= como hacen Hoy y Calendario.
   ============================================================================ */
export function ComidasPage() {
  const { data, update } = useData();
  const [day, setDay] = useState(todayISO());
  const [modal, setModal] = useState(null);

  const plan = activePlan(data);
  const slots = plan?.slots ?? [];
  const extras = data.meals?.extras ?? [];
  const log = data.meals?.log ?? {};
  const entradas = log[day] ?? [];
  const resumen = dayMealSummary(data, day);
  const diff = missingFromTemplate(plan, PLAN_NUTRI_2026_10);
  const faltanDelPlan = diff.parecido ? diff.faltan.length : 0;

  // Para resolver el nombre de cada coincidencia sin recorrer el plan entero por burbuja.
  const slotsById = Object.fromEntries(slots.map((s) => [s.id, s]));
  const extrasById = Object.fromEntries(extras.map((e) => [e.id, e]));

  // "Esta semana" es la semana del día que se está mirando, no siempre la actual.
  const lunes = iso(mondayOf(parseISO(day)));

  const escribir = (text) => update((draft) => addMealLogEntry(draft, day, text));
  const borrar = (id) => update((draft) => deleteMealLogEntry(draft, day, id));
  const cargarPlan = () => update((draft) => loadMealPlanTemplate(draft, PLAN_NUTRI_2026_10));

  // `modal.entryId` presente = se está corrigiendo un registro de "Tu día" (Editar).
  const registrar = (slot, { optionId, qtys, pesado, suma }) => {
    update((draft) => (modal.entryId
      ? updateMealLogStructured(draft, day, modal.entryId, { slotId: slot.id, optionId, prevOptionId: modal.initial.optionId, qtys, pesado, suma })
      : addMealLogStructured(draft, day, { slotId: slot.id, optionId, qtys, pesado, suma })));
    setModal(null);
  };
  // `slot` null = un permitido suelto, fuera de las comidas.
  const anotarLibre = (slot, que, tipo) => {
    update((draft) => addMealLogLibre(draft, day, slot?.id ?? null, que, tipo));
    setModal(null);
  };
  const editar = (slot, registro) => setModal({
    kind: 'registrar',
    slotId: slot.id,
    entryId: registro.entryId,
    initial: {
      optionId: registro.option.id,
      qtys: Object.fromEntries((registro.match.items ?? []).map((m) => [m.itemId, m.qty])),
      pesado: !!registro.pesado,
      suma: registro.suma,
    },
  });

  const editarPlan = (
    <button type="button" className="pillbtn comidas" onClick={() => setModal({ kind: 'plan' })}>
      <PencilIcon size={14} />
      Editar
    </button>
  );

  return (
    <div className="view">
      <div className="head">
        <h1>Comidas</h1>
        <div className="sub">Tu plan, y lo que vas comiendo.</div>
      </div>

      <div className="body">
        <WeekStrip
          selected={day}
          onSelect={setDay}
          onWeek={(weeks) => setDay(shiftWeek(day, weeks))}
          hasMark={(dISO) => (log[dISO] ?? []).length > 0}
        />

        <Section label="Tu día">
          {slots.length ? (
            <DayMealsCard
              summary={resumen}
              onRegistrar={(slot) => setModal({ kind: 'registrar', slotId: slot.id })}
              onEditar={editar}
              onPermitido={() => setModal({ kind: 'permitido' })}
            />
          ) : (
            <div className="card pad mealempty">
              <div className="mealempty-title">Todavía no tenés un plan cargado.</div>
              <div className="mealempty-sub">
                Cargá el plan que te dio tu nutricionista ({PLAN_NUTRI_2026_10.name}) y empezá a registrar tocando cada comida.
              </div>
              <button type="button" className="pillbtn comidas mealempty-btn" onClick={cargarPlan}>
                Cargar el plan de la nutricionista
              </button>
              <button type="button" className="mealempty-alt" onClick={() => setModal({ kind: 'plan' })}>
                o armalo a mano
              </button>
            </div>
          )}
        </Section>

        <Section
          label="Extras"
          action={(
            <button type="button" className="pillbtn comidas" onClick={() => setModal({ kind: 'extras' })}>
              <PencilIcon size={14} />
              Editar
            </button>
          )}
        >
          {extras.length
            ? extras.map((ex) => (
              <MealExtraRow
                key={ex.id}
                extra={ex}
                semana={extraCount(data, ex.id, lunes)}
                racha={extraStreak(data, ex.id, day)}
                onAdd={() => update((draft) => addMealExtraEntry(draft, day, ex.id))}
              />
            ))
            : <EmptyCard size="sm">Café, alcohol, permitidos… agregá los que quieras seguir.</EmptyCard>}
        </Section>

        <Section label="Bitácora" note={entradas.length ? String(entradas.length) : null}>
          {entradas.length
            ? entradas.map((e) => (
              <MealLogBubble
                key={e.id}
                entry={e}
                slotsById={slotsById}
                extrasById={extrasById}
                onDelete={() => borrar(e.id)}
              />
            ))
            : <EmptyCard size="sm">Nada anotado todavía para este día.</EmptyCard>}

          <MealLogComposer onSend={escribir} />
        </Section>

        <Section label="Plan de comidas" action={editarPlan}>
          {faltanDelPlan > 0 && (
            <div className="card pad mealrecover">
              <span className="grow">
                Hay {faltanDelPlan} {faltanDelPlan === 1 ? 'cosa' : 'cosas'} del plan de la nutricionista que no {faltanDelPlan === 1 ? 'está' : 'están'} en el tuyo (borradas sin querer, o nuevas).
              </span>
              <button type="button" className="pillbtn comidas" onClick={() => setModal({ kind: 'plan', recuperar: true })}>
                Agregar
              </button>
            </div>
          )}

          {slots.length
            ? <MealPlanCard slots={slots} />
            : <EmptyCard>Todavía no armaste tu plan. Tocá &quot;Editar&quot; para crear la primera franja.</EmptyCard>}

          {plan?.guide?.length > 0 && (
            <details className="card pad mealguide">
              <summary>Guía de tu nutricionista</summary>
              <ul>
                {plan.guide.map((g) => <li key={g}>{g}</li>)}
              </ul>
            </details>
          )}
        </Section>
      </div>

      {modal?.kind === 'registrar' && slotsById[modal.slotId] && (
        <RegisterMealModal
          slot={slotsById[modal.slotId]}
          initial={modal.initial ?? null}
          onClose={() => setModal(null)}
          onSave={(sel) => registrar(slotsById[modal.slotId], sel)}
          onLibre={(que, tipo) => anotarLibre(slotsById[modal.slotId], que, tipo)}
        />
      )}
      {modal?.kind === 'permitido' && (
        <Modal title="Permitido" accent={C.violet} onClose={() => setModal(null)}>
          <div className="fld">
            <div className="flabel notopmargin">¿Qué te comiste?</div>
            <OffPlanForm placeholder="Ej: un alfajor" tipos={['permitido']} onAnotar={(que) => anotarLibre(null, que, 'permitido')} />
          </div>
        </Modal>
      )}
      {modal?.kind === 'plan' && <MealPlanManager onClose={() => setModal(null)} recuperarDeEntrada={!!modal.recuperar} />}
      {modal?.kind === 'extras' && <MealExtrasManager onClose={() => setModal(null)} />}
    </div>
  );
}
