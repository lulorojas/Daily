import { describe, expect, it } from 'vitest';
import {
  dateForWhen, deleteCopy, eventFormValues, eventKindNote,
  taskFormValues, validateEvent, validateTask, whenKey,
} from './itemForms';
import { todayISO, tomorrowISO } from './dates';

/* Las reglas de los dos formularios de agenda, sin formulario de por medio. Son las mismas
   validaciones que hacía validateForm() en la app vanilla, con los mismos textos. */

describe('el chip "Cuándo" se deduce de la fecha', () => {
  it('hoy, mañana y sin fecha tienen su chip', () => {
    expect(whenKey(todayISO())).toBe('hoy');
    expect(whenKey(tomorrowISO())).toBe('manana');
    expect(whenKey(null)).toBe('sin');
  });

  it('cualquier otra fecha cae en "otra"', () => {
    expect(whenKey('2020-01-05')).toBe('otra');
    expect(whenKey('2030-12-31')).toBe('otra');
  });

  it('y a la inversa: cada chip sabe qué fecha poner', () => {
    expect(dateForWhen('hoy')).toBe(todayISO());
    expect(dateForWhen('manana')).toBe(tomorrowISO());
    expect(dateForWhen('sin')).toBeNull();
  });
});

describe('valores iniciales de una tarea', () => {
  it('una tarea nueva sin fecha indicada arranca en hoy', () => {
    expect(taskFormValues(null, undefined)).toEqual({ title: '', desc: '', date: todayISO(), time: null });
  });

  it('null NO es lo mismo que no pasar nada: arranca sin fecha', () => {
    expect(taskFormValues(null, null).date).toBeNull();
  });

  it('con una fecha, la respeta', () => {
    expect(taskFormValues(null, '2026-03-05').date).toBe('2026-03-05');
  });

  it('editando, salen los datos de la tarea', () => {
    const t = { id: 'x', kind: 'tarea', title: 'Pan', desc: 'de la esquina', date: '2026-03-05', time: '09:00', done: false };
    expect(taskFormValues(t)).toEqual({ title: 'Pan', desc: 'de la esquina', date: '2026-03-05', time: '09:00' });
  });

  it('una tarea sin descripción ni hora no rompe', () => {
    const t = { id: 'x', kind: 'tarea', title: 'Pan', date: null, time: null, done: false };
    expect(taskFormValues(t)).toEqual({ title: 'Pan', desc: '', date: null, time: null });
  });
});

describe('valores iniciales de una cita', () => {
  it('una cita nueva nace como cita, en el día que se estaba mirando', () => {
    expect(eventFormValues(null, '2026-03-05')).toEqual({
      kind: 'cita', title: '', desc: '', date: '2026-03-05', time: null,
    });
  });

  it('sin fecha indicada, hoy', () => {
    expect(eventFormValues(null).date).toBe(todayISO());
  });

  it('editando una anual, conserva el tipo', () => {
    const r = { id: 'r', kind: 'anual', title: 'Cumple', desc: '', date: '1990-08-10', time: null };
    expect(eventFormValues(r).kind).toBe('anual');
    expect(eventFormValues(r).date).toBe('1990-08-10');
  });
});

describe('validación de la tarea', () => {
  it('sin título no se guarda, y lo explica', () => {
    expect(validateTask({ title: '' })).toEqual({ title: 'Poné un título para la tarea.' });
  });

  it('un título de puros espacios tampoco vale', () => {
    expect(validateTask({ title: '   ' })).toEqual({ title: 'Poné un título para la tarea.' });
  });

  it('con título, no hay errores', () => {
    expect(validateTask({ title: 'Comprar pan' })).toEqual({});
  });
});

describe('validación de la cita', () => {
  it('sin título lo dice con la palabra "cita"', () => {
    expect(validateEvent({ title: '', date: '2026-03-05', kind: 'cita' }).title)
      .toBe('Poné un título para la cita.');
  });

  it('siendo anual, el mensaje cambia', () => {
    expect(validateEvent({ title: '', date: '2026-03-05', kind: 'anual' }).title)
      .toBe('Poné un título para la fecha anual.');
  });

  it('la fecha es obligatoria', () => {
    expect(validateEvent({ title: 'Dentista', date: null, kind: 'cita' }))
      .toEqual({ date: 'Elegí una fecha.' });
  });

  it('puede faltar todo a la vez', () => {
    const errores = validateEvent({ title: '', date: null, kind: 'cita' });
    expect(Object.keys(errores).sort()).toEqual(['date', 'title']);
  });

  it('completa, no hay errores', () => {
    expect(validateEvent({ title: 'Dentista', date: '2026-03-05', kind: 'cita' })).toEqual({});
  });
});

describe('textos', () => {
  it('la aclaración del tipo cambia con el tipo', () => {
    expect(eventKindNote('anual')).toBe('Se repite cada año en esta fecha (cumpleaños, feriados).');
    expect(eventKindNote('cita')).toBe('Ocurre una sola vez en la fecha elegida.');
  });

  it('cada tipo se borra con su propia advertencia', () => {
    expect(deleteCopy('tarea').title).toBe('¿Eliminar esta tarea?');
    expect(deleteCopy('cita').description).toBe('Se quita del calendario.');
    expect(deleteCopy('anual').description).toBe('Se quita del calendario y deja de repetirse cada año.');
  });
});
