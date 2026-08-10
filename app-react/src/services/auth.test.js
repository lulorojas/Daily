import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createUserWithEmailAndPassword, onAuthStateChanged, reload,
  sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut,
} from 'firebase/auth';
import { login, logout, refreshUser, register, resendVerification, sendReset, subscribeToAuth, toUserSnapshot } from './auth';

/* Acá se testea el pegamento con Firebase: que cada acción llame a la función correcta del
   SDK y con los argumentos correctos. Se reemplaza 'firebase/auth' entero, así que no hay
   proyecto real de por medio.

   vi.hoisted existe porque vi.mock se ejecuta ANTES que el resto del archivo: sin esto, la
   fábrica del mock intentaría leer una variable que todavía no existe. */
const stub = vi.hoisted(() => ({ auth: { currentUser: null } }));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signOut: vi.fn(),
  reload: vi.fn(),
}));
vi.mock('./firebase', () => ({
  getAuthInstance: () => stub.auth,
  getInitError: () => null,
  authSender: () => 'noreply@daily-app-2aae2.firebaseapp.com',
}));

beforeEach(() => {
  vi.resetAllMocks();
  stub.auth = { currentUser: null };
});

describe('toUserSnapshot', () => {
  it('sin usuario, null', () => expect(toUserSnapshot(null)).toBeNull());

  it('se queda solo con los tres datos que la app usa', () => {
    const raw = { uid: 'u1', email: 'lulo@ejemplo.com', emailVerified: true, getIdToken: () => {}, metadata: {} };
    expect(toUserSnapshot(raw)).toEqual({ uid: 'u1', email: 'lulo@ejemplo.com', emailVerified: true });
  });

  it('emailVerified siempre sale como booleano', () => {
    expect(toUserSnapshot({ uid: 'u', email: 'a@b.com' }).emailVerified).toBe(false);
  });

  it('la foto es un objeto nuevo, no el usuario de Firebase', () => {
    const raw = { uid: 'u', email: 'a@b.com', emailVerified: false };
    expect(toUserSnapshot(raw)).not.toBe(raw);
  });
});

describe('subscribeToAuth', () => {
  it('le pasa al callback la foto plana, no el objeto de Firebase', () => {
    const recibido = vi.fn();
    subscribeToAuth(recibido);

    const callbackDeFirebase = onAuthStateChanged.mock.calls[0][1];
    callbackDeFirebase({ uid: 'u1', email: 'lulo@ejemplo.com', emailVerified: true, delete: () => {} });

    expect(recibido).toHaveBeenCalledWith({ uid: 'u1', email: 'lulo@ejemplo.com', emailVerified: true });
  });

  it('avisa el null cuando no hay sesión', () => {
    const recibido = vi.fn();
    subscribeToAuth(recibido);
    onAuthStateChanged.mock.calls[0][1](null);
    expect(recibido).toHaveBeenCalledWith(null);
  });
});

describe('acciones', () => {
  it('login llama a signInWithEmailAndPassword', () => {
    login('lulo@ejemplo.com', 'secreta1');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(stub.auth, 'lulo@ejemplo.com', 'secreta1');
  });

  it('register crea la cuenta Y manda el mail de verificación', async () => {
    const nuevo = { uid: 'u2', email: 'nuevo@ejemplo.com', emailVerified: false };
    createUserWithEmailAndPassword.mockResolvedValue({ user: nuevo });

    await register('nuevo@ejemplo.com', 'secreta1');

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(stub.auth, 'nuevo@ejemplo.com', 'secreta1');
    expect(sendEmailVerification).toHaveBeenCalledWith(nuevo);
  });

  it('si falla la creación, no se manda ningún mail', async () => {
    createUserWithEmailAndPassword.mockRejectedValue(new Error('boom'));
    await expect(register('x@y.com', 'secreta1')).rejects.toThrow('boom');
    expect(sendEmailVerification).not.toHaveBeenCalled();
  });

  it('sendReset pide el link de recuperación', () => {
    sendReset('lulo@ejemplo.com');
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(stub.auth, 'lulo@ejemplo.com');
  });

  it('resendVerification usa el usuario logueado', async () => {
    stub.auth.currentUser = { uid: 'u1', email: 'lulo@ejemplo.com', emailVerified: false };
    await resendVerification();
    expect(sendEmailVerification).toHaveBeenCalledWith(stub.auth.currentUser);
  });

  it('resendVerification sin sesión falla en vez de romper', async () => {
    await expect(resendVerification()).rejects.toThrow('no-user');
    expect(sendEmailVerification).not.toHaveBeenCalled();
  });

  it('logout llama a signOut', () => {
    logout();
    expect(signOut).toHaveBeenCalledWith(stub.auth);
  });
});

describe('refreshUser', () => {
  it('relee al usuario y devuelve la foto actualizada', async () => {
    const user = { uid: 'u1', email: 'lulo@ejemplo.com', emailVerified: false };
    stub.auth.currentUser = user;
    // Simula lo que hace Firebase: muta el objeto en el lugar.
    reload.mockImplementation(async () => { user.emailVerified = true; });

    const fresh = await refreshUser();

    expect(reload).toHaveBeenCalledWith(user);
    expect(fresh).toEqual({ uid: 'u1', email: 'lulo@ejemplo.com', emailVerified: true });
  });

  it('sin sesión devuelve null sin llamar a Firebase', async () => {
    expect(await refreshUser()).toBeNull();
    expect(reload).not.toHaveBeenCalled();
  });
});
