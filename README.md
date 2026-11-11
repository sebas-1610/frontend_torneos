# frontend_torneos

Front de **Arcanos**, la plataforma de torneos. Cubre el módulo de seguridad (HU-SE-01 a 10 del Anexo 1), sobre el microservicio `ms_torneos_security`, y está en curso el de gestión deportiva (HU-GD-01 a 08 del Anexo 2), sobre `ms_torneos_deportiva`.

React 19 · TypeScript · Vite 8 · íconos de lucide-react.

## Requisitos

- Node.js 20.19 o más reciente (Vite 8 pide 20.19+ o 22.12+).
- `ms_torneos_security` corriendo en `http://localhost:8181`. Su README explica cómo configurarlo.
- `ms_torneos_deportiva` corriendo en `http://localhost:8182`, para las pantallas de gestión deportiva.
- Opcional: `ms_notificaciones` en `http://localhost:5000`, para que lleguen los correos de verificación en dos pasos y de recuperar contraseña.

## Cómo correrlo

```powershell
npm install    # la primera vez, o cuando cambie package.json
npm run dev
```

Abre `http://localhost:5173` e inicia sesión con el `ADMIN_EMAIL` y el `ADMIN_PASSWORD` que configuraste en el backend.

> Debe quedar en el puerto **5173**: al terminar el login con Google o GitHub, el backend devuelve al usuario a `http://localhost:5173/`. Si Vite avisa que el puerto está ocupado y abre otro, cierra la otra instancia.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo; los cambios se ven al guardar |
| `npm run build` | Revisa los tipos (`tsc -b`) y genera la versión final en `dist/` |
| `npm run preview` | Sirve `dist/` para probar la versión final |
| `npm run lint` | Revisa el código con ESLint; no afecta la ejecución |

## Conexión con el backend

- Todas las peticiones van a `/api/...` y Vite las redirige según la ruta (ver `vite.config.ts`):
  - `/api/deportiva/...` → `ms_torneos_deportiva` en `http://localhost:8182`;
  - el resto de `/api/...` → `ms_torneos_security` en `http://localhost:8181`.

  Los backends no tienen CORS configurado, así que el front siempre debe correr con `npm run dev` o `npm run preview`, que usan ese proxy.
- `ms_torneos_deportiva` no valida el token por su cuenta: en cada petición le pregunta a `ms_torneos_security` si el usuario tiene el permiso. Si security está apagado, deportiva responde 503.
- El login con Google o GitHub no pasa por el proxy: el navegador va directo al backend (`/oauth2/authorization/...`) y vuelve al front con el token en la URL. El front lo guarda y lo quita de la barra de direcciones.
- El botón de Microsoft aparece, pero ese proveedor todavía no está configurado en el backend.

Solo si algún backend no está en su puerto:

| Variable | Para qué | Por defecto |
|---|---|---|
| `API_PROXY_TARGET` | A dónde redirige Vite las peticiones `/api` | `http://localhost:8181` |
| `DEPORTIVA_PROXY_TARGET` | A dónde redirige Vite las peticiones `/api/deportiva` | `http://localhost:8182` |
| `VITE_BACKEND_URL` | A dónde va el navegador para el login con Google o GitHub | `http://localhost:8181` |

```powershell
$env:API_PROXY_TARGET = "http://localhost:8182"; npm run dev
```

## Pantallas

| Pantalla | Dirección | HU | Quién la ve |
|---|---|---|---|
| Iniciar sesión (con código de dos pasos si está activo), crear cuenta y recuperar contraseña | — | SE-07, SE-08, SE-09, SE-10 | Cualquiera, sin sesión |
| Usuarios: lista, crear, editar, activar, desactivar y eliminar; perfil y roles de cada usuario | `#usuarios` | SE-01, SE-02, SE-04 | Permiso `usuarios · Listar` |
| Roles: lista, crear, editar, eliminar y sus usuarios | `#roles` | SE-03, SE-04 | Permiso `roles · Listar` |
| Asignar permisos: matriz de casillas de un rol | `#roles-permisos/{id}` | SE-06 | `roles · Listar` y `asignación de permisos · Ver`; para guardar, `· Actualizar` |
| Permisos: lista, crear, editar y eliminar | `#permisos` | SE-05 | Permiso `permisos · Listar` |
| Mi perfil: teléfono, foto y fecha de nacimiento | `#perfil` | SE-02 | Cualquier usuario con sesión |
| Menú de la cuenta (arriba a la derecha): verificación en dos pasos | — | SE-10 | Usuarios de correo y contraseña |
| Botón de cerrar sesión (arriba a la derecha) | — | SE-08 | Cualquier usuario con sesión |

## Permisos y sesión

- Al entrar, el front pide `/api/auth/me`, que trae los roles y permisos del usuario. Con eso muestra solo las opciones del menú y los botones que puede usar (`src/auth/access.ts`). Ocultar es solo visual: el backend valida cada petición igual.
- Un usuario sin roles solo ve Mi perfil.
- La sesión dura lo que indique el backend (30 minutos). Al vencer, o si el backend rechaza el token, el front vuelve al login con un aviso.
- En el `localStorage` del navegador quedan la sesión (`sportmanager.session`) y el tema claro u oscuro (`sportmanager-theme`).

## Estructura

```
src/
  api/          peticiones al backend, un archivo por recurso
  auth/         sesión, login con proveedores y permisos de la sesión
  components/   partes comunes: barra lateral, encabezado, ventana de confirmación
  features/     una carpeta por pantalla: auth, users, roles, permissions, profile
  hooks/        useConfirm (confirmaciones) y animación de números
  theme/        tema claro y oscuro
  utils/        utilidades pequeñas (iniciales del avatar)
```

## Diseño

- Estilo "true-black flat": colores, tipografías y medidas están como variables en `src/index.css` y `src/App.css`. Las pantallas nuevas deben usar esas variables.
- La guía completa del estilo y de cómo se arma una pantalla está en la skill `sportmanager-frontend` (`proyecto/.claude/skills/`).
- El dorado se usa solo para datos y el rojo solo para acciones que borran o quitan algo.
- Para pedir confirmación se usa `useConfirm` (ventana con el estilo del proyecto), no `window.confirm`.
