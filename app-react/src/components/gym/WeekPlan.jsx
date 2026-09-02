import { ChevronLeftIcon, ChevronRightIcon, ChipChevronIcon, CrossIcon, HabitCheckIcon, PencilIcon, PlusIcon } from '../ui/Icons';
import { DOW_SHORT, dow, todayD } from '../../lib/dates';
import { CORE_CATS, CORE_CAT_LABELS, REST, allTypes, dayAbs, dayTurnos, describeAbs, typeColor } from '../../lib/gym';
import { C, tint } from '../../lib/theme';

/* ----------------------------- PLAN SEMANAL -----------------------------
   Port del primer bloque de viewGym(). Siete filas, una por día: la sigla, una barra del
   color del tipo, el chip que despliega el selector y el check de "hecho".

   Entrenamientos dobles (etapa 6, sin precedente en vanilla — es campo nuevo del modelo):
   cada día dibuja 1 o 2 turnos según dayTurnos(). El segundo turno se agrega/quita con un
   control propio; no hay boceto de vanilla que copiar acá, así que se armó con las mismas
   piezas que ya existen (gchip/gcheck/optchips) para que un turno nuevo no desentone.

   Cuál chip está desplegado ahora es `{ day, slot }` en vez de un índice solo — antes
   alcanzaba con "qué día" porque había un solo chip por día; con dos turnos hace falta
   saber además cuál de los dos. `slot` vale 1, 2 o 'abs' (ver más abajo).

   Ojo con una diferencia deliberada de la etapa 2: en la app vanilla, getWeekPlan() creaba
   la semana en el documento con solo MIRARLA, y esa semana vacía se guardaba en el próximo
   guardado. Acá leer es leer: weekPlanFor() devuelve la semana sin tocar nada, y recién se
   escribe cuando de verdad cambiás algo. Vanilla recrea al vuelo las semanas que falten,
   así que ninguna de las dos versiones pierde datos.

   Abs y movilidad (etapa 6, tercera vuelta después de la primera entrega): Lulo pidió
   "literalmente como el resto de entrenamientos" — no una lista aparte, no un bloque
   propio: un renglón MÁS dentro de cada día del plan, con el mismo gday/gchip/optchips
   que ya dibuja los turnos. La diferencia con un turno es que categories es multi-select
   (varias a la vez, cada click prende/apaga UNA) en vez de single-select como el tipo de
   entreno, así que el panel de abajo no cierra solo al elegir — se cierra tocando el chip
   de arriba de nuevo, como cualquier desplegable. No cuenta como turno: no aporta a
   dayTurnos()/gymHistory(), es información aparte que vive en el mismo día. */
