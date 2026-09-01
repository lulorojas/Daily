/* Dispara la descarga de un archivo de texto desde el navegador. Port de la parte de
   doExport() de app/js/ajustes.js que no es específica de backup (Blob + <a download> +
   revocar el objeto). No es una función "pura" (toca el DOM), pero tampoco es de React ni
   de Firebase — por eso vive en lib/ igual, junto al resto de utilidades sin estado. */
export function downloadText(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename; // nombre fijo: reemplaza limpio al anterior en Descargas/Drive
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
