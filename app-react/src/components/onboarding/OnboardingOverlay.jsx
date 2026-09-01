import { OnboardingAsk } from './OnboardingAsk';
import { OnboardingTourInfo } from './OnboardingTourInfo';
import { OnboardingTourSection } from './OnboardingTourSection';

/* Elige qué pieza del onboarding dibujar, si corresponde alguna. Separado de
   OnboardingProvider para que el provider (estado + navegación) no tenga que saber nada
   de JSX de más de un tipo de pantalla — la misma separación que ya usa el resto de la
   app entre "quién decide" y "qué se dibuja". */
export function OnboardingOverlay({ askDue, step, stepIndex, total, onAccept, onDecline, onNext, onSkip, onFinish }) {
  if (askDue) return <OnboardingAsk onAccept={onAccept} onDecline={onDecline} />;
  if (!step) return null;
  if (step.kind === 'section') {
    return <OnboardingTourSection step={step} stepIndex={stepIndex} total={total} onNext={onNext} onSkip={onSkip} />;
  }
  return <OnboardingTourInfo step={step} stepIndex={stepIndex} total={total} onNext={onNext} onFinish={onFinish} onSkip={onSkip} />;
}
