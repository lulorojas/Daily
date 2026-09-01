import { SectionIcon } from '../ui/Icons';
import { TourDots } from './OnboardingTourInfo';
import { TOUR } from '../../lib/onboarding';
import { SECTIONS } from '../../lib/sections';
import { C, tint } from '../../lib/theme';

/* Port de tourSectionView(): el tip que flota sobre la pantalla real mientras el tour la
   recorre. A diferencia de los pasos 'info', acá NO hay scrim oscureciendo todo — la
   sección de atrás se ve tal cual es, el tour solo agrega el "onbtop" (Omitir) y el
   tip de abajo.

   Sin createPortal: ver la nota en OnboardingAsk.jsx. Acá el color no depende de
   var(--accent) (vanilla también lo escribe explícito, `background:${col}`), pero se
   saca el portal igual por consistencia con los otros dos pasos y para que el z-index
   compita en el mismo árbol que el resto de #app, no en uno aparte. */
export function OnboardingTourSection({ step, stepIndex, onNext, onSkip }) {
  const section = SECTIONS.find((s) => s.key === step.tab);
  const col = section ? section.accent : C.amber;
  const n = stepIndex + 1;

  return (
    <>
      <div className="onbtop onbtop-float">
        <button type="button" className="cancel" onClick={onSkip}>Omitir</button>
      </div>
      <div className="onbtip">
        <div className="onbtip-card" style={{ borderColor: tint(col, '55') }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginBottom: '9px' }}>
            <div style={{ width: '32px', height: '32px', flex: 'none', borderRadius: '11px', background: tint(col, '24'), color: col, display: 'grid', placeItems: 'center' }}>
              <SectionIcon section={step.tab} size="18px" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '15.5px' }}>{step.title}</div>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.4px', color: 'rgba(242,244,248,.4)' }}>
                PASO {n} DE {TOUR.length}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '13.5px', lineHeight: 1.5, color: 'rgba(242,244,248,.82)' }}>{step.tip}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px' }}>
            <TourDots stepIndex={stepIndex} />
            <button
              type="button"
              className="abtn primary"
              style={{ width: 'auto', height: '38px', padding: '0 20px', fontSize: '13.5px', margin: 0, background: col }}
              onClick={onNext}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
