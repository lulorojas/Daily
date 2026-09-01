import { useContext } from 'react';
import { OnboardingContext } from '../context/OnboardingContext';

/* Atajo para relanzar el tour desde cualquier pantalla — hoy solo lo usa Ajustes
   ("Ver el tutorial de nuevo"), pero vive acá y no adentro de AjustesPage por la misma
   razón que useHabitForms: quien decide qué se muestra es el layout, no la pantalla. */
export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding() se usó fuera de <OnboardingProvider>');
  return ctx;
}
