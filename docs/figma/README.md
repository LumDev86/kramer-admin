# Diseño en Figma — Kiosco Kramer

Archivo: **Rediseño Kramer — Kiosco Pop**
https://www.figma.com/design/BHdCiIjDR2HGNIvK5tyXch/Redise%25C3%25B1o-Kramer-%25E2%2580%2594-Kiosco-Pop

Está en los borradores (Drafts) de la cuenta de Lucas, plan **Starter (gratis)**: máximo 3 páginas por archivo.
Armado el 2026-10-13, después de publicar el rediseño del panel.

## Páginas

### 1. Portada
Frame de 1920×1080 en navy con el logo, el título y tres etiquetas. Es también la miniatura del archivo.

### 2. Sistema de diseño
Hecho con herramientas reales de Figma (se pueden reutilizar en otros archivos o pantallas nuevas):

- **Variables de color** — colección `Kramer · Colores`, 20 variables (`Marca/…` y `Neutros/…`), cada una con su uso y su hex en la descripción. Salen de los tokens `kr-*` de `admin/app/globals.css` y `client/src/app/globals.css`. Ojo: el crema de fondo es distinto en la tienda (`#FFF7E3`) y en el admin (`#FBF6EA`).
- **Estilos de texto** — 11: `Display/…` (Lilita One: títulos de pantalla, precios, títulos de sección) y `Texto/…` (Nunito: botón principal, cuerpo, etiquetas, chips, encabezado de tabla).
- **Estilos de sombra** — `Sombra pop/Chica|Media|Grande` (2/3/4 px, sin desenfoque, navy) y `Sombra pop/Foco azul` (input enfocado en la tienda).
- **Componentes con variantes**
  - `Botón` — Tipo = Primario, Confirmar, Secundario, Peligro, Fantasma, Principal tienda (igual a `components/ui/Button.tsx` y `botonPrincipal` de `client/src/lib/estilos.ts`).
  - `Chip` — Tono = Neutro, OK, Aviso, Info, Apagado, Alerta (igual a `components/ui/Chip.tsx`).
  - `Campo de texto` — Contexto = Admin/Tienda × Estado = Normal/Foco.
  - `Pestaña` — Estado = Activa/Inactiva (el Segmented).
- **Láminas**: Logo, Colores, Tipografía, Sombras y bordes, Componentes, Reglas de uso.

### 3. Pantallas y flujos
Todo en una página, con secciones de Figma:

- **Tienda web** (izquierda, celular 390 px): Home elegida · Flujo de compra (Ficha → Carrito → Checkout → Confirmado → Seguimiento, con flechas) · Cuenta del cliente (Ingresar → Crear cuenta → Recuperar → Contraseña nueva → Mi crédito) · Estados especiales.
- **Panel admin** (derecha, cada pantalla en escritorio 1280 / tablet 834 / celular 390), agrupado como el menú: Venta y pedidos · Catálogo · Compras · Clientes · Operación · Negocio.
- **Exploraciones descartadas** (abajo): home "Góndola" de la tienda y las 5 direcciones de estilo del admin (se eligió A · Pop sobrio).

Nombres: `Tienda · …`, `Admin · …`, `Exploración · …`.
**Las pantallas del admin que terminan en `· boceto` son los mockups del artefacto de diseño**, no el panel publicado (Ventas, Pedidos, Detalle de pedido, Productos, Formulario de producto, Categorías, Banners, Clientes, Reportes, Configuración). Las que no lo dicen son **capturas del panel real** (Distribuidoras, Detalle de distribuidora, Editor de factura, Cuenta corriente de cliente, Repartidores, Sugerencias) y muestran datos reales del negocio.

En la tienda siguen en gris los lugares de fotos de banners y productos (vinieron así del prototipo).

## Logo

El logo vigente es **`client/public/logo.png`** (800×800, fondo blanco). Desde el 2026-10-13 `admin/public/logo.png` es el mismo archivo (antes el panel usaba el logo viejo con fondo negro) y se sacó `admin/app/favicon.ico` (era el triángulo de Vercel de la plantilla): la pestaña usa `/logo.png` desde `app/layout.tsx`. **Si cambia el logo, reemplazarlo en los dos repos.**

