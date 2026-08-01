# Convenciones para agregar una nueva sección al admin

Leer esto antes de armar una sección nueva. Estos son los patrones que ya sigue el proyecto — replicarlos en vez de inventar otros.

## Estructura de una sección (`app/(admin)/<nombre>/`)

Ejemplos de referencia: `distribuidoras/`, `clientes/`.

- `page.tsx` — listado. Si la lista puede crecer mucho, paginado + buscador (patrón de `productos/page.tsx`: `useState` de `search`/`page`, `useQuery(['<nombre>', {search, page}], ...)`). Si es chico y no necesita buscador, un array plano alcanza (patrón de `distribuidoras/page.tsx`).
- `nuevo/page.tsx` — wrapper delgado: breadcrumb + `<XForm />` sin props.
- `[id]/editar/page.tsx` — wrapper delgado: `useQuery` para traer el registro + `<XForm x={x} />`.
- `[id]/page.tsx` — detalle, si aplica (datos + historial relacionado).

## Formulario compartido (`components/forms/<Nombre>Form.tsx`)

Un solo componente para alta y edición: prop `x?: X` opcional (si viene, `isEdit = true`). Estado por campo con `useState`, `handleSubmit` llama `x.create(...)` o `x.update(...)`, invalida la query `['<nombre>']`, `router.push('/<nombre>')`. Ver `DistribuidorForm.tsx`/`ClienteForm.tsx`.

## `lib/api.ts`

- Un `interface X` por recurso + un objeto `x` con las funciones (`getAll`, `getById`, `create`, `update`, ...) usando el helper genérico `request<T>`.
- Recursos que pueden crecer mucho devuelven `PaginatedResponse<T>` (`{data, meta: {total, page, limit, totalPages}}`), igual que `products.getAll`.
- No modificar `request<T>` — ya maneja token, JSON vs FormData, y errores.

## Componentes UI reutilizables (`components/ui/`)

- `ConfirmModal.tsx` — confirmación de acciones destructivas/sensibles.
- `ToggleSwitch.tsx` — para campos `isActive` (dar de baja/alta), con mutation + invalidate simple (no hace falta el patrón optimista de `productos/page.tsx` salvo que la acción se dispare muy seguido).
- Modales de búsqueda (`ProductSearchModal.tsx`, `ClienteSearchModal.tsx`) — mismo esqueleto clonable para un recurso nuevo: input con foco automático, `useQuery` paginado, cierre con Escape/click-afuera, `onSelect`/`onClose` como props. Copiar y cambiar el `queryFn` + el render de cada fila.

## Sidebar (`components/layout/Sidebar.tsx`)

Agregar un objeto `{ href, label, icon }` al array `NAV` (ícono de `@phosphor-icons/react`). No hace falta tocar la lógica de `isActive`.

## Deploy

Automático: `git push origin main` dispara el deploy en Vercel. **Siempre confirmar con el usuario antes de pushear** (afecta producción directamente, no hay ambiente de staging).

## Antes de dar por terminado

1. `npx tsc --noEmit` limpio.
2. `npm run build` limpio (revisar que las rutas nuevas aparezcan en el resumen de rutas del build).
3. Si el cambio requiere backend nuevo, verificar primero que el endpoint responda como se espera (ver `server/PROJECT_PATTERNS.md`) antes de dar la parte de frontend por probada.
