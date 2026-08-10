import { addDays, iso, mondayOf, todayD } from '../lib/dates';

/* Documentos de ejemplo para los tests. Las fechas son relativas a hoy porque las rachas
   y los períodos ("últimos 7 días") se miden contra la fecha actual: un fixture con
   fechas fijas empezaría a fallar solo con el paso del tiempo. */

export const TODAY = iso(todayD());
export const YESTERDAY = iso(addDays(todayD(), -1));
export const TOMORROW = iso(addDays(todayD(), 1));
export const ago = (n) => iso(addDays(todayD(), -n));
export const thisMonday = iso(mondayOf(todayD()));
export const mondayAgo = (n) => iso(addDays(mondayOf(todayD()), -7 * n));

/* Un documento completo y realista: los tres tipos de ítem, hábitos con multi-check,
   marcas repartidas, plan semanal de tres semanas, cargas, rutinas y peso corporal. */
export function fullDoc() {
  return {
    v: 2,
    items: [
      { id: 'i1', kind: 'tarea', title: 'Tarea sin fecha', desc: 'del backlog', date: null, time: null, done: false },
      { id: 'i2', kind: 'tarea', title: 'Tarea de hoy', desc: '', date: TODAY, time: '09:00', done: false },
      { id: 'i3', kind: 'tarea', title: 'Tarea de hoy hecha', desc: '', date: TODAY, time: null, done: true, doneAt: TODAY },
      { id: 'i4', kind: 'tarea', title: 'Tarea vencida', desc: '', date: ago(40), time: null, done: false },
      { id: 'i5', kind: 'cita', title: 'Dentista', desc: 'llevar estudios', date: TODAY, time: '10:00' },
      { id: 'i6', kind: 'anual', title: 'Cumple de Ana', desc: '', date: '1990-' + TODAY.slice(5), time: null },
      { id: 'i7', kind: 'tarea', title: 'Pendiente completada', desc: '', date: null, time: null, done: true, doneAt: YESTERDAY },
    ],
    habits: [
      { id: 'h1', name: 'Tomar agua', detail: '8 vasos', color: '#86D9A0', icon: 'agua', timesPerDay: 3 },
      { id: 'h2', name: 'Leer', detail: '', color: '#6FD2D2', icon: 'libro', timesPerDay: 1 },
    ],
    habitLog: {
      [TODAY]: { h1: 2, h2: 1 },
      [ago(1)]: { h1: 3, h2: 1 },
      [ago(2)]: { h1: 3, h2: 1 },
      [ago(3)]: { h1: 1, h2: 1 },
      [ago(9)]: { h2: 1 },
    },
    gym: {
      customTypes: [
        { id: 'ct1', name: 'Pecho', color: '#FF9B93' },
        { id: 'ct2', name: 'Espalda', color: '#6FD2D2' },
      ],
      weekPlans: {
        [thisMonday]: [
          { type: 'Pecho', done: true }, { type: 'Descanso', done: false },
          { type: 'Espalda', done: true }, { type: 'Descanso', done: false },
          { type: 'Pecho', done: false }, { type: 'Descanso', done: false },
          { type: 'Descanso', done: false },
        ],
        [mondayAgo(1)]: [
          { type: 'Pecho', done: true }, { type: 'Espalda', done: true },
          { type: 'Descanso', done: false }, { type: 'Pecho', done: true },
          { type: 'Descanso', done: false }, { type: 'Descanso', done: false },
          { type: 'Descanso', done: false },
        ],
        [mondayAgo(2)]: [
          { type: 'Espalda', done: true }, { type: 'Descanso', done: false },
          { type: 'Descanso', done: false }, { type: 'Descanso', done: false },
          { type: 'Descanso', done: false }, { type: 'Descanso', done: false },
          { type: 'Descanso', done: true },   // día marcado pero de descanso: NO es entreno
        ],
      },
      lifts: [
        { id: 'l1', name: 'Sentadilla', unit: 'kg', color: '#86D9A0', history: [
          { date: ago(30), weight: 60 }, { date: ago(10), weight: 70 }, { date: ago(2), weight: 72.5 },
        ] },
        { id: 'l2', name: 'Press banca', unit: 'kg', color: '#6FD2D2', history: [
          { date: ago(5), weight: 40 },
        ] },
        { id: 'l3', name: 'Peso muerto', unit: 'kg', color: '#B49BE8', history: [
          // Cargado fuera de orden a propósito: el historial guarda el orden de carga.
          { date: ago(3), weight: 100 }, { date: ago(20), weight: 90 },
        ] },
      ],
      routines: [
        { id: 'r1', name: 'Rutina A', days: [
          { id: 'd1', name: 'Pecho', exercises: [
            { id: 'e1', name: 'Press banca', detail: '4x8' },
            { id: 'e2', name: 'Aperturas', detail: '' },
          ] },
          { id: 'd2', name: 'Espalda', exercises: [] },
        ] },
        { id: 'r2', name: 'Rutina B', days: [] },
      ],
      bodyWeights: [
        { id: 'b1', kg: 72.5, date: ago(20) },
        { id: 'b2', kg: 71.8, date: ago(2) },
        { id: 'b3', kg: 73, date: ago(45) },
      ],
    },
    onboarding: { seen: true },
  };
}

// Documento mínimo, como el de una cuenta recién creada.
export function emptyDoc() {
  return {
    v: 2,
    items: [],
    gym: { customTypes: [], weekPlans: {}, lifts: [], routines: [], bodyWeights: [] },
    habits: [],
    habitLog: {},
    onboarding: { seen: false },
  };
}

/* Documentos "raros" que normalize() tiene que saber acomodar. Cada uno prueba una
   transformación distinta de las que hace la app actual al leer. */
export function weirdDocs() {
  return {
    'documento vacío': {},
    'sin la clave gym': { v: 2, items: [], habits: [], habitLog: {} },
    'gym a medias': { gym: { lifts: [{ id: 'l', name: 'x', history: [] }] } },
    'hábito sin timesPerDay': { habits: [{ id: 'h', name: 'x', color: '#fff', icon: 'agua' }], habitLog: {} },
    'hábito con timesPerDay 0': { habits: [{ id: 'h', name: 'x', timesPerDay: 0 }], habitLog: {} },
    'marcas legacy en true': { habits: [{ id: 'h', name: 'x', timesPerDay: 1 }], habitLog: { '2024-01-01': { h: true } } },
    'marcas en false': { habits: [{ id: 'h', name: 'x', timesPerDay: 1 }], habitLog: { '2024-01-01': { h: false, otro: 2 } } },
    'marcas en cero': { habitLog: { '2024-01-01': { h: 0, h2: 3 } } },
    'marcas como string': { habitLog: { '2024-01-01': { h: '2' } } },
    'onboarding viejo (welcomeSeen)': { onboarding: { welcomeSeen: true, tips: ['a'] } },
    'onboarding sin seen ni datos': { onboarding: {} },
    'onboarding sin seen pero con datos': { onboarding: {}, items: [{ id: 'x', kind: 'tarea', title: 't' }] },
    'sin onboarding y con hábitos': { habits: [{ id: 'h', name: 'x', timesPerDay: 1 }] },
    'sin onboarding y sin nada': { items: [], habits: [] },
    'con campos de la migración v1': {
      v: 2, items: [], habits: [], habitLog: {},
      migratedFrom: 'daily.v1', migratedAt: '2024-03-01T10:00:00.000Z',
    },
    'con un campo que esta versión no conoce': { v: 2, items: [], campoDelFuturo: { a: 1 } },
    'v con otro número': { v: 99, items: [] },
    'completo': fullDoc(),
  };
}
