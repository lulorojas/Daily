import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireStatus } from './RequireStatus';
import { RequireData } from './RequireData';
import { AppLayout } from './AppLayout';
import { AUTH_STATUS } from '../lib/authStatus';
import { SECTIONS } from '../lib/sections';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';
import { HoyPage } from '../pages/HoyPage';
import { CalendarioPage } from '../pages/CalendarioPage';
import { AjustesPage } from '../pages/AjustesPage';
import { SoonPage } from '../pages/SoonPage';

/* ----------------------------- MAPA DE RUTAS -----------------------------
   Todas las pantallas y quién puede verlas, en un solo archivo que se lee de arriba abajo.
   En la app vanilla esto era AUTH.screen + un if largo dentro de render(); acá cada
   pantalla tiene URL propia, lo que trae el botón Atrás, poder compartir /calendario y
   que un link a un día (/?d=2026-08-10) sea un link de verdad.

   Las tres reglas de acceso, que son las mismas que pedía la etapa 1:
     sin sesión              → login (y solo puede ver los formularios de sesión)
     con sesión sin verificar → pantalla de verificación (y nada más)
     con sesión verificada    → la app (y ya no puede volver al login) */
export function AppRoutes() {
  return (
    <Routes>
      {/* Solo sin sesión: si ya entraste, estas URLs te devuelven a donde estabas. */}
      <Route element={<RequireStatus allow={[AUTH_STATUS.SIGNED_OUT]} />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/recuperar" element={<ResetPasswordPage />} />
      </Route>

      {/* Solo con sesión sin verificar. */}
      <Route element={<RequireStatus allow={[AUTH_STATUS.UNVERIFIED]} />}>
        <Route path="/verificar" element={<VerifyEmailPage />} />
      </Route>

      {/* Solo con sesión verificada Y con los datos ya cargados: la app.
          Las tres capas se anidan, cada una con una sola responsabilidad:
          quién sos → tenés los datos → el marco (barra + formularios) → la pantalla. */}
      <Route element={<RequireStatus allow={[AUTH_STATUS.READY]} />}>
        <Route element={<RequireData />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HoyPage />} />
            <Route path="/calendario" element={<CalendarioPage />} />
            {/* Ajustes no es una sección: es una sub-pantalla de Hoy, a la que se llega
                por el engranaje. Igual que `ui.hoySub='ajustes'` en la app vanilla. */}
            <Route path="/ajustes" element={<AjustesPage />} />
            {/* Las secciones que todavía no se migraron ya tienen su URL, así la barra de
                abajo es la definitiva. Cuando cada una exista, se cambia esta línea. */}
            {SECTIONS.filter((s) => !s.ready).map((s) => (
              <Route key={s.key} path={s.path} element={<SoonPage section={s} />} />
            ))}
          </Route>
        </Route>
      </Route>

      {/* Cualquier otra URL cae en la raíz, y ahí el guardián decide. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
