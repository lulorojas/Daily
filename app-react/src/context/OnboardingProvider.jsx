import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingContext } from './OnboardingContext';
import { useData } from '../hooks/useData';
import { TOUR } from '../lib/onboarding';
import { SECTIONS } from '../lib/sections';
import { OnboardingOverlay } from '../components/onboarding/OnboardingOverlay';

/* ----------------------------- ONBOARDING: quién decide qué se ve -----------------------------
   Port de la parte de estado de app/js/onboarding.js (TOUR es un dato puro, ver lib/
   onboarding.js). Vive en el layout, como ItemFormsProvider/HabitFormsProvider, porque el
   modal de "primera vez" y el tour tienen que poder aparecer ARRIBA de cualquier pantalla,
   y "Ver el tutorial de nuevo" (Ajustes) tiene que poder relanzarlo desde cualquier lado.

   Diferencia real con vanilla, no cosmética: allá "saltar a una sección" era
   `ui.tab = st.tab` — una variable que no dispara nada por sí sola, la siguiente
   `render()` ya la lee. Acá la sección ES la URL, así que avanzar un paso de tipo
   'section' tiene que navegar de verdad (`useNavigate`). Eso corre en un efecto que
   escucha el paso actual, no en el propio `next()`: mantiene "cambiar de paso" y
   "navegar" como dos cosas separadas, igual que vanilla separaba `tourGo()` de
   `syncTourTab()`. */
export function OnboardingProvider({ children }) {
  const { status, data, update } = useData();
  const navigate = useNavigate();
  const [tour, setTour] = useState(null); // { step } | null

  const step = tour ? TOUR[tour.step] : null;

  // Al entrar a un paso de sección, el tour salta a esa pantalla solo (la persona no
  // elige). Los pasos 'info' no tocan la navegación: lo que hubiera detrás sigue ahí,
  // atenuado por el scrim.
  useEffect(() => {
    if (step?.kind === 'section') {
      const section = SECTIONS.find((s) => s.key === step.tab);
      if (section) navigate(section.path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour?.step]);

  const startTour = useCallback(() => setTour({ step: 0 }), []);

  // goHome=true (terminó bien, o "Empezar a usar Daily"): vuelve a Hoy. En "Omitir" se
  // queda donde está, es menos brusco cortar el tour de golpe.
  const endTour = useCallback((goHome) => {
    setTour(null);
    if (goHome) navigate('/');
  }, [navigate]);

  const next = useCallback(() => {
    setTour((cur) => (cur ? { step: cur.step + 1 } : cur));
  }, []);

  // ¿Es tu primera vez? Sí: marca `seen` (no se vuelve a preguntar) y arranca el tour.
  const acceptTour = useCallback(() => {
    update((draft) => { draft.onboarding = { seen: true }; });
    startTour();
  }, [update, startTour]);

  // Ya la conozco: marca `seen` y listo, sin tour.
  const declineTour = useCallback(() => {
    update((draft) => { draft.onboarding = { seen: true }; });
  }, [update]);

  // Desde Ajustes: `seen` ya es true, así que relanza directo sin volver a preguntar.
  const restartTour = useCallback(() => startTour(), [startTour]);

  const askDue = status === 'ready' && data?.onboarding?.seen === false && !tour;

  const value = useMemo(() => ({ restartTour }), [restartTour]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      <OnboardingOverlay
        askDue={askDue}
        step={step}
        stepIndex={tour?.step ?? 0}
        total={TOUR.length}
        onAccept={acceptTour}
        onDecline={declineTour}
        onNext={next}
        onSkip={() => endTour(false)}
        onFinish={() => endTour(true)}
      />
    </OnboardingContext.Provider>
  );
}
