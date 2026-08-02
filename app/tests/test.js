const { boot, ok, done, d, iso, TODAY, TOMORROW, ANUAL_DATE, ago, V1_RAW } = require('./harness');

/* =================== REGRESIÓN etapas 1–3.5 =================== */
console.log('\nR. Regresión de las etapas anteriores');
{
  const w = boot(V1_RAW, null);
  const s = JSON.parse(w.localStorage.getItem('daily.v2'));
  const by = t => s.items.find(x => x.title === t);

  // etapa 1: migración + daily.v1 intacta
  ok('daily.v1 queda intacta (byte a byte)', w.localStorage.getItem('daily.v1') === V1_RAW);
  ok('migra las 8 items sin perder nada',    s.items.length === 8);
  ok('tarea sin fecha → date null',          by('Tarea sin fecha').kind==='tarea' && by('Tarea sin fecha').date===null);
  ok('tarea con hora conserva hora y done',  by('Tarea con hora').time==='14:30' && by('Tarea con hora').done===true);
  ok('puntual → cita, anual → anual',        by('Dentista').kind==='cita' && by('Cumple de Ana').kind==='anual');
  ok('citas/anuales sin estado',             !('done' in by('Dentista')) && !('done' in by('Cumple de Ana')));

  // etapa 1: agenda deriva bien; vencida no se arrastra a hoy
  ok('tareasDe(hoy) = 2',      w.tareasDe(TODAY).length === 2);
  ok('agendaDe(hoy) = 3',      w.agendaDe(TODAY).length === 3);
  ok('la vencida no está en hoy', !w.tareasDe(TODAY).some(x=>x.title==='Tarea vencida'));
  ok('la vencida sigue en su fecha', w.tareasDe('2020-01-05').length === 1);
  ok('pendientes = 1 sin fecha', w.pendientes().length === 1);

  // vistas de todas las pestañas
  for (const [tab, marca] of [['hoy','PENDIENTES'],['calendario','ESTE DÍA'],['gym','PLAN SEMANAL'],['habitos','Hábitos'],['progreso','RESUMEN']]) {
    w.ev('ui').tab = tab; w.ev('ui').hoySub = null; w.render();
    ok('render "'+tab+'"', w.document.getElementById('app').innerHTML.includes(marca));
  }
  // 5 pestañas, sin "tareas"
  w.ev('ui').tab='hoy'; w.render();
  ok('5 pestañas, sin Tareas', (w.document.getElementById('app').innerHTML.match(/data-act="tab"/g)||[]).length===5 && !w.document.getElementById('app').innerHTML.includes('data-tab="tareas"'));

  // validación etapa 1
  w.taskModal(null, TODAY);
  w.document.querySelector('[data-act="modal-save"]').click();
  ok('tarea sin título avisa y no guarda', w.overlay ? true : (w.document.querySelectorAll('.ferr').length===1 && w.document.getElementById('overlay').classList.contains('show')));
  w.closeModal();
}
{
  // etapa 2: rutinas + peso corporal
  const w = boot(null, null);
  const s = w.ev('state');
  ok('gym.routines vacía al arrancar', Array.isArray(s.gym.routines) && s.gym.routines.length===0);
  ok('gym.bodyWeights vacía al arrancar', Array.isArray(s.gym.bodyWeights) && s.gym.bodyWeights.length===0);
  s.gym.routines.push({ id:'R', name:'R1', days:[{ id:'D', name:'Pecho', exercises:[{ id:'E', name:'Press', detail:'4x8' }] }] });
  s.gym.bodyWeights.push({ id:'B1', kg:72.5, date:ago(3) }, { id:'B2', kg:72, date:TODAY });
  w.ev('ui').tab='gym'; w.ev('ui').gymSub='rutinas'; w.render();
  ok('rutinas renderiza', w.document.getElementById('app').innerHTML.includes('Mis rutinas'));
  w.ev('ui').gymSub=null; w.render();
  ok('sección peso corporal', w.document.getElementById('app').innerHTML.includes('PESO CORPORAL'));
  ok('sparkline existe', typeof w.ev('sparkline')==='function' && w.ev('sparkline([1,2,3],"#fff",100,40)').includes('<polyline'));
  ok('sparkline serie vacía no rompe', w.ev('sparkline([],"#fff",100,40)').includes('<svg'));
}
{
  // etapa 3 + 3.5: progreso read-only + helpers
  const w = boot(V1_RAW, null);
  ok('gymRanking existe', typeof w.ev('gymRanking')==='function');
  ok('gymTypeStreaks existe', typeof w.ev('gymTypeStreaks')==='function');
  ok('liftGains existe', typeof w.ev('liftGains')==='function');
  ok('habitBestStreak existe', typeof w.ev('habitBestStreak')==='function');
  ok('donut existe', typeof w.ev('donut')==='function');
  ok('donut vacío devuelve ""', w.ev('donut([],100,10)')==='' && w.ev('donut([{value:0,color:"#fff"}],100,10)')==='');

  w.ev('ui').tab='progreso';
  const stAntes = JSON.stringify(w.ev('state'));
  const lsAntes = w.localStorage.getItem('daily.v2');
  for (const p of ['semana','mes','ano','todo']) { w.ev('ui').progPeriod=p; w.render(); }
  ok('progreso no toca el estado', JSON.stringify(w.ev('state'))===stAntes);
  ok('progreso no toca localStorage', w.localStorage.getItem('daily.v2')===lsAntes);
  const h = w.document.getElementById('app').innerHTML;
  ok('tablero con los 7 bloques', ['RESUMEN','PESO CORPORAL','FRECUENCIA','BALANCE MUSCULAR','PROGRESO DE CARGAS','MAPA DE HÁBITOS','CUMPLIMIENTO'].every(x=>h.includes(x)));
}

