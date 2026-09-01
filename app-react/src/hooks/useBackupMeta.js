import { useSyncExternalStore } from 'react';
import { KEY_BACKUP_META, BACKUP_DAYS } from '../lib/backup';
import { iso, addDays, todayD } from '../lib/dates';

/* ----------------------------- METADATOS DE BACKUP (este dispositivo) -----------------------------
   Port de bkMeta()/bkSave()/bkSet() de app/js/ajustes.js. A propósito NO pasa por useData()/
   Firestore: es exactamente lo que hacía vanilla — lastExport, firstSeen y snoozeUntil son
   del teléfono, no de la cuenta, así que viven en localStorage y nunca viajan en el
   documento de Firestore (decisión 2: mismo modelo de datos, y ESTO no es parte del modelo).

   Un solo store a nivel de módulo (no un useState por componente) porque el banner se
   dibuja en dos pantallas a la vez (Hoy y Ajustes): exportar o posponer en una tiene que
   ocultarlo también en la otra sin pasar props entre ellas. */
let cached = null;
const listeners = new Set();

function readRaw() {
  try {
    const m = JSON.parse(localStorage.getItem(KEY_BACKUP_META));
    return (m && typeof m === 'object' && !Array.isArray(m)) ? m : {};
  } catch {
    return {};
  }
}

function persist() {
  try { localStorage.setItem(KEY_BACKUP_META, JSON.stringify(cached)); } catch { /* privado / sin cuota */ }
  listeners.forEach((fn) => fn());
}

// firstSeen marca desde cuándo se puede empezar a pedir backup a quien nunca exportó.
function ensureLoaded() {
  if (cached == null) cached = readRaw();
  if (!cached.firstSeen) {
    cached = { ...cached, firstSeen: new Date().toISOString() };
    persist();
  }
  return cached;
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function patch(changes) {
  cached = { ...ensureLoaded(), ...changes };
  persist();
}

// Solo para tests: la caché en memoria es a propósito (así el banner de Hoy y el de
// Ajustes ven siempre lo mismo sin pasarse props), pero eso significa que sobrevive entre
// tests del mismo archivo aunque se limpie localStorage. Sin este reset, el segundo test
// que lea el aviso vería el estado que dejó el primero, no el de su propio localStorage.
export function resetBackupMetaForTests() {
  cached = null;
  listeners.clear();
}

export function useBackupMeta() {
  const meta = useSyncExternalStore(subscribe, ensureLoaded, ensureLoaded);

  return {
    meta,
    // Reinicia el contador: se llama justo después de exportar.
    markExported(exportedAt) { patch({ lastExport: exportedAt, snoozeUntil: null }); },
    // "Recordarme en una semana": vuelve a aparecer recién dentro de BACKUP_DAYS.
    snoozeAWeek() { patch({ snoozeUntil: iso(addDays(todayD(), BACKUP_DAYS)) }); },
  };
}
