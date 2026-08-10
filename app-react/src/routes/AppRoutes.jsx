import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireStatus } from './RequireStatus';
import { RequireData } from './RequireData';
import { AUTH_STATUS } from '../lib/authStatus';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';
import { HomePage } from '../pages/HomePage';

/* ----------------------------- MAPA DE RUTAS -----------------------------
   Todas las pantallas y quién puede verlas, en un solo archivo que se lee de arriba abajo.
   En la app vanilla esto era AUTH.screen + un if largo dentro de render(); acá cada
   pantalla tiene URL propia, lo que trae el botón Atrás, poder compartir /registro y,
   más adelante, que cada sección sea /hoy, /calendario, etc.

   Las tres reglas, que son las mismas que pedía la etapa:
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
          Las dos puertas se anidan, cada una con una sola responsabilidad. */}
      <Route element={<RequireStatus allow={[AUTH_STATUS.READY]} />}>
        <Route element={<RequireData />}>
          <Route path="/" element={<HomePage />} />
        </Route>
      </Route>

      {/* Cualquier otra URL cae en la raíz, y ahí el guardián decide. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