/* =================== ETAPA 4 =================== */

// jsdom no implementa createObjectURL ni la descarga: se stubean para observar el <a>.
function bootBk(seedV1, seedV2, bkMetaRaw) {
  const b = boot(seedV1, seedV2);
  if (bkMetaRaw) b.localStorage.setItem('daily.backup', bkMetaRaw);
  b.URL.createObjectURL = () => 'blob:fake';
  b.URL.revokeObjectURL = () => {};
  b.anchors = [];
  const orig = b.document.createElement.bind(b.document);
  b.document.createElement = tag => { const el = orig(tag); if (tag === 'a' || tag === 'input') b.anchors.push(el); return el; };
  return b;
}

/* ---------- 25. exportar ---------- */
console.log('\n25. Exportar');
try {
  const wb = bootBk(V1_RAW, null);
  const p = wb.backupPayload();
  ok('el backup declara la app',        p.app === 'daily');
  ok('el format sigue al esquema (2)',  p.format === 2 && p.format === wb.ev('state').v);
  ok('trae fecha de exportación ISO',   typeof p.exportedAt === 'string' && !isNaN(new Date(p.exportedAt).getTime()));
  ok('los datos van bajo data',         p.data && Array.isArray(p.data.items));
  ok('el backup incluye la agenda',     p.data.items.length === wb.ev('state').items.length);
  ok('el backup incluye hábitos y log', Array.isArray(p.data.habits) && typeof p.data.habitLog === 'object');
  ok('el backup incluye el gimnasio',   p.data.gym && Array.isArray(p.data.gym.lifts) && p.data.gym.weekPlans && typeof p.data.gym.weekPlans === 'object');
  ok('el backup incluye rutinas',       Array.isArray(p.data.gym.routines));
  ok('el backup incluye peso corporal', Array.isArray(p.data.gym.bodyWeights));
  ok('el backup incluye los tipos',     Array.isArray(p.data.gym.customTypes));
  ok('el backup es serializable',       typeof JSON.stringify(p) === 'string');
  ok('el backup NO trae metadatos del dispositivo', !('lastExport' in p.data) && !p.data.config);
} catch (e) { ok('payload del export', false, e.message); }

try {
  const wb = bootBk(V1_RAW, null);
  const ok1 = wb.doExport();
  const a = wb.anchors.filter(x => x.tagName === 'A').pop();
  ok('doExport devuelve true',        ok1 === true);
  ok('el archivo se llama fijo',      a && a.download === 'daily-backup.json');
  ok('descarga un blob',              a && a.href.startsWith('blob:'));
  ok('guarda la fecha del export',    !!JSON.parse(wb.localStorage.getItem('daily.backup')).lastExport);
  ok('exportar no toca daily.v1',     wb.localStorage.getItem('daily.v1') === V1_RAW);
} catch (e) { ok('doExport', false, e.message); }

