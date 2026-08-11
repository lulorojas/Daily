import { C } from './theme';
import { DOW_FULL, MONTHS, addDays, dow, iso, parseISO, todayD } from './dates';

/* ----------------------------- ÍTEMS DE AGENDA (presentación) -----------------------------
   Los tres tipos viven en la misma lista `items` del documento y se distinguen por `kind`.
   Acá están las decisiones de presentación que en vanilla estaban sueltas en utils.js:
   qué color y qué etiqueta le toca a cada tipo, y los textos de la cabecera de Hoy.

   Todo son funciones puras. Ninguna toca el DOM ni React, así que los tests las corren
   directo y los tests de compat/ las comparan contra la app vanilla. */

export const ITEM_COLOR = { tarea: C.amber, cita: C.coral, anual: C.violet };
export const ITEM_LABEL = { tarea: 'Tarea', cita: 'Cita', anual: 'Anual' };

/* Saludo de la cabecera, según la hora. Recibe la fecha por parámetro (con `new Date()`
   por defecto) para que un test pueda pararse a las 3 de la mañana sin tocar el reloj. */
export function saludo(now = new Date()) {
  const hh = now.getHours();
  if (hh < 6) return 'Buenas noches';
  if (hh < 13) return 'Buenos días';
  if (hh < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

// Título cuando el día que se mira NO es hoy: "Mañana", "Ayer", o el día de la semana.
export function dayTitle(d) {
  const t = todayD();
  if (iso(d) === iso(addDays(t, 1))) return 'Mañana';
  if (iso(d) === iso(addDays(t, -1))) return 'Ayer';
  return DOW_FULL[dow(d)];
}

// La línea chica de arriba de todo: "Lunes 10 de Agosto" (el CSS la pone en mayúsculas).
export function dayKicker(d) {
  return `${DOW_FULL[dow(d)]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/* La bajada de la cabecera. Mirando hoy cuenta lo que queda; mirando otro día explica qué
   se puede hacer ahí. Copiado tal cual, incluido el singular/plural de cada palabra. */
export function hoySubtitle({ pendingTasks, pendingHabits, isToday, isFuture }) {
  if (isToday) {
    const t = `${pendingTasks} ${pendingTasks === 1 ? 'tarea' : 'tareas'}`;
    const h = `${pendingHabits} ${pendingHabits === 1 ? 'hábito' : 'hábitos'}`;
    return `Tenés ${t} y ${h} para hoy.`;
  }
  return isFuture ? 'Así viene este día.' : 'Podés marcar los hábitos de este día.';
}

/* El texto de abajo de la barra de progreso.

   OJO, esto es un port fiel de una rareza de la app vanilla: allá se calculaba un `msg`
   con cuatro variantes según el porcentaje ("¡Completaste todo! Día redondo.", "¡Buen
   ritmo!…"), pero la plantilla lo usaba así:

     ${total ? doneUnits+' de '+total+' completados' : msg}

   …o sea que con total>0 SIEMPRE gana el conteo, y `msg` solo aparece cuando no hay nada
   que contar — el único caso en que `msg` vale 'No tenés nada agendado para este día.'.
   Las otras tres variantes son código muerto: nunca se dibujaron en pantalla.

   Se replica el comportamiento observable, no el código muerto. Si algún día se quieren
   los mensajes de aliento, es una decisión de producto, no una corrección de este port. */
export function progressMessage({ done, total }) {
  return total ? `${done} de ${total} completados` : 'No tenés nada agendado para este día.';
}

// La semana (lunes a domingo) que contiene un día, como fechas ISO.
export function weekDays(mondayDate) {
  return Array.from({ length: 7 }, (_, i) => iso(addDays(mondayDate, i)));
}

// Correr el día que se está mirando N semanas, para las flechas de la tira.
export function shiftWeek(dISO, weeks) {
  return iso(addDays(parseISO(dISO), weeks * 7));
}
