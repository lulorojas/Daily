import { C } from '../../lib/theme';

/* Port de onbAskView(): el modal de "¿Es tu primera vez en Daily?" que se muestra una
   sola vez por cuenta (state.onboarding.seen === false), sin importar desde qué
   dispositivo entre. La respuesta persiste en Firestore (ver OnboardingProvider).

   A diferencia de los modales de formulario (Modal.jsx, ConfirmDialog.jsx), ACÁ NO se usa
   createPortal. En vanilla, render() concatena el HTML del onboarding adentro del mismo
   string que arma #app (app.js:44-45) — nunca sale de ahí. Portarlo a document.body
   rompería justo lo que hace que el botón "Siguiente" cambie de color con cada sección
   del tour: ese color sale de var(--accent), que #app trae seteado con el acento de la
   URL actual, y una capa afuera de #app no lo hereda (ver App.jsx). El z-index (60+) ya
   alcanza para taparlo todo sin necesidad de escapar del árbol. */
export function OnboardingAsk({ onAccept, onDecline }) {
  return (
    <div className="onbscrim">
      <div className="onbcard" style={{ textAlign: 'center' }}>
        <div
          className="authmark"
          style={{ width: '64px', height: '64px', borderRadius: '22px', fontSize: '30px', background: `linear-gradient(140deg,${C.amber},${C.coral})`, margin: '0 auto 14px' }}
        >
          D
        </div>
        <h2>¿Es tu primera vez en Daily?</h2>
        <div className="sub" style={{ margin: '8px auto 20px', maxWidth: '280px' }}>
          Te hacemos un tour de 30 segundos, o entrás directo si ya la conocés.
        </div>
        <button type="button" className="abtn primary" onClick={onAccept}>Sí, mostrame cómo funciona</button>
        <button type="button" className="onbghost" onClick={onDecline}>Ya la conozco</button>
      </div>
    </div>
  );
}