/* ---------- 26. round-trip ---------- */
console.log('\n26. Round-trip export → modificar → import');
try {
  const wrt = bootBk(V1_RAW, null);
  const s = wrt.ev('state');
  s.gym.routines.push({ id:'R1', name:'Rutina 1', days:[{ id:'D1', name:'Pecho', exercises:[{ id:'E1', name:'Press', detail:'4x8-12' }] }] });
  s.gym.bodyWeights.push({ id:'BW', kg:72.5, date:TODAY });
  s.habits.push({ id:'HX', name:'Leer', detail:'', color:'#C77DFF', icon:'libro' });
  s.habitLog[TODAY] = Object.assign(s.habitLog[TODAY] || {}, { HX:true });
  wrt.save();

  const json = JSON.stringify(wrt.backupPayload());
  const antes = JSON.stringify(wrt.ev('state'));

  const s2 = wrt.ev('state');
  s2.items = []; s2.habits = []; s2.habitLog = {};
  s2.gym.routines = []; s2.gym.bodyWeights = []; s2.gym.lifts = [];
  wrt.save();
  ok('los datos quedaron destruidos', JSON.stringify(wrt.ev('state')) !== antes);

  wrt.importFromText(json);
  ok('import pide confirmación', wrt.document.querySelector('[data-act="confirm-yes"]') !== null);
  ok('antes de confirmar no toca nada', wrt.ev('state').items.length === 0);
  wrt.document.querySelector('[data-act="confirm-yes"]').click();

  ok('round-trip: el estado vuelve exacto',   JSON.stringify(wrt.ev('state')) === antes);
  ok('round-trip: persiste en daily.v2',      wrt.localStorage.getItem('daily.v2') === antes);
  ok('round-trip: vuelven las rutinas',       wrt.ev('state').gym.routines[0].days[0].exercises[0].detail === '4x8-12');
  ok('round-trip: vuelve el peso corporal',   wrt.ev('state').gym.bodyWeights[0].kg === 72.5);
  ok('round-trip: vuelven hábitos y marcas',  wrt.ev('state').habits.some(h => h.id === 'HX') && wrt.ev('state').habitLog[TODAY].HX === true);
  ok('round-trip: vuelven las cargas',        wrt.ev('state').gym.lifts.length > 0);
  ok('import no toca daily.v1',               wrt.localStorage.getItem('daily.v1') === V1_RAW);
  ok('vuelve a Hoy tras importar', wrt.ev('ui').hoySub === null);
  ok('la vista se rehizo con los datos', wrt.document.getElementById('app').innerHTML.length > 500);
} catch (e) { ok('round-trip', false, e.message); }

try {
  const wc = bootBk(V1_RAW, null);
  const antes = JSON.stringify(wc.ev('state'));
  wc.importFromText(JSON.stringify({ app:'daily', format:2, exportedAt:new Date().toISOString(), data:{ v:2, items:[], habits:[], habitLog:{}, gym:{} } }));
  wc.document.querySelector('[data-act="confirm-no"]').click();
  ok('cancelar no reemplaza nada', JSON.stringify(wc.ev('state')) === antes);
  ok('cancelar cierra el cartel',  wc.document.querySelector('[data-act="confirm-yes"]') === null);
} catch (e) { ok('cancelar import', false, e.message); }

