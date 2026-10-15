import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { WeekStrip } from '../components/ui/WeekStrip';
import { BackupBanner } from '../components/ajustes/BackupBanner';
import { DayProgress } from '../components/hoy/DayProgress';
import { HabitRow } from '../components/hoy/HabitRow';
import { TrainingRow } from '../components/hoy/TrainingRow';
import { AgendaRow } from '../components/items/AgendaRow';
import { TaskRow } from '../components/items/TaskRow';
import { PendingRow } from '../components/items/PendingRow';
import { EmptyCard, Section } from '../components/ui/Section';
import { ListCard } from '../components/ui/ListCard';
import { Tray } from '@phosphor-icons/react';
import { GearIcon } from '../components/ui/Icons';
import { useData } from '../hooks/useData';
import { useItemForms } from '../hooks/useItemForms';
import { useSelectedDay } from '../hooks/useSelectedDay';
import { agendaDe, entrenoDe, pendVisible, pendientes, tareasDe } from '../lib/agenda';
import { habitDayMarks, habitDayPossible, habitDone } from '../lib/habits';
import { dayTurnos, typeColor } from '../lib/gym';
import { dayProgress } from '../lib/progress';
import { C } from '../lib/theme';
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
      habitsDone: habitDayMarks(data, day),
      habitsTotal: habitDayPossible(data),
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
        <BackupBanner />

        <WeekStrip
          selected={day}
          onSelect={setDay}
          onWeek={(weeks) => setDay(shiftWeek(day, weeks))}
          hasMark={(dISO) => tareasDe(data, dISO).length > 0 || agendaDe(data, dISO).length > 0}
        />

        <DayProgress
          className="span-7"
          progress={view.progress}
          tasksDone={view.done}
          tasksTotal={view.tareas.length}
          habitsDone={view.habitsDone}
          habitsTotal={view.habitsTotal}
        />

        {/* Columna de la derecha del progreso (escritorio): lo que tiene hora en el día.
            Agenda = citas y fechas anuales que caen en ese mes+día; Entreno = el turno del
            plan de Gimnasio. En el celular simplemente van una abajo de la otra. Si no hay
            ninguna de las dos, la columna no se queda vacía: dice que el día no tiene nada
            con horario (así la grilla no deja un hueco al lado del arco). */}
        <div className="hoy-side span-5">
          {view.citas.length > 0 && (
            <div className="hoy-agenda">
              <Section label="Agenda">
                {view.citas.map((e) => (
                  <AgendaRow key={e.id} item={e} onOpen={() => openEvent(e)} />
                ))}
              </Section>
            </div>
          )}
          {view.entreno && (
            <div className="hoy-entreno">
              <Section label="Entreno">
                {/* Entrenamientos dobles: un turno de descanso no se muestra (mismo criterio
                    que ya tenía un solo turno: "Entreno" solo aparece si hay algo que hacer),
                    pero el otro sí, aunque el día tenga los dos tipos mezclados. */}
                {dayTurnos(view.entreno).filter((t) => t.muscles.length > 0).map((t) => (
                  <TrainingRow key={t.slot} training={t} color={typeColor(data, t.muscles[0])} day={day} />
                ))}
              </Section>
            </div>
          )}
          {view.citas.length === 0 && !view.entreno && (
            <div className="hoy-sinhorario">Nada con horario para este día.</div>
          )}
        </div>

        <div className="hoy-tareas span-7">
          <ListCard title="Tareas" count={view.tareas.length ? `${view.done}/${view.tareas.length}` : null} accent={C.amber}>
            {view.tareas.length
              ? view.tareas.map((t) => (
                <TaskRow key={t.id} task={t} onOpen={() => openTask(t)} onToggle={() => toggleTask(t.id)} />
              ))
              : <EmptyCard>El día está limpio por ahora.</EmptyCard>}
          </ListCard>
        </div>

        <div className="hoy-habitos span-5">
          <ListCard title="Hábitos" count={data.habits.length ? `${view.habitsDone}/${view.habitsTotal}` : null} accent={C.green}>
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
          </ListCard>
        </div>

        {/* Sin fecha: el backlog. No depende del día elegido, salvo por un detalle — una
            pendiente COMPLETADA se ve solo el día en que se marcó (pendVisible), así que
            no queda para siempre tachada arriba de la bandeja. */}
        <section className="hoy-sinfecha">
          <div className="hoy-sinfecha-head">
            <Tray size={16} aria-hidden="true" />
            <span className="hoy-sinfecha-title">Sin fecha</span>
            {view.pend.length > 0 && <span className="hoy-sinfecha-n">{view.pend.length} pendientes</span>}
          </div>
          {view.pend.length
            ? (
              <div className="tray">
                {view.pend.map((t) => (
                  <PendingRow key={t.id} task={t} onOpen={() => openTask(t)} onToggle={() => toggleTask(t.id)} />
                ))}
              </div>
            )
            : <EmptyCard size="sm">Nada suelto por acá.</EmptyCard>}
        </section>
      </div>
    </div>
  );
}