export function WeekPlan({
  data, plan, weekLabel, isCurrentWeek, expandido, onExpandir, onSemana, onTipo, onHecho,
  onAddTurno, onRemoveTurno, onAdministrar, onToggleAbsCat, onToggleMovilidad,
}) {
  const hoyIdx = dow(todayD());

  return (
    <div className="sect">
      <div className="sectrow">
        <span className="sectlabel">Plan semanal</span>
        <div className="weekstrip weeknav">
          <button type="button" className="nb" onClick={() => onSemana(-1)} aria-label="Semana anterior">
            <ChevronLeftIcon />
          </button>
          <span className="weeklabel">{weekLabel}</span>
          <button type="button" className="nb" onClick={() => onSemana(1)} aria-label="Semana siguiente">
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      <div className="card plancard">
        {plan.map((d, i) => {
          const turnos = dayTurnos(d);
          const abs = dayAbs(d);
          const absDescr = describeAbs(abs);
          const absAbierto = !!expandido && expandido.day === i && expandido.slot === 'abs';

          return (
            <div className="planday" key={i}>
              {turnos.map((t) => {
                const rest = t.type === REST;
                const col = typeColor(data, t.type);
                const abierto = !!expandido && expandido.day === i && expandido.slot === t.slot;

                return (
                  <div className="gday" key={t.slot}>
                    {/* La sigla del día solo va en el primer turno: repetirla en el
                        segundo no suma nada y desalinea la fila con la de arriba. */}
                    <span className={`gtag${isCurrentWeek && hoyIdx === i && t.slot === 1 ? ' today' : ''}`}>
                      {t.slot === 1 ? DOW_SHORT[i] : ''}
                    </span>
                    <div className={`gbar${rest ? ' rest' : ''}`} style={rest ? undefined : { background: col }} />

                    <button
                      type="button"
                      className={`gchip${rest ? ' rest' : ''}`}
                      style={rest ? undefined : { background: tint(col, '24'), color: col }}
                      aria-label={`${DOW_SHORT[i]}${t.slot === 2 ? ' (2do turno)' : ''}: ${t.type}, cambiar tipo`}
                      aria-expanded={abierto}
                      onClick={() => onExpandir(abierto ? null : { day: i, slot: t.slot })}
                    >
                      {t.type}{' '}
                      <ChipChevronIcon open={abierto} />
                    </button>

                    <div className="spacer" />

                    <button
                      type="button"
                      className={`gcheck${t.done ? ' on' : ''}`}
                      style={t.done ? { background: col, borderColor: col } : undefined}
                      role="checkbox"
                      aria-checked={t.done}
                      aria-label={`${DOW_SHORT[i]}${t.slot === 2 ? ' (2do turno)' : ''}: ${t.type}`}
                      onClick={() => onHecho(i, t.slot)}
                    >
                      <HabitCheckIcon />
                    </button>

                    {t.slot === 2 && (
                      <button
                        type="button"
                        className="turno-quitar"
                        aria-label={`Quitar el segundo turno de ${DOW_SHORT[i]}`}
                        onClick={() => onRemoveTurno(i)}
                      >
                        <CrossIcon size={10} strokeWidth="2.6" />
                      </button>
                    )}
                  </div>
                );
              })}

              {expandido && expandido.day === i && typeof expandido.slot === 'number' && (
                <div className="optchips">
                  {allTypes(data).map((opt) => {
                    const turnoActivo = turnos.find((t) => t.slot === expandido.slot);
                    const activo = opt.name === turnoActivo?.type;
                    return (
                      <button
                        type="button"
                        key={opt.name}
                        className={`optchip${activo ? ' on' : ''}`}
                        style={{
                          color: activo ? '#0A0C11' : opt.color,
                          background: activo ? opt.color : tint(opt.color, '20'),
                          border: `1.5px solid ${activo ? 'transparent' : tint(opt.color, '55')}`,
                        }}
                        aria-pressed={activo}
                        onClick={() => onTipo(i, expandido.slot, opt.name)}
                      >
                        {opt.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {turnos.length === 1 && (
                <button type="button" className="turno-agregar" onClick={() => onAddTurno(i)}>
                  <PlusIcon size={11} strokeWidth="2.4" />
                  2do turno
                </button>
              )}

              {/* data-absrow: sin equivalente en vanilla, así que src/compat/screens.test.jsx
                  lo saca del DOM antes de comparar texto. Es un atributo, no una clase, para
                  no arrastrar el chequeo de "toda clase usada existe en el CSS" — este
                  renglón reutiliza gday/gchip/optchips tal cual, no necesita ninguna nueva. */}
              <div className="gday" data-absrow="true">
                <span className="gtag" />
                <div className="gbar" style={absDescr ? { background: C.violet } : undefined} />

                <button
                  type="button"
                  className="gchip"
                  style={absDescr ? { background: tint(C.violet, '24'), color: C.violet } : undefined}
                  aria-label={`Abs y movilidad de ${DOW_SHORT[i]}`}
                  aria-expanded={absAbierto}
                  onClick={() => onExpandir(absAbierto ? null : { day: i, slot: 'abs' })}
                >
                  {absDescr || 'Abs y movilidad'}{' '}
                  <ChipChevronIcon open={absAbierto} />
                </button>

                <div className="spacer" />
              </div>

              {absAbierto && (
                <div className="optchips">
                  {CORE_CATS.map((cat) => {
                    const activo = abs.categories.includes(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        className={`optchip${activo ? ' on' : ''}`}
                        style={{
                          color: activo ? '#0A0C11' : C.violet,
                          background: activo ? C.violet : tint(C.violet, '20'),
                          border: `1.5px solid ${activo ? 'transparent' : tint(C.violet, '55')}`,
                        }}
                        aria-pressed={activo}
                        onClick={() => onToggleAbsCat(i, cat)}
                      >
                        {CORE_CAT_LABELS[cat]}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className={`optchip${abs.movilidad ? ' on' : ''}`}
                    style={{
                      color: abs.movilidad ? '#0A0C11' : C.violet,
                      background: abs.movilidad ? C.violet : tint(C.violet, '20'),
                      border: `1.5px solid ${abs.movilidad ? 'transparent' : tint(C.violet, '55')}`,
                    }}
                    aria-pressed={abs.movilidad}
                    onClick={() => onToggleMovilidad(i)}
                  >
                    Movilidad
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button type="button" className="dashed managetypes" onClick={onAdministrar}>
        <PencilIcon size={16} />
        Administrar tipos
      </button>
    </div>
  );
}
