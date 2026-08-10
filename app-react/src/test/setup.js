// Se corre antes de cada archivo de test (lo configura vite.config.js).
// jest-dom agrega matchers que se leen como una oración:
//   expect(boton).toBeDisabled()   en vez de   expect(boton.disabled).toBe(true)
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Desmonta lo que haya quedado montado: cada test arranca con el DOM limpio.
afterEach(() => cleanup());
