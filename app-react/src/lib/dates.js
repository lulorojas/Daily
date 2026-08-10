/* ----------------------------- FECHAS -----------------------------
   Port literal de las date utils de app/js/utils.js. No se "mejoró" nada a propósito:
   los datos guardados dependen de que estas funciones den exactamente lo mismo.

   Dos cosas que parecen detalle y no lo son:

   1. Todo trabaja en HORA LOCAL, nunca en UTC. `iso()` arma el string a mano con
      getFullYear/getMonth/getDate justamente para no pasar por toISOString(), que
      convierte a UTC y en Argentina (UTC-3) te devuelve el día anterior si son las 22 hs.
      Un usuario que marca un hábito a las 23:00 tiene que verlo en el día que marcó.

   2. La semana empieza el LUNES: dow() devuelve 0 para lunes, no para domingo. Todo
      weekPlans está indexado por el lunes de esa semana. */

// Date → 'YYYY-MM-DD' en hora local.
export function iso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// 'YYYY-MM-DD' → Date a medianoche local.
export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() + n);
  return x;
}

export function todayD() {
  const x = new Date();
  x.setHours(0, 0, 0, 0);
  return x;
}

export function todayISO() { return iso(todayD()); }
export function tomorrowISO() { return iso(addDays(todayD(), 1)); }

// 0 = lunes. (getDay() da 0 para domingo; el +6 %7 lo corre.)
export function dow(d) { return (d.getDay() + 6) % 7; }

// El lunes de la semana a la que pertenece esa fecha. Es la clave de weekPlans.
export function mondayOf(d) { return addDays(d, -dow(d)); }

export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const DOW_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const DOW_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const DOW_MINI = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function shortDate(s) {
  const d = parseISO(s);
  return DOW_SHORT[dow(d)] + ' ' + d.getDate() + '/' + (d.getMonth() + 1);
}

export function fmtDateLong(s) {
  const d = parseISO(s);
  const base = DOW_FULL[dow(d)] + ' ' + d.getDate() + ' de ' + MONTHS[d.getMonth()].toLowerCase();
  return d.getFullYear() !== todayD().getFullYear() ? base + ' de ' + d.getFullYear() : base;
}

// Mismo mes y día, sin importar el año. Lo usan las fechas anuales (cumpleaños).
export function sameMonthDay(dISO, eISO) {
  const a = parseISO(dISO), b = parseISO(eISO);
  return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Entero → sin decimales; con decimales → uno solo. Los pesos se guardan así.
export function fmtNum(n) { return n % 1 === 0 ? String(n) : n.toFixed(1); }
