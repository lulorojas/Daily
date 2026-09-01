import { describe, expect, it } from 'vitest';
import {
  BACKUP_FORMAT, backupPayload, validateBackup, backupHasData,
  backupDaysSince, backupShouldWarn, backupWarnText,
} from './backup';
import { emptyDoc, fullDoc } from '../test/fixtures';

/* ============================================================================
   BACKUP

   Port de la parte pura de app/js/ajustes.js: armar el JSON de exportación, validarlo al
   importar, y decidir cuándo avisar que hace falta uno nuevo. Comparado contra la lógica
   real de vanilla en src/compat/vanilla.test.js (bkHasData, validateBackup vía backupPayload
   ya estaban ahí desde la etapa 2); acá se agrega lo que hacía falta para la etapa 4: el
   aviso semanal (backupShouldWarn/backupWarnText), que no existía todavía.
   ============================================================================ */

describe('backupPayload', () => {
  it('arma el sobre con app/format/exportedAt y los datos tal cual', () => {
    const doc = fullDoc();
    const p = backupPayload(doc, '2026-01-01T00:00:00.000Z');
    expect(p).toEqual({ app: 'daily', format: BACKUP_FORMAT, exportedAt: '2026-01-01T00:00:00.000Z', data: doc });
  });

  it('sin exportedAt explícito, usa la hora actual', () => {
    const p = backupPayload(emptyDoc());
    expect(new Date(p.exportedAt).getTime()).not.toBeNaN();
  });
});

describe('validateBackup', () => {
  const validText = () => JSON.stringify(backupPayload(fullDoc(), '2026-01-01T00:00:00.000Z'));

  it('un backup válido pasa y devuelve los datos', () => {
    const r = validateBackup(validText());
    expect(r.ok).toBe(true);
    expect(r.data.items).toEqual(fullDoc().items);
    expect(r.exportedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('JSON roto: mensaje específico, no genérico', () => {
    const r = validateBackup('{esto no es json');
    expect(r.ok).toBe(false);
    expect(r.msg).toMatch(/JSON válido/);
  });

  it('un array (JSON válido, pero no un objeto de backup)', () => {
    expect(validateBackup('[]').ok).toBe(false);
  });

  it('app distinto de "daily"', () => {
    const p = JSON.parse(validText());
    p.app = 'otra-app';
    expect(validateBackup(JSON.stringify(p)).ok).toBe(false);
  });

  it('sin format', () => {
    const p = JSON.parse(validText());
    delete p.format;
    const r = validateBackup(JSON.stringify(p));
    expect(r.ok).toBe(false);
    expect(r.msg).toMatch(/formato/);
  });

  it('format de otra versión', () => {
    const p = JSON.parse(validText());
    p.format = 999;
    const r = validateBackup(JSON.stringify(p));
    expect(r.ok).toBe(false);
    expect(r.msg).toMatch(/otra versión/);
  });

  it('sin data adentro', () => {
    const p = JSON.parse(validText());
    delete p.data;
    expect(validateBackup(JSON.stringify(p)).ok).toBe(false);
  });

  it('data sin items (incompleto)', () => {
    const p = JSON.parse(validText());
    delete p.data.items;
    const r = validateBackup(JSON.stringify(p));
    expect(r.ok).toBe(false);
    expect(r.msg).toMatch(/agenda/);
  });

  it('data sin habits/habitLog (incompleto)', () => {
    const p = JSON.parse(validText());
    delete p.data.habits;
    const r = validateBackup(JSON.stringify(p));
    expect(r.ok).toBe(false);
    expect(r.msg).toMatch(/hábitos/);
  });

  it('data sin gym (incompleto)', () => {
    const p = JSON.parse(validText());
    delete p.data.gym;
    const r = validateBackup(JSON.stringify(p));
    expect(r.ok).toBe(false);
    expect(r.msg).toMatch(/gimnasio/);
  });
});

describe('backupHasData', () => {
  it('una cuenta nueva no tiene nada que respaldar', () => {
    expect(backupHasData(emptyDoc())).toBe(false);
  });

  it('con cualquier dato ya vale la pena', () => {
    expect(backupHasData(fullDoc())).toBe(true);
  });
});

describe('backupDaysSince', () => {
  it('sin marca, Infinity', () => {
    expect(backupDaysSince(null)).toBe(Infinity);
  });

  it('marca inválida, Infinity', () => {
    expect(backupDaysSince('no es una fecha')).toBe(Infinity);
  });

  it('cuenta días de calendario, no de 24hs', () => {
    // 23:50 de un día a 00:10 del siguiente son 20 minutos, pero SÍ es "un día distinto".
    // Con horas locales (no UTC) para que el resultado no dependa de la zona horaria de
    // quien corre el test.
    const ayerTarde = new Date(2026, 2, 9, 23, 50).toISOString();
    const hoyTemprano = new Date(2026, 2, 10, 0, 10);
    expect(backupDaysSince(ayerTarde, hoyTemprano)).toBe(1);
  });
});

describe('backupShouldWarn / backupWarnText', () => {
  const hoy = '2026-03-10';

  it('sin datos, nunca avisa', () => {
    expect(backupShouldWarn(emptyDoc(), {}, hoy)).toBe(false);
  });

  it('con datos y sin backup nunca hecho, avisa a los 7 días de firstSeen', () => {
    const doc = fullDoc();
    expect(backupShouldWarn(doc, { firstSeen: '2026-03-03T00:00:00.000Z' }, hoy)).toBe(true);
    expect(backupShouldWarn(doc, { firstSeen: '2026-03-04T00:00:00.000Z' }, hoy)).toBe(false);
  });

  it('con un backup reciente, no avisa', () => {
    const doc = fullDoc();
    expect(backupShouldWarn(doc, { lastExport: '2026-03-09T00:00:00.000Z' }, hoy)).toBe(false);
  });

  it('con un backup viejo (7 días o más), avisa', () => {
    const doc = fullDoc();
    expect(backupShouldWarn(doc, { lastExport: '2026-03-03T00:00:00.000Z' }, hoy)).toBe(true);
  });

  it('pospuesto ("Recordarme en una semana"): no avisa hasta que pase la fecha', () => {
    const doc = fullDoc();
    const meta = { lastExport: '2026-02-01T00:00:00.000Z', snoozeUntil: '2026-03-15' };
    expect(backupShouldWarn(doc, meta, hoy)).toBe(false);
    expect(backupShouldWarn(doc, meta, '2026-03-15')).toBe(true);
  });

  it('el texto cambia según si alguna vez se exportó', () => {
    expect(backupWarnText({}, hoy)).toBe('Todavía no hiciste ningún backup de tus datos.');
    expect(backupWarnText({ lastExport: '2026-03-03T00:00:00.000Z' }, hoy)).toBe('Hace 7 días que no hacés backup.');
  });
});