/* ---------- 27. archivos inválidos ---------- */
console.log('\n27. Import de archivos inválidos');
const malos = [
  ['no es JSON',              'esto no es json {{{',                                        'no es un JSON válido'],
  ['JSON pero es un número',  '42',                                                         'formato de un backup'],
  ['JSON pero es un array',   '[1,2,3]',                                                    'formato de un backup'],
  ['objeto vacío',            '{}',                                                         'no es un backup de Daily'],
  ['de otra app',             '{"app":"otra","format":2,"data":{}}',                        'no es un backup de Daily'],
  ['sin format',              '{"app":"daily","data":{"items":[]}}',                        'falta la versión del formato'],
  ['format futuro',           '{"app":"daily","format":99,"data":{"items":[]}}',            'otra versión de la app'],
  ['sin data',                '{"app":"daily","format":2}',                                 'no trae datos'],
  ['data no es objeto',       '{"app":"daily","format":2,"data":"hola"}',                   'no trae datos'],
  ['sin items',               '{"app":"daily","format":2,"data":{"habits":[]}}',            'falta la agenda'],
  ['items no es array',       '{"app":"daily","format":2,"data":{"items":"x"}}',            'falta la agenda'],
  ['sin hábitos',             '{"app":"daily","format":2,"data":{"items":[]}}',             'faltan los hábitos'],
  ['sin gym',                 '{"app":"daily","format":2,"data":{"items":[],"habits":[],"habitLog":{}}}', 'falta el gimnasio'],
  ['archivo vacío',           '',                                                           'no es un JSON válido'],
];
try {
  const wi = bootBk(V1_RAW, null);
  const antes = JSON.stringify(wi.ev('state'));
  const lsAntes = wi.localStorage.getItem('daily.v2');
  for (const [label, txt, esperado] of malos) {
    const r = wi.validateBackup(txt);
    ok('rechaza: ' + label, r.ok === false && r.msg.includes(esperado), 'msg: ' + (r.msg || '(sin msg)'));
  }
  for (const [label, txt] of malos) {
    const res = wi.importFromText(txt);
    const cartel = wi.document.querySelector('[data-act="notice-ok"]');
    ok('import inválido avisa (' + label + ')', res === false && cartel !== null);
    ok('import inválido no pide confirmación (' + label + ')', wi.document.querySelector('[data-act="confirm-yes"]') === null);
    if (cartel) cartel.click();
  }
  ok('ningún inválido tocó el estado',    JSON.stringify(wi.ev('state')) === antes);
  ok('ningún inválido tocó daily.v2',     wi.localStorage.getItem('daily.v2') === lsAntes);
  ok('ningún inválido tocó daily.v1',     wi.localStorage.getItem('daily.v1') === V1_RAW);
} catch (e) { ok('archivos inválidos', false, e.message); }

try {
  const wm = bootBk(null, null);
  wm.importFromText('{"app":"daily","format":2,"exportedAt":"2026-01-01T00:00:00.000Z","data":{"v":2,"items":[],"habits":[],"habitLog":{},"gym":{}}}');
  wm.document.querySelector('[data-act="confirm-yes"]').click();
  const g = wm.ev('state').gym;
  ok('un backup mínimo se normaliza', Array.isArray(g.routines) && Array.isArray(g.bodyWeights) && Array.isArray(g.customTypes) && !!g.weekPlans);
  wm.ev('ui').tab = 'gym'; wm.render();
  ok('y la app renderiza igual', wm.document.getElementById('app').innerHTML.includes('PLAN SEMANAL'));
} catch (e) { ok('backup mínimo', false, e.message); }

/* ---------- 28. aviso de backup ---------- */
console.log('\n28. Aviso de backup semanal');
const hace = n => new Date(d.getTime() - n*86400000).toISOString();
try {
  const w1 = bootBk(null, null, JSON.stringify({ firstSeen:hace(60), lastExport:hace(2) }));
  ok('hace 2 días: no avisa', w1.bkShouldWarn() === false);
  const w2 = bootBk(null, null, JSON.stringify({ firstSeen:hace(60), lastExport:hace(6) }));
  ok('hace 6 días: no avisa', w2.bkShouldWarn() === false);
  const w3 = bootBk(null, null, JSON.stringify({ firstSeen:hace(60), lastExport:hace(7) }));
  ok('hace 7 días: avisa', w3.bkShouldWarn() === true);
  const w4 = bootBk(null, null, JSON.stringify({ firstSeen:hace(60), lastExport:hace(30) }));
  ok('hace 30 días: avisa', w4.bkShouldWarn() === true);
  const w5 = bootBk(null, null, JSON.stringify({ firstSeen:new Date().toISOString() }));
  ok('nunca exportó pero recién instalada: no molesta', w5.bkShouldWarn() === false);
  const w6 = bootBk(null, null, JSON.stringify({ firstSeen:hace(10) }));
  ok('nunca exportó y hace 10 días: avisa', w6.bkShouldWarn() === true);
  ok('el texto lo dice', w6.bkWarnText().includes('Todavía no hiciste ningún backup'));
  ok('con lastExport dice hace cuánto', w4.bkWarnText().includes('30 días'));
} catch (e) { ok('cuándo avisa', false, e.message); }

try {
  const w0 = bootBk(null, null, JSON.stringify({ firstSeen:hace(90) }));
  const s = w0.ev('state');
  s.items = []; s.habits = []; s.habitLog = {};
  s.gym.lifts = []; s.gym.routines = []; s.gym.bodyWeights = [];
  ok('sin datos que perder: no avisa', w0.bkShouldWarn() === false);
  s.items.push({ id:'q', kind:'tarea', title:'x', desc:'', date:null, time:null, done:false });
  ok('con un dato: ya avisa', w0.bkShouldWarn() === true);
} catch (e) { ok('aviso sin datos', false, e.message); }

