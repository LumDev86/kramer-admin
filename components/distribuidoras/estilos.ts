// inputs chicos con borde que van dentro de las filas de una factura (cantidad, costo, precio…).
// A diferencia del listado de productos (subrayado punteado), acá se edita casi todo, así que
// cada campo se ve como campo.
export const celdaInput =
  'no-spin box-border w-full min-w-0 min-h-10 rounded-[10px] border-[1.5px] border-kr-line bg-kr-paper px-2 py-1.5 text-[15px] font-extrabold tabular-nums text-kr-navy outline-none placeholder:text-kr-muted/70 focus:border-kr-blue disabled:opacity-50';

// etiqueta que acompaña cada campo cuando la fila se muestra como tarjeta (celular/tablet)
export const celdaLabel = 'text-[11px] font-extrabold uppercase tracking-wide text-kr-muted';
