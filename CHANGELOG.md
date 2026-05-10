# Changelog

## v0.2.2 - 2026-05-10

- Reemplazado `api/[...path].js` por endpoints explicitos para evitar errores de routing en Vercel.
- Agregada libreria compartida `api/_lib/cmsApi.js` para auth, sesiones, proyectos y exportacion.
- Mejorado el cliente para reportar cuando una API devuelve HTML o una respuesta no JSON.

### Verificacion

- `npm run lint`
- `npm run build`
- Prueba directa de endpoints `auth/login`, `auth/status` y `projects`.

## v0.2.1 - 2026-05-10

- Corregido el login en Vercel agregando API Routes reales en `api/[...path].js`.
- Agregado soporte para credenciales por variables de entorno en Vercel.
- Agregada documentacion de despliegue en Vercel y limitaciones de filesystem serverless.

### Verificacion

- `npm run lint`
- `npm run build`

## v0.2.0 - 2026-05-10

- Nuevo sistema visual claro para el admin, con mejor contraste, estados de foco y una jerarquia mas limpia.
- Mejoras responsive en login, selector de proyectos, navegacion, builder y preview para trabajar mejor en pantallas medianas y pequenas.
- Mejoras de accesibilidad: `aria-busy`, `role=status`, `aria-current` y etiquetas descriptivas para el canvas editable.
- Nuevo documento `PRODUCT.md` con usuarios, proposito del producto, personalidad de marca, principios de diseno y objetivo WCAG AA.
- Integracion de medicion en la app base con Google Analytics y Microsoft Clarity.

### Verificacion

- `npm run lint`
- `npm run build`