try {
  const wb = bootBk(null, null, JSON.stringify({ firstSeen:hace(60), lastExport:hace(9) }));
  wb.ev('ui').tab = 'hoy'; wb.render();
  const h = wb.document.getElementById('app').innerHTML;
  ok('el banner sale en Hoy',            h.includes('data-act="bk-export"') && h.includes('9 días'));
  ok('el banner no bloquea la vista',    h.includes('data-act="day-sel"') && h.includes('PENDIENTES'));
  ok('el banner se puede posponer',      h.includes('data-act="bk-snooze"'));
  wb.document.querySelector('[data-act="bk-export"]').click();
  ok('exportar desde el banner resetea', wb.bkShouldWarn() === false);
  ok('y el banner desaparece',           !wb.document.getElementById('app').innerHTML.includes('data-act="bk-export"'));
  ok('quedó la fecha de hoy',            wb.bkDaysSince(JSON.parse(wb.localStorage.getItem('daily.backup')).lastExport) === 0);
} catch (e) { ok('banner en Hoy', false, e.message); }

try {
  const ws = bootBk(null, null, JSON.stringify({ firstSeen:hace(60), lastExport:hace(9) }));
  ws.ev('ui').tab = 'hoy'; ws.render();
  ws.document.querySelector('[data-act="bk-snooze"]').click();
  ok('posponer oculta el aviso',        ws.bkShouldWarn() === false);
  ok('posponer guarda hasta cuándo',    !!JSON.parse(ws.localStorage.getItem('daily.backup')).snoozeUntil);
  ok('el aviso vuelve en 7 días',       JSON.parse(ws.localStorage.getItem('daily.backup')).snoozeUntil === iso(new Date(d.getTime() + 7*86400000)));
  ok('el banner ya no se dibuja',       !ws.document.getElementById('app').innerHTML.includes('data-act="bk-snooze"'));
} catch (e) { ok('posponer', false, e.message); }

try {
  const wi2 = bootBk(null, null, JSON.stringify({ firstSeen:hace(60) }));
  wi2.importFromText(JSON.stringify({ app:'daily', format:2, exportedAt:hace(1), data:{ v:2, items:[], habits:[], habitLog:{}, gym:{} } }));
  wi2.document.querySelector('[data-act="confirm-yes"]').click();
  ok('importar registra la fecha del backup', wi2.bkDaysSince(JSON.parse(wi2.localStorage.getItem('daily.backup')).lastExport) === 1);
} catch (e) { ok('fecha tras importar', false, e.message); }

/* ---------- 29. pantalla de Ajustes ---------- */
console.log('\n29. Pantalla de Ajustes');
try {
  const wa = bootBk(V1_RAW, null);
  wa.ev('ui').tab = 'hoy'; wa.ev('ui').hoySub = null; wa.render();
  ok('Hoy tiene el engranaje', wa.document.querySelector('[data-act="ajustes-open"]') !== null);
  wa.document.querySelector('[data-act="ajustes-open"]').click();
  const h = wa.document.getElementById('app').innerHTML;
  ok('abre Ajustes',                wa.ev('ui').hoySub === 'ajustes' && h.includes('Ajustes'));
  ok('ofrece exportar e importar',  h.includes('data-act="bk-export"') && h.includes('data-act="bk-import"'));
  ok('dice el nombre del archivo',  h.includes('daily-backup.json'));
  ok('dice cuándo fue el último',   h.includes('Último backup'));
  ok('Ajustes no ocupa una pestaña', (h.match(/data-act="tab"/g) || []).length === 5 && !h.includes('data-tab="ajustes"'));
  wa.document.querySelector('[data-act="ajustes-back"]').click();
  ok('atrás vuelve a Hoy', wa.ev('ui').hoySub === null && wa.document.getElementById('app').innerHTML.includes('PENDIENTES'));
} catch (e) { ok('pantalla de ajustes', false, e.message); }

