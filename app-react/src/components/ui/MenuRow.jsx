import { tint } from '../../lib/theme';

/* Una opción de un menú (el del botón + y el de "agregar a este día"). Las dos versiones
   son la misma fila con dos diferencias de estilo, así que van en un componente con una
   variante en vez de dos archivos casi iguales:

     'cal'   → barra de color a la izquierda, ícono de 40px  (menú de un día del calendario)
     'quick' → tarjeta con fondo y borde, ícono de 42px      (menú del botón +)

   El tamaño del ícono lo pone el CSS (.evic.lg svg / .evic.xl svg), no un prop: es
   cuestión de presentación y así el componente no tiene que saber de píxeles. */
export function MenuRow({ variant = 'quick', color, title, sub, icon, onClick }) {
  const cal = variant === 'cal';

  return (
    <button
      type="button"
      className={`evrow${cal ? '' : ' menu'}`}
      style={cal ? { borderLeft: `3px solid ${color}` } : undefined}
      onClick={onClick}
    >
      <div className={`evic ${cal ? 'lg' : 'xl'}`} style={{ background: tint(color, '24'), color }}>
        {icon}
      </div>
      <div className="grow">
        <div className="evname lg">{title}</div>
        <div className="evsub">{sub}</div>
      </div>
    </button>
  );
}
