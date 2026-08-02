// Harness de tests de integración de Daily.
// Bootea la app en jsdom cargando los scripts clásicos en el mismo orden que index.html,
// con acceso al scope léxico (const ui / let state no viven en window).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

// La app está una carpeta más arriba (app/), sin importar dónde esté clonado el repo.
const APP = path.resolve(__dirname, '..');
const FILES = ['utils.js','hoy.js','agenda.js','calendario.js','gimnasio.js','rutinas.js','habitos.js','progreso.js','ajustes.js','app.js'];

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' -> ' + extra : '')); }
};

const d = new Date(); d.setHours(0,0,0,0);
const iso = x => x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
const TODAY = iso(d);
const TOMORROW = iso(new Date(d.getTime() + 86400000));
const ANUAL_DATE = '1990-' + TODAY.slice(5);
const ago = n => iso(new Date(d.getTime() - n*86400000));

// daily.v1 de ejemplo (modelo viejo): sirve para probar la migración y que nunca se toque.
const V1 = {
  tasks: [
    { id:'t1', text:'Tarea sin fecha',  desc:'una desc', time:null,    date:null,        done:false },
    { id:'t2', text:'Tarea de hoy',     desc:'',         time:null,    date:TODAY,       done:false },
    { id:'t3', text:'Tarea de mañana',  desc:'',         time:null,    date:TOMORROW,    done:false },
    { id:'t4', text:'Tarea con hora',   desc:'',         time:'14:30', date:TODAY,       done:true  },
    { id:'t5', text:'Tarea vencida',    desc:'',         time:null,    date:'2020-01-05',done:false },
  ],
  reminders: [
    { id:'r1', type:'puntual', title:'Dentista',         date:TODAY,      time:'10:00', desc:'llevar estudios' },
    { id:'r2', type:'puntual', title:'Puntual sin hora', date:TODAY,      time:null,    desc:'' },
    { id:'r3', type:'anual',   title:'Cumple de Ana',    date:ANUAL_DATE, time:null,    desc:'' },
  ],
  gym: { customTypes:[{id:'ct1',name:'Pecho',color:'#4D96FF'}], weekPlans:{}, lifts:[{id:'l1',name:'Sentadilla',unit:'kg',color:'#FF6B6B',history:[{date:TODAY,weight:60}]}], seeded:true, typesSeeded:true },
  habits: [{ id:'h1', name:'Tomar agua', detail:'8 vasos', color:'#06D6A0', icon:'agua' }],
  habitLog: { [TODAY]: { h1:true } },
};
const V1_RAW = JSON.stringify(V1);

function boot(seedV1, seedV2) {
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div><div class="overlay" id="overlay"></div></body></html>',
    { url:'http://localhost/', pretendToBeVisual:true, runScripts:'outside-only' });
  const w = dom.window;
  if (seedV1) w.localStorage.setItem('daily.v1', seedV1);
  if (seedV2) w.localStorage.setItem('daily.v2', seedV2);
  const ctx = dom.getInternalVMContext();
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(APP, 'js', f), 'utf8'), ctx, { filename:f });
  // `const ui` / `let state` son léxicas: no viven en window, se leen evaluando en el contexto.
  w.ev = code => vm.runInContext(code, ctx);
  return w;
}

module.exports = {
  boot, ok,
  done: () => { console.log('\n' + '='.repeat(46)); console.log(pass + ' ok, ' + fail + ' fail'); process.exit(fail ? 1 : 0); },
  d, iso, TODAY, TOMORROW, ANUAL_DATE, ago, V1_RAW,
};
