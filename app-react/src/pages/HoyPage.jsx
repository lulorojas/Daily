import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { WeekStrip } from '../components/hoy/WeekStrip';
import { DayProgress } from '../components/hoy/DayProgress';
import { HabitRow } from '../components/hoy/HabitRow';
import { TrainingRow } from '../components/hoy/TrainingRow';
import { AgendaRow } from '../components/items/AgendaRow';
import { TaskRow } from '../components/items/TaskRow';
import { PendingRow } from '../components/items/PendingRow';
import { EmptyCard, Section } from '../components/ui/Section';
import { GearIcon } from '../components/ui/Icons';
import { useData } from '../hooks/useData';
import { useItemForms } from '../hooks/useItemForms';
import { useSelectedDay } from '../hooks/useSelectedDay';
import { agendaDe, entrenoDe, pendVisible, pendientes, tareasDe } from '../lib/agenda';
import { habitDone } from '../lib/habits';
import { typeColor } from '../lib/gym';
import { dayProgress } from '../lib/progress';
import { parseISO, todayISO } from '../lib/dates';
import { dayKicker, dayTitle, hoySubtitle, saludo, shiftWeek } from '../lib/items';
import { setHabitSlot, toggleTaskDone } from '../store/mutations';

/* ============================================================================
   HOY

   Port de viewHoy(). Un día por vez: la tira semanal elige cuál, y todo lo de abajo habla
   de ese día. Abajo de todo, la bandeja de pendientes sin fecha, que es la única sección
   que NO depende del día elegido.

   Qué estado tiene esta pantalla: ninguno propio. El día que se está mirando vive en la
   URL (?d=…, ver useSelectedDay) y los datos vienen del store. Todo lo demás son cuentas
   sobre esas dos cosas, hechas con las funciones puras de lib/ — las mismas que usa la app
   vanilla, comparadas una por una en src/compat/.

   Regla que se replica tal cual: una tarea con fecha se muestra SOLO en su fecha, aunque
   haya vencido. No se arrastra a hoy ni se mueve nunca. Vive en tareasDe(), que filtra por
   `x.date === dISO` y nada más; acá no hay ninguna excepción que lo contradiga.
   ============================================================================ */
export function HoyPage() {
  const { data, update } = useData();
  const [day, setDay] = useSelectedDay();
  const { openTask, openEvent } = useItemForms();

  const tISO = todayISO();
  const isToday = day === tISO;
  const isFuture = day > tISO;

  /* Todas las derivaciones juntas y memorizadas: son funciones puras sobre el documento,
     así que solo hace falta rehacerlas cuando cambia el documento o el día. */
  const view = useMemo(() => {
    const tareas = tareasDe(data, day);
    const habits = data.habits;
    return {
      tareas,
      citas: agendaDe(data, day),
      entreno: entrenoDe(data, day),
      pend: pendientes(data).filter((t) => pendVisible(t, day)),
      progress: dayProgress(data, day),
      done: tareas.filter((x) => x.done).length,
      pendingHabits: habits.filter((h) => !habitDone(data, h.id, day)).length,
    };
  }, [data, day]);

  const d = parseISO(day);
  const toggleTask = (id) => update((draft) => toggleTaskDone(draft, id, day));
  const markHabit = (id, slot) => update((draft) => setHabitSlot(draft, id, day, slot));

  return (
    <div className="view">
      <div className="head">
        <div className="htop">
          <div className="htop-main">
            <div className="kicker accent">{dayKicker(d)}</div>
            <h1>{isToday ? saludo() : dayTitle(d)}</h1>
            <div className="sub">
              {hoySubtitle({
                pendingTasks: view.tareas.length - view.done,
                pendingHabits: view.pendingHabits,
                isToday,
                isFuture,
              })}
            </div>
          </div>
          {/* Ajustes se lleva puesto el día que estabas mirando, así volver te deja donde
              estabas y no en hoy. Es lo mismo que hace la barra de abajo con sus links. */}
          <Link className="gear" to={{ pathname: '/ajustes', search: `?d=${day}` }} title="Ajustes" aria-label="Ajustes">
            <GearIcon />
          </Link>
        </div>
      </div>

      <div className="body">
        <WeekStrip
          data={data}
          selected={day}
          onSelect={setDay}
          onWeek={(weeks) => setDay(shiftWeek(day, weeks))}
        />

        <DayProgress progress={view.progress} />

        {/* Agenda: citas del día y fechas anuales que caen en ese mes+día. Solo aparece si
            hay algo — un rótulo "Agenda" sobre la nada no dice nada. */}
        {view.citas.length > 0 && (
          <Section label="Agenda">
            {view.citas.map((e) => (
              <AgendaRow key={e.id} item={e} onOpen={() => openEvent(e)} />
            ))}
          </Section>
        )}

        <Section label="Tareas" note={view.tareas.length ? `${view.done}/${view.tareas.length}` : null}>
          {view.tareas.length
            ? view.tareas.map((t) => (
              <TaskRow key={t.id} task={t} onOpen={() => openTask(t)} onToggle={() => toggleTask(t.id)} />
            ))
            : <EmptyCard>El día está limpio por ahora.</EmptyCard>}
        </Section>

        {view.entreno && (
          <Section label="Entreno">
            <TrainingRow training={view.entreno} color={typeColor(data, view.entreno.type)} />
          </Section>
        )}

        <Section label="Hábitos">
          {data.habits.length
            ? data.habits.map((hb) => (
              <HabitRow
                key={hb.id}
                data={data}
                habit={hb}
                dISO={day}
                /* Los días futuros se ven pero no se marcan: no se puede tomar agua mañana. */
                editable={!isFuture}
                onMark={markHabit}
              />
            ))
            : <EmptyCard>Todavía no creaste hábitos.</EmptyCard>}
        </Section>

        {/* Sin fecha: el backlog. No depende del día elegido, salvo por un detalle — una
            pendiente COMPLETADA se ve solo el día en que se marcó (pendVisible), así que
            no queda para siempre tachada arriba de la bandeja. */}
        <Section label="Sin fecha" note={view.pend.length ? `${view.pend.length} pendientes` : null}>
          {view.pend.length
            ? (
              <div className="tray">
                {view.pend.map((t) => (
                  <PendingRow key={t.id} task={t} onOpen={() => openTask(t)} onToggle={() => toggleTask(t.id)} />
                ))}
              </div>
            )
            : <EmptyCard small>Nada suelto por acá.</EmptyCard>}
        </Section>
      </div>
    </div>
  );
}
