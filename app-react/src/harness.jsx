/* Arnés de DESARROLLO (no se commitea ni se despliega): monta la app real con un Firestore
   en memoria y datos de ejemplo, para poder mirarla en el navegador sin una cuenta. */
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { DataContext } from './context/DataContext';
import { createDataStore } from './store/dataStore';
import { authStatus } from './lib/authStatus';
import { fullDoc } from './test/fixtures';
import { normalize } from './lib/model';
import { addMealLogStructured, addMealLogLibre, loadMealPlanTemplate } from './store/mutations';
import { PLAN_NUTRI_2026_10 } from './lib/mealPlanTemplates';
import { addDays, iso, todayD } from './lib/dates';
import { App } from './App';
import './styles/styles.css';
import './styles/auth.css';
import './styles/app.css';
import './styles/nocturne.css';

const doc = normalize(fullDoc());
if (new URLSearchParams(location.search).get('comidas') !== '0') {
  loadMealPlanTemplate(doc, PLAN_NUTRI_2026_10);
  const plan = doc.meals.plans[0];
  const hoy = iso(todayD());
  const ayer = iso(addDays(todayD(), -1));
  const slot = (n) => plan.slots.find((s) => s.name === n);
  const reg = (d, n, i, qtys) => addMealLogStructured(doc, d, { slotId: slot(n).id, optionId: slot(n).options[i].id, qtys });
  reg(ayer, 'Desayuno', 0); reg(ayer, 'Almuerzo', 0); reg(ayer, 'Merienda', 1); reg(ayer, 'Cena', 2);
  reg(hoy, 'Desayuno', 2);
  const al = slot('Almuerzo').options[1];
  reg(hoy, 'Almuerzo', 1, Object.fromEntries(al.items.slice(0, 1).map((it) => [it.id, it.qty / 2])));
  addMealLogLibre(doc, ayer, null, 'un alfajor', 'permitido');
}

const docs = { 'uid-h': doc };
const subs = [];
const store = createDataStore({
  subscribe: (uid, onData) => { const f = onData; subs.push(f); f(structuredClone(docs[uid])); return () => {}; },
  save: (uid, data) => { docs[uid] = structuredClone(data); return Promise.resolve(); },
  readLocalSeed: () => null,
});
store.start('uid-h');

const user = { uid: 'uid-h', email: 'lulo@ejemplo.com', emailVerified: true };
const auth = { user, ready: true, error: null, status: authStatus({ ready: true, user, error: null }), reloadUser: async () => user };

createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={[new URLSearchParams(location.search).get('path') || '/']}>
    <AuthContext.Provider value={auth}>
      <DataContext.Provider value={store}>
        <App />
      </DataContext.Provider>
    </AuthContext.Provider>
  </MemoryRouter>,
);