/* ---------- 30. regresión final ---------- */
console.log('\n30. Regresión tras la etapa 4');
try {
  const wf = bootBk(V1_RAW, null);
  for (const [tab, marca] of [['hoy','PENDIENTES'],['calendario','ESTE DÍA'],['gym','PLAN SEMANAL'],['habitos','Hábitos'],['progreso','RESUMEN']]) {
    wf.ev('ui').tab = tab; wf.ev('ui').hoySub = null; wf.render();
    ok('la pestaña "' + tab + '" sigue andando', wf.document.getElementById('app').innerHTML.includes(marca));
  }
  wf.ev('ui').tab = 'gym'; wf.ev('ui').gymSub = 'rutinas'; wf.render();
  ok('Rutinas sigue abriendo', wf.document.getElementById('app').innerHTML.includes('Mis rutinas'));
  wf.ev('ui').gymSub = null;
  ok('la agenda sigue derivando bien', wf.tareasDe(TODAY).length === 2 && wf.agendaDe(TODAY).length === 3);
  wf.ev('ui').tab = 'calendario'; wf.ev('ui').calSel = TODAY; wf.render();
  wf.document.querySelector('[data-act="event-open"]').click();
  wf.document.querySelector('[data-act="item-delete"]').click();
  ok('confirmDelete sigue pidiendo confirmación', wf.document.querySelector('[data-act="confirm-yes"]') !== null);
  ok('su botón sigue diciendo Eliminar',          wf.document.querySelector('[data-act="confirm-yes"]').textContent.trim() === 'Eliminar');
  wf.document.querySelector('[data-act="confirm-yes"]').click();
  ok('y sigue borrando', wf.itemById('r1') === undefined);
} catch (e) { ok('regresión etapa 4', false, e.message); }

/* ---------- 31. pendiente completada desaparece al día siguiente ---------- */
console.log('\n31. Pendientes completadas');
try {
  const w = boot(null, null);
  const s = w.ev('state');
  s.items = [
    { id:'p1', kind:'tarea', title:'Pend activa', desc:'', date:null, time:null, done:false },
    { id:'p2', kind:'tarea', title:'Pend hecha hoy', desc:'', date:null, time:null, done:true, doneAt:TODAY },
    { id:'p3', kind:'tarea', title:'Pend hecha ayer', desc:'', date:null, time:null, done:true, doneAt:ago(1) },
    { id:'p4', kind:'tarea', title:'Pend hecha sin fecha', desc:'', date:null, time:null, done:true },
  ];
  w.save();
  ok('pendientes() sigue devolviendo todas', w.pendientes().length === 4);
  // pendVisible se evalúa contra el día que se está mirando.
  ok('activa: se ve cualquier día',            w.pendVisible(w.itemById('p1'), TODAY) === true && w.pendVisible(w.itemById('p1'), ago(1)) === true);
  ok('completada hoy: se ve mirando hoy',      w.pendVisible(w.itemById('p2'), TODAY) === true);
  ok('completada hoy: NO se ve mirando otro día', w.pendVisible(w.itemById('p2'), ago(1)) === false && w.pendVisible(w.itemById('p2'), ago(3)) === false);
  ok('completada ayer: no se ve mirando hoy',  w.pendVisible(w.itemById('p3'), TODAY) === false);
  ok('completada sin doneAt: nunca se ve',     w.pendVisible(w.itemById('p4'), TODAY) === false && w.pendVisible(w.itemById('p4'), ago(1)) === false);

  // en la vista de hoy: activa + la que se completó hoy; NO la de ayer
  w.ev('ui').tab = 'hoy'; w.ev('ui').hoySub = null; w.ev('ui').daySel = TODAY; w.render();
  let h = w.document.getElementById('app').innerHTML;
  ok('bandeja de hoy: muestra activa y la de hoy', h.includes('Pend activa') && h.includes('Pend hecha hoy'));
  ok('bandeja de hoy: oculta la de ayer',          !h.includes('Pend hecha ayer'));

  // al navegar la tira a otro día, la completada hoy YA NO aparece; la activa sí
  w.ev('ui').daySel = ago(2); w.render();
  h = w.document.getElementById('app').innerHTML;
  ok('otro día: la completada no aparece', !h.includes('Pend hecha hoy'));
  ok('otro día: la activa (backlog) sigue', h.includes('Pend activa'));

  // marcar una pendiente usa el día que se está mirando como doneAt
  w.ev('ui').daySel = TODAY; w.render();
  w.document.querySelector('[data-act="task-toggle"][data-id="p1"]').click();
  ok('marcar hoy: doneAt = hoy', w.itemById('p1').done === true && w.itemById('p1').doneAt === TODAY);
  w.document.querySelector('[data-act="task-toggle"][data-id="p1"]').click();
  ok('descompletar borra doneAt', w.itemById('p1').done === false && !('doneAt' in w.itemById('p1')));
  // marcar mientras se mira otro día: queda en ESE día
  w.ev('ui').daySel = ago(2); w.render();
  w.document.querySelector('[data-act="task-toggle"][data-id="p1"]').click();
  ok('marcar mirando otro día: doneAt = ese día', w.itemById('p1').doneAt === ago(2));
  ok('y se sigue viendo en ese día', w.document.getElementById('app').innerHTML.includes('Pend activa'));
  w.ev('ui').daySel = TODAY; w.render();
  ok('pero desde hoy ya no aparece', !w.document.getElementById('app').innerHTML.includes('Pend activa'));
} catch (e) { ok('pendientes completadas', false, e.message); }

