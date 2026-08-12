/* ============================================================================
   GEOMETRÍA DE LOS GRÁFICOS

   Port de smoothPath(), sparkline() y lineChart() de app/js/utils.js, partido en dos: acá
   quedan las cuentas (dónde va cada punto, qué curva los une) y en components/ui/ el
   dibujo. Separarlo no es por prolijidad: la curva es la parte que hay que probar y la que
   NO puede cambiar ni un decimal, porque si cambia, los gráficos se ven distinto.

   Todo son funciones puras sobre números. Los tests las comparan contra las de la app
   vanilla sobre las mismas series.
   ============================================================================ */

/* Curva suave que pasa por todos los puntos (Catmull-Rom convertida a Bézier cúbica).

   La idea: para cada tramo entre dos puntos se calculan dos puntos de control mirando al
   vecino de cada lado, así la curva entra y sale con la misma pendiente y no se ven
   "codos". En los extremos, donde no hay vecino, se usa el punto mismo.

   Los toFixed(1) están copiados tal cual: redondear distinto daría un path distinto, y el
   test diferencial contra vanilla compara el string entero. */
export function smoothPath(cpts) {
  if (!cpts.length) return '';
  if (cpts.length === 1) return `M${cpts[0][0].toFixed(1)},${cpts[0][1].toFixed(1)}`;

  let d = `M${cpts[0][0].toFixed(1)},${cpts[0][1].toFixed(1)}`;
  for (let i = 0; i < cpts.length - 1; i++) {
    const p0 = cpts[i - 1] || cpts[i];
    const p1 = cpts[i];
    const p2 = cpts[i + 1];
    const p3 = cpts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/* Dónde cae cada punto de la serie dentro del recuadro del gráfico.

   Detalle heredado que importa: cuando todos los valores son iguales, `range` sería 0 y
   habría una división por cero; vanilla usa `(max-min)||1`, lo que deja la línea plana en
   el medio. Y con un solo punto, X() lo manda al centro en vez de al borde izquierdo. */
export function chartPoints(values, { W, H, padX, padY }) {
  const n = values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = (max - min) || 1;
  const X = (i) => (n > 1 ? padX + (i / (n - 1)) * (W - padX * 2) : W / 2);
  const Y = (v) => padY + (1 - (v - min) / range) * (H - padY * 2);
  return values.map((v, i) => ({ x: X(i), y: Y(v), v, i }));
}

/* El relleno de abajo de la curva: la misma línea, bajada a la base y cerrada.
   Se arma con el path ya calculado para que el borde de arriba coincida exactamente. */
export function areaPath(line, pts, { H, padX, padY }) {
  const last = pts[pts.length - 1];
  const first = pts[0];
  void padX;
  return `${line} L${last.x.toFixed(1)},${H - padY} L${first.x.toFixed(1)},${H - padY} Z`;
}

/* La geometría de la dona (balance muscular de Progreso). Port de donut(). Cada porción es
   un círculo completo con un `stroke-dasharray` que solo muestra la fracción que le toca,
   y un `stroke-dashoffset` negativo que la corre para que empiece donde terminó la
   anterior. `rotate(-90)` hace que arranquen las 12, no las 3, que es la convención visual
   de estos anillos.

   Con total 0 devuelve una lista vacía — quien llama decide qué mostrar en su lugar (el
   mismo contrato que tenía la función original, que devolvía ''). */
export function donutSlices(slices, size, thick) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  if (!total) return [];
  const R = size / 2;
  const rad = R - thick / 2;
  const circ = 2 * Math.PI * rad;
  let acc = 0;
  return slices.map((s) => {
    const len = (s.value / total) * circ;
    const ring = { color: s.color, r: rad, dasharray: `${len.toFixed(2)} ${(circ - len).toFixed(2)}`, dashoffset: -acc };
    acc += len;
    return ring;
  });
}
