import { Link } from 'react-router-dom';
import { C } from '../../lib/theme';
import { ChevronLeftIcon } from '../ui/Icons';
import { AuthFlash } from './AuthFlash';

/* ----------------------------- CÁSCARA DE LAS PANTALLAS DE SESIÓN -----------------------------
   El marco que comparten login, registro, recuperar y verificar: la marca "D", el título,
   la bajada, el lugar del aviso y el cuerpo. Es la traducción a componente de authShell()
   de la app vanilla.

   `children` es el hueco: todo lo que se escriba adentro de <AuthShell>…</AuthShell> se
   dibuja donde está {children}. Es lo que en vanilla se pasaba como string `body`, pero sin
   concatenar HTML: React se encarga de escapar el texto, así que el bug de "un email con
   comillas rompe la pantalla" directamente no puede pasar (adiós esc()).

   El acento entra como variable CSS (--accent) igual que antes, así el CSS copiado de la app
   actual funciona sin tocar una línea. */
export function AuthShell({ title, sub, accent = C.amber, back, flash, onSubmit, children }) {
  /* Cuando la pantalla es un formulario, el propio .body ES el <form>. Podría envolverse
     el contenido en un <form> adentro, pero .body es un flex con gap y sus hijos directos
     tienen animación escalonada: meter un nodo en el medio cambiaría el diseño. Así, con
     un <form> de verdad, Enter envía sin una sola línea de JS (en vanilla hubo que
     programar un listener global de teclado para lograr lo mismo). */
  const Body = onSubmit ? 'form' : 'div';

  return (
    <div className="view auth" style={{ '--accent': accent }}>
      <div className="head">
        {back && (
          <Link className="rut-back auth-back" to={back.to}>
            <ChevronLeftIcon />
            <span>{back.label || 'Volver'}</span>
          </Link>
        )}
        <div className="authmark" style={{ background: `linear-gradient(140deg,${accent},${C.coral})` }}>D</div>
        <h1>{title}</h1>
        <div className="sub">{sub}</div>
      </div>
      <Body className="body" onSubmit={onSubmit} noValidate={onSubmit ? true : undefined}>
        {/* Este div va siempre, aunque no haya aviso: es un hijo más de .body y las
            animaciones escalonadas del CSS cuentan por posición. */}
        <div className="auth-flash-slot">{flash && <AuthFlash kind={flash.kind} msg={flash.msg} />}</div>
        {children}
      </Body>
    </div>
  );
}