/* ---------- 32. gráfico de línea interactivo ---------- */
console.log('\n32. Gráfico interactivo (lineChart)');
try {
  const w = boot(null, null);
  ok('lineChart existe', typeof w.ev('lineChart') === 'function');
  const svg = w.ev(`lineChart([{date:'${ago(4)}',v:60},{date:'${ago(2)}',v:62.5},{date:'${TODAY}',v:65}],'#FF6B6B',300,86,{unit:'kg'})`);
  ok('envuelve en .chartwrap con tooltip', svg.includes('class="chartwrap"') && svg.includes('class="charttip"'));
  ok('dibuja un punto tocable por registro', (svg.match(/data-act="chart-pt"/g) || []).length === 3);
  ok('cada punto lleva su etiqueta fecha+valor', svg.includes('62.5 kg') && svg.includes('data-lbl'));
  ok('dibuja líneas guía de mín/máx', (svg.match(/stroke-dasharray/g) || []).length >= 2);
  ok('serie vacía no rompe', w.ev(`lineChart([],'#fff',100,40)`).includes('chartwrap'));
  ok('un solo punto no rompe', w.ev(`lineChart([{date:'${TODAY}',v:70}],'#fff',100,40)`).includes('data-act="chart-pt"'));

  // el tooltip aparece al tocar un punto y se cierra al tocar otra vez
  const s = w.ev('state');
  s.gym.bodyWeights = [{ id:'b1', kg:72, date:ago(3) }, { id:'b2', kg:71, date:TODAY }];
  w.save(); w.ev('ui').tab = 'gym'; w.ev('ui').gymSub = null; w.render();
  const pt = w.document.querySelector('.chartwrap [data-act="chart-pt"]');
  ok('el peso corporal usa el gráfico interactivo', pt !== null);
  // Un <circle> SVG no tiene .click() en jsdom; en el navegador el click burbujea igual.
  const tap = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  tap(pt);
  const tip = w.document.querySelector('.chartwrap .charttip');
  ok('tocar un punto muestra el tooltip', tip.classList.contains('show') && /kg/.test(tip.textContent));
  tap(pt);
  ok('tocar de nuevo lo cierra', !tip.classList.contains('show'));
  // tocar fuera también lo cierra
  tap(pt);
  ok('reabre', w.document.querySelector('.charttip').classList.contains('show'));
  w.document.getElementById('app').click();
  ok('tocar fuera del gráfico cierra el tooltip', !w.document.querySelector('.charttip').classList.contains('show'));
} catch (e) { ok('lineChart', false, e.message); }

