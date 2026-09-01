import { InstallIcon, BigCheckIcon } from '../ui/Icons';
import { TOUR } from '../../lib/onboarding';
import { C, tint } from '../../lib/theme';

/* Port de tourInstView() (el `installBlock()` de vanilla) + tourInfoView(). Los pasos
   'info' del tour: tarjeta centrada sobre fondo atenuado, sin ninguna sección real detrás
   (a diferencia de los pasos 'section', que sí muestran la pantalla real).

   Sin createPortal: ver la nota larga en OnboardingAsk.jsx. Acá importa el doble, porque
   el botón "Siguiente" ES var(--accent) sin ningún color propio (a propósito, ni acá ni en
   vanilla) — tiene que heredar el acento de #app para pintarse del color de la ÚLTIMA
   sección que recorrió el tour, y eso solo pasa si este nodo sigue siendo descendiente
   de #app. */
function InstallBlock() {
  const card = (name, steps) => (
    <div className="onbinst">
      <div className="onbinst-t">{name}</div>
      <div className="onbinst-s">{steps}</div>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px', textAlign: 'left' }}>
      {card('iPhone · Safari', 'Tocá Compartir (el cuadrito con la flecha ↑) y elegí "Agregar a inicio".')}
      {card('Android · Chrome', 'Abrí el menú (⋮) y elegí "Instalar app" o "Agregar a pantalla de inicio".')}
    </div>
  );
}

export function TourDots({ stepIndex }) {
  return (
    <div className="onbdots">
      {TOUR.map((_, j) => <span key={j} className={`onbdot${j === stepIndex ? ' on' : ''}`} />)}
    </div>
  );
}

export function OnboardingTourInfo({ step, stepIndex, onNext, onFinish, onSkip }) {
  const last = stepIndex === TOUR.length - 1;

  let icon = null;
  if (step.mark) {
    icon = (
      <div
        className="authmark"
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '20px',
          fontSize: '30px',
          background: step.mark === '+' ? C.amber : `linear-gradient(140deg,${C.amber},${C.coral})`,
          color: '#0A0C11',
          margin: '0 auto 12px',
        }}
      >
        {step.mark}
      </div>
    );
  } else if (step.install) {
    icon = (
      <div className="onbicon" style={{ background: tint(C.amber, '24'), color: C.amber }}>
        <InstallIcon />
      </div>
    );
  } else if (step.check) {
    icon = (
      <div className="onbicon" style={{ background: tint(C.green, '24'), color: C.green }}>
        <BigCheckIcon />
      </div>
    );
  }

  return (
    <div className="onbscrim">
      <div className="onbtop">
        <button type="button" className="cancel" onClick={onSkip}>Omitir</button>
      </div>
      <div className="onbcard" style={{ textAlign: 'center' }}>
        {icon}
        <h2>{step.title}</h2>
        <div className="sub" style={{ margin: '8px auto 0', maxWidth: '300px' }}>{step.body}</div>
        {step.install && <InstallBlock />}
        <TourDots stepIndex={stepIndex} />
        <button type="button" className="abtn primary" style={{ marginTop: '6px' }} onClick={last ? onFinish : onNext}>
          {last ? 'Empezar a usar Daily' : 'Siguiente'}
        </button>
      </div>
    </div>
  );
}
