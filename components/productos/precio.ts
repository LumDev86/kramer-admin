// Costo, precio y ganancia están atados por precio = costo * (1 + ganancia/100). Estas cuentas las
// usan tanto el listado (edición en la fila) como el formulario, para que den siempre lo mismo.

export const redondear = (n: number) => Math.round(n * 100) / 100;

// null si no hay costo cargado: sin costo no hay ganancia que mostrar
export function gananciaPct(costo: number | null, precio: number): number | null {
  if (!costo || costo <= 0 || isNaN(precio)) return null;
  return ((precio - costo) / costo) * 100;
}

export const precioConGanancia = (costo: number, pct: number) => redondear(costo * (1 + pct / 100));

// cambia el costo conservando el % de ganancia que ya tenía el producto
export const precioManteniendoMargen = (costoAnterior: number, precioAnterior: number, costoNuevo: number) =>
  redondear(costoNuevo * (precioAnterior / costoAnterior));

// 34 / 34.5 (sin ceros de más) - sirve como texto y como valor de un input numérico
export const pctValor = (pct: number) => String(Number(pct.toFixed(1)));

// precio sugerido para publicar en PedidosYa, que se queda con una comisión
export const PEDIDOSYA_RECARGO = 40;