## Cómo se pasaron las pantallas a Figma

Los caminos "oficiales" tienen límite en el plan gratis:
- **Conexión de Figma con Claude (MCP)**: el plan Starter se queda sin cupo enseguida (alcanzó para 1 pantalla con `html_to_figma`).
- **Plugin html.to.design**: deja importar 3 pantallas y después pide pagar.

Lo que funciona sin límite: **convertir cada pantalla a SVG** (Figma importa SVG nativo: textos editables, formas y vectores; sin auto layout) e importarlo.

Herramientas en `herramientas/`:

| Archivo | Qué hace |
|---|---|
| `dom2svg.js` | Recorre una página ya dibujada en el navegador y arma un SVG con capas: fondos, bordes, sombras duras, textos (un `<text>` por renglón, parte palabras largas), inputs, íconos SVG, imágenes como `data:` (achicadas a 320 px) y recortes. Descarta lo que queda fuera de la pantalla visible. Traduce los nombres de fuente de `next/font` (`__Nunito_abc123` → `Nunito`). |
| `capture.js` | Abre una ruta del panel en iframes de 1280×820, 834×1112 y 390×844, espera los datos, y arma un tablero con los 3 tamaños (mismo formato que los mockups). Guarda el SVG por POST al servidor local. |
| `serve.py` | Servidor local (puerto 8765) que sirve los archivos y guarda lo que le mandan por POST en `_out/`. Con CORS abierto. |
| `ver.html` | Visor para revisar un SVG con las fuentes de Google cargadas (`ver.html?f=archivo.svg`). |

### Paso a paso para capturar una pantalla del panel real

1. `python docs/figma/herramientas/serve.py <carpeta>` (sirve `<carpeta>`, guarda en `<carpeta>/_out/`). Copiar `dom2svg.js` y `capture.js` a esa carpeta.
2. Panel local prendido (`npm run dev -- -p 3001`) y con sesión iniciada en el navegador.
3. Abrir `http://localhost:3001/logo.png` (una página fija del mismo sitio: si se usa una página del panel, la recarga automática del modo desarrollo corta la captura).
4. En la consola de esa pestaña:
   ```js
   const c = await import('http://127.0.0.1:8765/capture.js?v=' + Date.now());
   await c.board('/distribuidoras', 'Admin-Distribuidoras');           // tercer parámetro: espera extra en ms
   ```
5. **Dejar esa pestaña al frente** mientras captura: Chrome frena los timers de las pestañas en segundo plano y la captura no avanza.
6. Revisar con `http://127.0.0.1:8765/ver.html?f=Admin-Distribuidoras.svg`.

No sirve capturar desde `kramer-admin.vercel.app`: el navegador bloquea que una página pública le hable a `127.0.0.1`. Por eso se captura desde el panel local (que usa la API y los datos de producción, solo lectura).

### Importar en Figma

- A mano: arrastrar los `.svg` al lienzo.
- Desde la web, automatizado: en la consola de una pestaña de Figma está disponible la API de plugins (`figma.*`), así que se pueden mover, renombrar y ordenar nodos, crear variables, estilos y componentes. Para soltar archivos se crea un `<input type=file>`, se cargan los SVG y se dispara un evento `drop` sobre el `<canvas>`. Ojo: si el punto del drop cae sobre otra pantalla, el SVG queda metido adentro de ese frame; después hay que sacarlo con `figma.currentPage.appendChild(nodo)`.
- En la consola de Figma no existe `figma.createAutoLayout` (es de la integración de Claude): usar `createFrame()` + `layoutMode`.

### Copias en el escritorio
`Escritorio\kramer-admin-figma\` tiene las 16 pantallas del admin y las 5 direcciones en HTML fijo y en SVG (`SVG para Figma\`). Las del admin marcadas como reales están actualizadas con el panel publicado.

## Pendientes
- Reemplazar las 10 pantallas `· boceto` del admin por capturas del panel real.
- Completar las fotos de banners y productos en las pantallas de la tienda.
