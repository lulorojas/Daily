import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { WeekPlan } from '../components/gym/WeekPlan';
import { BodyWeightSection } from '../components/gym/BodyWeightSection';
import { BodyWeightModal } from '../components/gym/BodyWeightModal';
import { BodyManageModal } from '../components/gym/BodyManageModal';
import { CoreLogModal } from '../components/gym/CoreLogModal';
import { LiftCard } from '../components/gym/LiftCard';
import { LiftModal } from '../components/gym/LiftModal';
import { LiftDetailModal } from '../components/gym/LiftDetailModal';
import { LiftRecordModal } from '../components/gym/LiftRecordModal';
import { TypesManager } from '../components/gym/TypesManager';
import { Section } from '../components/ui/Section';
import { BookIcon } from '../components/ui/Icons';
import { useData } from '../hooks/useData';
import { REST, coreLogList, dayTurnos, weekKey, weekPlanFor } from '../lib/gym';
import { gymSubtitle, weekOffsetForDay, weekRangeLabel } from '../lib/gymView';
import { isValidISO } from '../hooks/useSelectedDay';
import { addDays, dow, iso, parseISO, todayD } from '../lib/dates';
import { addSecondTurno, removeSecondTurno, setWeekDayType, toggleWeekDayDone } from '../store/mutations';
import { C, tint } from '../lib/theme';

/* ============================================================================
   GIMNASIO

   Port de viewGym(). Cuatro bloques: plan semanal, peso corporal, cargas por ejercicio y
   la entrada a Rutinas (que es su propia pantalla, con sus propias rutas — ver GymPage al
   final del archivo de rutas).

   Todo el estado de "qué modal está abierto" vive acá, no en un contexto: a diferencia de
   los formularios de agenda (que abren seis lugares distintos, incluida la barra de abajo),
   acá todo se abre desde esta única pantalla. Un objeto `modal` con forma variable
   (`{ kind, ...datos }`) hace de máquina de estados chiquita: como mucho hay uno abierto
   a la vez, así que no hace falta más que una variable. */
