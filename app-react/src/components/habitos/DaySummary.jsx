/* ----------------------------- MARCAS DE HOY -----------------------------
   Rediseño Nocturne: una tarjeta con un anillo (76px) que se llena según las marcas del
   día elegido y, al lado, una frase. El anillo es un <circle> de SVG de radio 31; el largo
   de su trazo (stroke-dasharray) se calcula con la circunferencia (2·π·31 ≈ 194.8): la
   parte "llena" es la fracción marcada y el resto, vacío. */
const CIRCUNFERENCIA = 2 * Math.PI * 31;

export function DaySummary({ marks, possible, className = '' }) {
  const frac = possible > 0 ? Math.min(marks / possible, 1) : 0;
  const falta = Math.max(possible - marks, 0);
  const msg = possible === 0
    ? 'No hay nada para marcar en este día.'
    : (falta === 0 ? '¡Marcaste todo!' : `${falta === 1 ? 'Falta 1 marca' : `Faltan ${falta} marcas`} para completar el día.`);

  return (
    <div className={`card daysummary ${className}`}>
      <div className="daysummary-ring">
        <svg width="76" height="76" viewBox="0 0 76 76" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
          <circle cx="38" cy="38" r="31" fill="none" stroke="rgba(233,233,237,.07)" strokeWidth="6" />
          <circle
            className="daysummary-fill" cx="38" cy="38" r="31" fill="none" stroke="var(--green)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${frac * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`}
          />
        </svg>
        <div className="daysummary-n">{marks}/{possible}</div>
      </div>
      <div className="grow">
        <div className="daysummary-label">Marcas de hoy</div>
        <div className="daysummary-msg">{msg}</div>
      </div>
    </div>
  );
}
