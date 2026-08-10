import { createContext } from 'react';

/* El "contexto" es un canal por el que un valor baja a todo el árbol de componentes sin
   ir pasándolo de padre a hijo. Acá viaja la sesión: quién está logueado y en qué estado.

   El objeto del contexto vive solo, sin componentes ni hooks al lado, para que Vite pueda
   hacer hot-reload de los otros archivos sin recrearlo. */
export const AuthContext = createContext(null);