export function GymPage() {
  const { data, update } = useData();
  const [params] = useSearchParams();

  /* Si se llega acá desde el entreno de Hoy (?d=el día que se estaba mirando), la semana
     arranca en la que corresponde a ese día. Es solo el valor INICIAL: a partir de ahí las
     flechas navegan libres y el offset es enteramente de esta pantalla, igual que el mes
     en CalendarioPage. El offset de Gimnasio no se comparte con nadie, así que no hace
     falta que viva en la URL como el día de Hoy/Calendario. */
  const [offset, setOffset] = useState(() => {
    const raw = params.get('d');
    return isValidISO(raw) ? weekOffsetForDay(raw) : 0;
  });
  const [expandido, setExpandido] = useState(null);
  const [modal, setModal] = useState(null);

  const plan = weekPlanFor(data, offset);
  // Entrenamientos dobles: se cuentan TURNOS, no días — un día con sus dos turnos hechos
  // son dos entrenamientos, no uno. dayTurnos() ya sabe leer type2/done2 si existen.
  const turnos = plan.flatMap(dayTurnos).filter((t) => t.type !== REST);
  const doneCount = turnos.filter((t) => t.done).length;
  const weekLabel = weekRangeLabel(offset);

  /* Abs y movilidad (etapa 6, corregido después de la primera entrega): pedido explícito
     de que viva "dentro de la planificación semanal", no en una sección aparte más abajo.
     El dato (gym.coreLog) sigue siendo una lista independiente de weekPlans — lo que
     cambia acá es que se filtra a la semana que se está mirando (mismo offset que el plan
     de turnos), así que navegar de semana con las flechas de WeekPlan también navega estos
     registros. */
  const weekStartISO = weekKey(offset);
  const weekEndISO = iso(addDays(parseISO(weekStartISO), 6));
  const coreEntries = coreLogList(data).filter((e) => e.date >= weekStartISO && e.date <= weekEndISO);
  // Si se está mirando la semana actual, el día por defecto para un registro nuevo es hoy;
  // si no, el lunes de esa semana (no hay un "hoy" que tenga sentido en otra semana).
  const defaultDayIndex = offset === 0 ? dow(todayD()) : 0;

  const changeWeek = (dir) => { setOffset((o) => o + dir); setExpandido(null); };

  const nRut = data.gym.routines.length;
  const maxCur = Math.max(1, ...data.gym.lifts.map((l) => l.history[l.history.length - 1].weight));

  return (
    <div className="view">
      <div className="head">
        <h1>Gimnasio</h1>
        <div className="sub">{gymSubtitle(offset, doneCount, turnos.length)}</div>
      </div>

      <div className="body">
        <WeekPlan
          data={data}
          plan={plan}
          weekLabel={weekLabel}
          isCurrentWeek={offset === 0}
          expandido={expandido}
          onExpandir={setExpandido}
          onSemana={changeWeek}
          onTipo={(i, slot, type) => update((draft) => setWeekDayType(draft, weekKey(offset), i, type, slot))}
          onHecho={(i, slot) => update((draft) => toggleWeekDayDone(draft, weekKey(offset), i, slot))}
          onAddTurno={(i) => update((draft) => addSecondTurno(draft, weekKey(offset), i))}
          onRemoveTurno={(i) => { setExpandido(null); update((draft) => removeSecondTurno(draft, weekKey(offset), i)); }}
          onAdministrar={() => setModal({ kind: 'types' })}
          coreEntries={coreEntries}
          onNewCore={() => setModal({ kind: 'core-new' })}
          onEditCore={(entry) => setModal({ kind: 'core-edit', entry })}
        />

        <BodyWeightSection
          data={data}
          onNew={() => setModal({ kind: 'body-new' })}
          onManage={() => setModal({ kind: 'body-manage' })}
        />

        <Section label="Cargas por ejercicio" note={null} action={<span className="sectcount">{data.gym.lifts.length} ejercicios</span>}>
          {data.gym.lifts.map((l) => (
            <LiftCard key={l.id} lift={l} maxCur={maxCur} onOpen={() => setModal({ kind: 'lift-detail', liftId: l.id })} />
          ))}
          <button type="button" className="dashed" onClick={() => setModal({ kind: 'lift-new' })}>+ Agregar ejercicio</button>
        </Section>

        <Section label="Rutinas">
          <Link
            className="agcard rutentry"
            to="/gym/rutinas"
            style={{ background: `linear-gradient(135deg,${tint(C.rose, '2E')},${tint(C.rose, '0F')})`, border: `1px solid ${tint(C.rose, '3D')}` }}
          >
            <div className="rutentry-icon" style={{ background: C.rose }}><BookIcon /></div>
            <div className="grow">
              <div className="rutentry-title">Mis rutinas</div>
              <div className="rutentry-sub">{nRut ? `${nRut} ${nRut === 1 ? 'guardada' : 'guardadas'}` : 'Todavía no creaste ninguna'}</div>
            </div>
            {/* Acá vanilla usa el carácter "›" como texto, no un ícono (a diferencia de
                RutRow, donde sí es un SVG) — se replica igual, glifo por glifo. */}
            <span className="rutentry-chev">&#8250;</span>
          </Link>
        </Section>
      </div>

      {modal?.kind === 'types' && <TypesManager onClose={() => setModal(null)} />}

      {modal?.kind === 'lift-new' && <LiftModal onClose={() => setModal(null)} />}

      {modal?.kind === 'lift-detail' && (
        <LiftDetailModal
          lift={data.gym.lifts.find((l) => l.id === modal.liftId)}
          onClose={() => setModal(null)}
          onLogWeight={() => setModal({ kind: 'lift-new' })}
          onEditRecord={(index) => setModal({ kind: 'lift-record', liftId: modal.liftId, index })}
        />
      )}

      {modal?.kind === 'lift-record' && (
        <LiftRecordModal
          lift={data.gym.lifts.find((l) => l.id === modal.liftId)}
          index={modal.index}
          onClose={() => setModal({ kind: 'lift-detail', liftId: modal.liftId })}
        />
      )}

      {modal?.kind === 'body-new' && <BodyWeightModal onClose={() => setModal(null)} />}
      {modal?.kind === 'body-edit' && <BodyWeightModal record={modal.record} onClose={() => setModal(null)} />}
      {modal?.kind === 'body-manage' && (
        <BodyManageModal
          onClose={() => setModal(null)}
          onNew={() => setModal({ kind: 'body-new' })}
          onEdit={(record) => setModal({ kind: 'body-edit', record })}
        />
      )}

      {modal?.kind === 'core-new' && (
        <CoreLogModal weekStart={weekStartISO} defaultDayIndex={defaultDayIndex} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'core-edit' && (
        <CoreLogModal entry={modal.entry} weekStart={weekStartISO} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
