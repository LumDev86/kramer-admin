# Kramer Admin

Panel de administración y punto de venta (POS) de Kramer. Aplicación web para uso interno del comercio: ventas en mostrador, carga de stock, facturas de proveedores y reportes de caja.

## Funcionalidades

- **Ventas (POS)**: escaneo de código de barras, búsqueda manual de productos con paginación, cobro con método de pago opcional, cuenta corriente/fiado por cliente.
- **Productos**: alta y edición, precio por mayor y por menor, cálculo de ganancia, generador interno de código de barras, eliminación de fondo de foto de producto por IA.
- **Facturas de proveedores**: carga por foto con reconocimiento por IA (lectura de renglones, precios y subtotales), aviso cuando el costo de un producto subió o bajó respecto a la última compra.
- **Clientes**: alta, historial y cuenta corriente (fiado).
- **Distribuidoras**: gestión de proveedores.
- **Categorías y banners**: organización del catálogo y contenido promocional.
- **Caja**: apertura/cierre de caja.
- **Reportes**: ventas, ganancia por categoría, ranking de productos vendidos.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19 + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/)
- [TanStack Query](https://tanstack.com/query) para el manejo de datos remotos
- [@imgly/background-removal](https://img.ly/) para el recorte de fondo de fotos de producto

Consume la API de [kramer-api](https://github.com/LumDev86/kramer-api).

## Desarrollo local

```bash
npm install
npm run dev
```

Variables de entorno (`.env.local`):

```
NEXT_PUBLIC_API_URL=
```

## Deploy

Desplegado en [Vercel](https://kramer-admin.vercel.app).
