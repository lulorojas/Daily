import { useMemo, useState } from 'react';
import { WeekStrip } from '../components/ui/WeekStrip';
import { EmptyCard, Section } from '../components/ui/Section';
import { MealPlanCard } from '../components/comidas/MealPlanCard';
import { MealPlanManager } from '../components/comidas/MealPlanManager';
import { MealExtraRow } from '../components/comidas/MealExtraRow';
import { MealExtrasManager } from '../components/comidas/MealExtrasManager';
import { MealLogBubble } from '../components/comidas/MealLogBubble';
import { MealLogComposer } from '../components/comidas/MealLogComposer';
import { PencilIcon } from '../components/ui/Icons';
import { useData } from '../hooks/useData';
import { extraCount, extraStreak } from '../lib/meals';
import { addMealLogEntry, deleteMealLogEntry } from '../store/mutations';
import { iso, mondayOf, parseISO, todayISO } from '../lib/dates';
import { shiftWeek } from '../lib/items';

/* ============================================================================
   COMIDAS

   Sexta sección, sin equivalente en vanilla. Tres bloques:

     Plan      — lo que tenés que comer (franjas con varias opciones), de solo lectura
                 acá; se edita desde el lápiz de la cabecera (MealPlanManager).
     Extras    — café, alcohol, permitidos… el catálogo que vos armás, con cuántas veces
                 aparecieron esta semana y su racha.
     Bitácora  — lo que escribiste ese día. Escribís en texto libre y el "bot" reconoce
                 solo lo que matchea del plan y de los extras (matchEntry en lib/meals.js).
                 Sin IA y sin respuestas: anota y registra, nada más — pedido explícito.

   El día que se mira es estado LOCAL de esta pantalla (como el mes en Calendario o la
   semana en Gimnasio), no la URL: la bitácora de comidas no se comparte con ninguna otra
   pantalla, así que no hay nada que sincronizar por ?d= como hacen Hoy y Calendario.
   ============================================================================ */
export function ComidasPage() {
  const { data, update } = useData();
  const [day, setDay] = useState(todayISO());
  const [modal, setModal] = useState(null);

  const plan = data.meals?.plan ?? [];
  const extras = data.meals?.extras ?? [];
  const log = data.meals?.log ?? {};
  const entradas = log[day] ?? [];

  // Para resolver el nombre de cada coincidencia sin recorrer el plan entero por burbuja.
  const slotsById = useMemo(() => Object.fromEntries(plan.map((s) => [s.id, s])), [plan]);
  const extrasById = useMemo(() => Object.fromEntries(extras.map((e) => [e.id, e])), [extras]);

  // "Esta semana" es la semana del día que se está mirando, no siempre la actual.
  const lunes = iso(mondayOf(parseISO(day)));

  const escribir = (text) => update((draft) => addMealLogEntry(draft, day, text));
  const borrar = (id) => update((draft) => deleteMealLogEntry(draft, day, id));

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

        <Section
          label="Plan de comidas"
          action={(
            <button type="button" className="pillbtn comidas" onClick={() => setModal({ kind: 'plan' })}>
              <PencilIcon size={14} />
              Editar
            </button>
          )}
        >
          {plan.length
            ? <MealPlanCard slots={plan} />
            : <EmptyCard>Todavía no armaste tu plan. Tocá &quot;Editar&quot; para crear la primera franja.</EmptyCard>}
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
      </div>

      {modal?.kind === 'plan' && <MealPlanManager onClose={() => setModal(null)} />}
      {modal?.kind === 'extras' && <MealExtrasManager onClose={() => setModal(null)} />}
    </div>
  );
}
