import { useState } from 'react';
import { WeekStrip } from '../components/ui/WeekStrip';
import { HabitRow } from '../components/habitos/HabitRow';
import { BestStreakBanner } from '../components/habitos/BestStreakBanner';
import { EmptyCard, Section } from '../components/ui/Section';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useData } from '../hooks/useData';
import { useHabitForms } from '../hooks/useHabitForms';
import { habitDayMarks, habitDayPossible, habitDoneCount, habitBestStreak } from '../lib/habits';
import { habitsSubtitle, habitsWhen } from '../lib/habitsView';
import { parseISO, todayISO } from '../lib/dates';
import { shiftWeek } from '../lib/items';
import { setHabitSlot, deleteHabit } from '../store/mutations';

/* ============================================================================
   HÁBITOS

   Port de viewHabitos(). Una tira semanal propia (verde, no la de Hoy) para poder marcar
   días pasados, la racha más larga destacada arriba, y la lista completa con su menú de
   editar/eliminar por fila.

   `habitDate` es estado de ESTA pantalla y no de la URL: a diferencia del día de Hoy y
   Calendario, que viajan juntos porque las dos pantallas hablan del mismo día, acá no hay
   nadie más mirando esta fecha. Es la misma decisión que el offset de semana en Gimnasio.
   ============================================================================ */
export function HabitosPage() {
  const { data, update } = useData();
  const { openHabit } = useHabitForms();
  const [habitDate, setHabitDate] = useState(todayISO());
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const tISO = todayISO();
  const isToday = habitDate === tISO;
  const isFuture = habitDate > tISO;
  const total = data.habits.length;
  const marks = habitDayMarks(data, habitDate);
  const possible = habitDayPossible(data);

  let best = 0, bestName = '';
  data.habits.forEach((h) => {
    const s = habitBestStreak(data, h.id);
    if (s > best) { best = s; bestName = h.name; }
  });

  const markHabit = (id, slot) => update((draft) => setHabitSlot(draft, id, habitDate, slot));

  return (
    <div className="view">
      <div className="head">
        <div className="htop">
          <div className="htop-main">
            <h1>Hábitos</h1>
            <div className="sub">{habitsSubtitle({ total, isToday, marks, possible, day: parseISO(habitDate).getDate() })}</div>
          </div>
          <button type="button" className="pillbtn habits" onClick={() => openHabit(null)}>Nuevo</button>
        </div>
      </div>

      <div className="body">
        <WeekStrip
          selected={habitDate}
          onSelect={setHabitDate}
          onWeek={(weeks) => setHabitDate(shiftWeek(habitDate, weeks))}
          hasMark={(dISO) => total > 0 && habitDoneCount(data, dISO) > 0}
        />

        {best > 0 && <BestStreakBanner best={best} name={bestName} />}

        <Section label="Mis hábitos" note={habitsWhen(isToday, isFuture)}>
          {total === 0 ? (
            <EmptyCard size="lg">Todavía no hay hábitos.<br />Creá el primero con el botón Nuevo.</EmptyCard>
          ) : (
            <>
              {data.habits.map((hb) => (
                <HabitRow
                  key={hb.id}
                  data={data}
                  habit={hb}
                  dISO={habitDate}
                  editable={!isFuture}
                  onMark={markHabit}
                  open={openMenuId === hb.id}
                  onToggleMenu={() => setOpenMenuId((cur) => (cur === hb.id ? null : hb.id))}
                  onEdit={() => { setOpenMenuId(null); openHabit(hb); }}
                  onDelete={() => { setOpenMenuId(null); setDeleting(hb); }}
                />
              ))}
              <button type="button" className="dashed" style={{ marginTop: '2px' }} onClick={() => openHabit(null)}>+ Nuevo hábito</button>
            </>
          )}
        </Section>
      </div>

      {deleting && (
        <ConfirmDialog
          title="¿Eliminar este hábito?"
          description="Se borra el hábito y su historial de marcas."
          okLabel="Eliminar"
          onConfirm={() => { update((draft) => deleteHabit(draft, deleting.id)); setDeleting(null); }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