/* ---------- 33. detalle de ejercicio: registros por fecha + récord ---------- */
console.log('\n33. Detalle de ejercicio');
try {
  const w = boot(null, null);
  const s = w.ev('state');
  s.gym.lifts = [{ id:'LX', name:'Press banca', unit:'kg', color:'#4D96FF', history:[
    { date:ago(20), weight:40 }, { date:ago(10), weight:47.5 }, { date:ago(2), weight:45 } ] }];
  w.save();
  w.ev('ui').tab = 'gym'; w.ev('ui').gymSub = null; w.render();

  // tocar la tarjeta del ejercicio abre el detalle (no el form de cargar peso)
  w.document.querySelector('[data-act="lift-open"][data-id="LX"]').click();
  const ov = w.document.getElementById('overlay');
  const h = ov.innerHTML;
  ok('abre el detalle del ejercicio', ov.classList.contains('show') && h.includes('Press banca'));
  ok('lista los 3 registros por fecha', (h.match(/data-act="lift-rec-edit"/g) || []).length === 3);
  ok('muestra las fechas de cada registro', h.includes('kg') && h.includes(String(new Date(d.getTime()-20*86400000).getDate())));
  ok('marca el récord (47.5 fue el máximo)', h.includes('récord') && h.includes('47.5'));
  ok('tiene el gráfico interactivo', h.includes('data-act="chart-pt"'));
  ok('ofrece cargar peso y borrar ejercicio', h.includes('data-act="lift-log"') && h.includes('data-act="lift-delete"'));

  // editar un registro
  w.document.querySelectorAll('[data-act="lift-rec-edit"]')[0].click(); // el más reciente (ago 2, 45)
  ok('abre el form de editar registro', w.document.getElementById('overlay').innerHTML.includes('Editar registro'));
  const kg = w.document.querySelector('#lr-kg');
  kg.value = '50';
  w.document.querySelector('[data-act="modal-save"]').click();
  ok('editar cambia el peso del registro', w.ev('state').gym.lifts[0].history.some(r => r.weight === 50) && !w.ev('state').gym.lifts[0].history.some(r => r.weight === 45));
  ok('vuelve al detalle tras editar', w.document.getElementById('overlay').innerHTML.includes('Press banca'));

  // editar con peso inválido no guarda
  w.document.querySelectorAll('[data-act="lift-rec-edit"]')[0].click();
  w.document.querySelector('#lr-kg').value = '0';
  w.document.querySelector('[data-act="modal-save"]').click();
  ok('peso 0 no guarda y avisa', w.document.querySelectorAll('.ferr').length === 1 && !w.ev('state').gym.lifts[0].history.some(r => r.weight === 0));
  w.closeModal();

  // borrar un registro (quedan 3, se puede)
  w.document.querySelector('[data-act="lift-open"][data-id="LX"]').click();
  const antes = w.ev('state').gym.lifts[0].history.length;
  w.document.querySelectorAll('[data-act="lift-rec-delete"]')[0].click();
  w.document.querySelector('[data-act="confirm-yes"]').click();
  ok('borra un registro con confirmación', w.ev('state').gym.lifts[0].history.length === antes - 1);

  // no deja borrar el último registro
  const l = w.ev('state').gym.lifts[0];
  l.history = [{ date:TODAY, weight:60 }];
  w.save();
  w.document.querySelector('[data-act="lift-open"][data-id="LX"]').click();
  w.document.querySelector('[data-act="lift-rec-delete"]').click();
  ok('no deja borrar el único registro', w.document.getElementById('overlay').innerHTML.includes('único registro') || w.document.querySelector('[data-act="notice-ok"]') !== null);
  ok('el registro sigue ahí', w.ev('state').gym.lifts[0].history.length === 1);
} catch (e) { ok('detalle de ejercicio', false, e.message); }

/* ---------- 34. sigue sin romper el resto ---------- */
console.log('\n34. Regresión de los cambios 3.6');
try {
  const w = bootBk(V1_RAW, null);
  // export/import round-trip sigue exacto con el campo doneAt presente
  const s = w.ev('state');
  s.items[0].done = true; s.items[0].doneAt = TODAY;
  w.save();
  const json = JSON.stringify(w.backupPayload());
  const antes = JSON.stringify(w.ev('state'));
  s.items = [];
  w.save();
  w.importFromText(json);
  w.document.querySelector('[data-act="confirm-yes"]').click();
  ok('round-trip con doneAt vuelve exacto', JSON.stringify(w.ev('state')) === antes);
  ok('doneAt sobrevive al backup', w.ev('state').items.some(x => x.doneAt === TODAY));

  // el gym sigue entero
  w.ev('ui').tab = 'gym'; w.ev('ui').gymSub = null; w.render();
  const h = w.document.getElementById('app').innerHTML;
  ok('gym sigue con plan, cargas y peso', h.includes('PLAN SEMANAL') && h.includes('SEGUIMIENTO DE PESOS') && h.includes('PESO CORPORAL'));
  ok('las tarjetas de ejercicio siguen ahí', h.includes('data-act="lift-open"'));
  ok('daily.v1 intacta', w.localStorage.getItem('daily.v1') === V1_RAW);
} catch (e) { ok('regresión 3.6', false, e.message); }

done();
