/* ----------------------------- NOTIFICACIONES: RESUMEN AGREGADO -----------------------------
   Sin equivalente en vanilla (etapa 6). Pedido explícito: UNA notificación por horario con
   un resumen de lo pendiente, nunca una por ítem individual. Este archivo calcula ESE
   resumen — nada de FCM ni de Firestore acá adentro — para que sea la misma cuenta la que
   corre en dos lugares distintos:

     1. notifications/send.js (Node, sin bundler): el cron de GitHub Actions importa este
        archivo tal cual, con un import relativo — es JS puro, sin React ni nada del DOM,
        así que corre igual de un lado que del otro.
     2. tests de Vitest, acá mismo, con los mismos fixtures que el resto de lib/.

   Las cuatro fuentes son las que pidió Lulo: Hoy (tareas con fecha de hoy), Calendario
   (citas + anuales de hoy — agendaDe() ya cubre las dos), Hábitos (sin marcar) y Gimnasio
   (turnos de hoy sin marcar como hechos, ver dayTurnos() en gym.js — cuenta cada turno,
   no el día, por la misma razón que gymHistory: dos turnos son dos entrenamientos). */
import { agendaDe, entrenoDe, tareasDe } from './agenda';
import { dayTurnos, REST } from './gym';
import { habitDone } from './habits';

// Cuántos ítems sin marcar hay hoy, por fuente. No incluye NADA de lo ya hecho.
export function pendingCounts(state, dISO) {
  const tareas = tareasDe(state, dISO).filter((t) => !t.done).length;
  const agenda = agendaDe(state, dISO).length; // citas/anuales: ocurren, no se "marcan".
  const habitos = state.habits.filter((h) => !habitDone(state, h.id, dISO)).length;
  const entrenoDia = entrenoDe(state, dISO);
  const entreno = entrenoDia ? dayTurnos(entrenoDia).filter((t) => t.type !== REST && !t.done).length : 0;
  return { tareas, agenda, habitos, entreno };
}

export function hasPending(counts) {
  return counts.tareas > 0 || counts.agenda > 0 || counts.habitos > 0 || counts.entreno > 0;
}

/* El texto de la notificación. null si no hay nada pendiente — el cron no manda nada en
   ese caso (ver notifications/send.js): un aviso de "no tenés nada pendiente" cuatro
   veces por día no es un resumen útil, es ruido. */
export function summaryText(counts) {
  if (!hasPending(counts)) return null;
  const partes = [];
  if (counts.tareas) partes.push(`${counts.tareas} ${counts.tareas === 1 ? 'tarea' : 'tareas'}`);
  if (counts.agenda) partes.push(`${counts.agenda} ${counts.agenda === 1 ? 'cita' : 'citas'}`);
  if (counts.entreno) partes.push(counts.entreno === 1 ? 'un entreno' : `${counts.entreno} entrenos`);
  if (counts.habitos) partes.push(`${counts.habitos} ${counts.habitos === 1 ? 'hábito' : 'hábitos'}`);
  return `Pendiente hoy: ${partes.join(', ')}.`;
}
