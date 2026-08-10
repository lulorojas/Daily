/* Botón de las pantallas de sesión.

   En vanilla eran <div class="abtn"> con un data-act que leía un listener global. Acá son
   <button> de verdad, y eso trae gratis tres cosas que antes había que programar:
   Enter envía el formulario, se puede llegar con Tab, y un lector de pantalla lo anuncia
   como botón. El aspecto no cambia: siguen usando las mismas clases .abtn/.primary/.ghost.

   `busy` pone el texto "Un momento…" y lo bloquea, igual que authBusy(). */
export function AuthButton({
  children, kind = 'primary', type = 'button',
  busy = false, disabled = false, onClick,
}) {
  return (
    <button
      type={type}
      className={`abtn ${kind}${busy ? ' busy' : ''}`}
      disabled={busy || disabled}
      aria-busy={busy || undefined}
      onClick={onClick}
    >
      {busy ? 'Un momento…' : children}
    </button>
  );
}
