'use client';

import { useEffect, useRef } from 'react';

// F10 = "buscar producto", igual que en Ventas. Puede haber más de un buscador montado a la vez
// (ej. en Distribuidoras: el de la factura manual de la página y el del detalle de una factura
// abierto encima), así que se arma una pila y solo responde el último que se montó - el que el
// usuario tiene adelante - para que una sola tecla no abra dos buscadores superpuestos.
const stack: { current: () => void }[] = [];
let listening = false;

function handleKeyDown(e: KeyboardEvent) {
  if (e.key !== 'F10') return;
  const top = stack[stack.length - 1];
  if (!top) return;
  // preventDefault evita que el navegador lo tome como atajo para activar la barra de menú
  e.preventDefault();
  top.current();
}

export function useF10(onF10: () => void) {
  const ref = useRef(onF10);
  useEffect(() => {
    ref.current = onF10;
  });

  useEffect(() => {
    const entry = ref;
    stack.push(entry);
    if (!listening) {
      window.addEventListener('keydown', handleKeyDown);
      listening = true;
    }
    return () => {
      const i = stack.lastIndexOf(entry);
      if (i !== -1) stack.splice(i, 1);
      if (stack.length === 0) {
        window.removeEventListener('keydown', handleKeyDown);
        listening = false;
      }
    };
  }, []);
}
