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
| Deportes: tarjetas con el balón de cada deporte (los subdeportes después de su padre), crear, agregar subdeporte, editar, activar, desactivar y eliminar; a la derecha, el detalle con sus subdeportes y equipos asociados | `#deportes` | GD-01, GD-03 | Permiso `deportes · Listar`; los equipos, `asignación de deportes · Listar` |
| Equipos: tabla con búsqueda, filtros de deporte y estado y orden por columna; crear, editar, activar, desactivar y eliminar; a la derecha, el detalle con sus datos (ciudad, fundación, nombre corto), sus cifras, su descripción y sus deportes | `#equipos` | GD-02, GD-03 | Permiso `equipos · Listar` |
| Asociar deportes: se elige un equipo y se le asocian o retiran deportes (disponibles a la izquierda, asociados a la derecha). Se abre desde el detalle de un equipo | `#equipos-deportes/{id}` | GD-03 | Permisos `equipos · Listar`, `deportes · Listar` y `asignación de deportes · Listar` |
| Jugadores: tabla con búsqueda, filtros de estado, equipo y deporte y orden por columna; crear, editar (con foto opcional, que se sube desde el formulario), activar, desactivar y eliminar; a la derecha, el detalle con su foto, edad, nacionalidad, posición, altura, pie dominante y equipo actual | `#jugadores` | GD-04 | Permiso `jugadores · Listar` |
| Plantilla: se elige un equipo; jugadores actuales (vigentes y por empezar) con retirar, historial (finalizados, retirados y cancelados) y detalle del equipo con sus cifras. "Asignar jugador" crea un contrato con fechas y avisa antes de enviar si se cruza con otro del mismo jugador. Se abre desde el detalle de un equipo | `#equipos-plantilla/{id}` | GD-05 | Permisos `equipos · Listar` y `contratos · Listar`; asignar pide además `jugadores · Listar` y `contratos · Crear`; retirar, `contratos · Actualizar` |
| Habilidades: tarjetas por categoría con el icono de cada habilidad, crear, editar, activar, desactivar y eliminar; a la derecha, el detalle con los jugadores que la tienen | `#habilidades` | GD-06, GD-07 | Permiso `habilidades · Listar`; los jugadores, `asignación de habilidades · Listar` |
| Asignar habilidades: se busca un jugador; habilidades disponibles (asignar, eligiendo el nivel de 1 a 100) y las del jugador (cambiar nivel, retirar), con el radar de capacidades, el resumen en barras y la media general. Se abre desde Habilidades ("Asignar a jugadores") o desde el detalle de un jugador | `#habilidades-jugadores/{id}` | GD-07 | Permisos `jugadores · Listar`, `habilidades · Listar` y `asignación de habilidades · Listar`; cambiar el nivel, `asignación de habilidades · Actualizar` |
| Mi perfil: teléfono, foto y fecha de nacimiento | `#perfil` | SE-02 | Cualquier usuario con sesión |
| Menú de la cuenta (arriba a la derecha): verificación en dos pasos | — | SE-10 | Usuarios de correo y contraseña |
| Botón de cerrar sesión (arriba a la derecha) | — | SE-08 | Cualquier usuario con sesión |

## Permisos y sesión

- Al entrar, el front pide `/api/auth/me`, que trae los roles y permisos del usuario. Con eso muestra solo las opciones del menú y los botones que puede usar (`src/auth/access.ts`). Ocultar es solo visual: el backend valida cada petición igual.
- Un usuario sin roles solo ve Mi perfil.
- Al entrar sin una pantalla en la dirección, se abre la primera que puede usar: el Administrador entra a Roles y el Administrador deportivo, a Deportes.
- La sesión dura lo que indique el backend (30 minutos). Al vencer, o si el backend rechaza el token, el front vuelve al login con un aviso.
- En el `localStorage` del navegador quedan la sesión (`sportmanager.session`) y el tema claro u oscuro (`sportmanager-theme`).

## Estructura

```
src/
  api/          peticiones al backend, un archivo por recurso
  auth/         sesión, login con proveedores y permisos de la sesión
  components/   partes comunes: barra lateral, encabezado, ventana de confirmación
  features/     una carpeta por pantalla: auth, users, roles, permissions, profile, sports, teams, players, skills
  hooks/        useConfirm (confirmaciones), useToast (avisos de éxito), useLoadList (cargar una lista), useSort (ordenar una tabla) y animación de números
  theme/        tema claro y oscuro
  utils/        utilidades pequeñas (iniciales del avatar, tono del monograma, fechas y edad, reducir la foto de un jugador)
```

## Diseño

- Estilo "true-black flat": colores, tipografías y medidas están como variables en `src/index.css` y `src/App.css`. Las pantallas nuevas deben usar esas variables.
- La guía completa del estilo y de cómo se arma una pantalla está en la skill `sportmanager-frontend` (`proyecto/.claude/skills/`).
- El dorado se usa solo para datos y el rojo solo para acciones que borran o quitan algo.
- Excepción: en Gestión deportiva, los iconos de deportes y habilidades llevan color propio (variables `--tone-*` de `src/index.css`), solo en el icono.
- Todas las pantallas de lista (Usuarios, Roles, Permisos, Deportes, Equipos, Jugadores y Habilidades) y las de asociación (Asociar deportes, Plantilla, Asignar habilidades) llevan además una capa con más color, parecida a los mockups (`src/components/Vivid.css`, clase `page--vivid`): paneles con borde, elemento elegido en dorado, botones de color y acción principal dorada. Se arman con piezas comunes: `PageHeading` y `PanelHead` (`src/components/PageHeading.tsx`), las de la lista (`ListToolbar`, `ListPanel`, `RowActions`/`RowAction` y `StatusPill` en `src/components/ListView.tsx`) y las del panel de detalle (`src/components/DetailPanel.tsx`). Asignar permisos y Mi perfil siguen con el estilo plano.
- Todas las pantallas (inicio de sesión, registro, recuperar contraseña y el panel) tienen de fondo un patrón de dibujos deportivos a trazo (`src/assets/doodles.svg`, usado como máscara en `body::before`, `src/index.css`), fijo al bajar por la página. Su color e intensidad salen de la variable `--doodle` de `src/index.css`, una por tema.
- La foto de un jugador y el escudo de un equipo se eligen en su formulario (`src/components/ImageField.tsx`). El navegador los reduce antes de enviarlos (`src/utils/image.ts`): la foto se recorta en cuadrado (256 px, JPG); el escudo se ve entero, con su fondo transparente (192 px, WEBP o PNG).
- Un equipo se dibuja con su escudo o, si no tiene, con sus iniciales en un círculo (`src/components/TeamMonogram.tsx`). Las respuestas que traen un equipo de paso (el equipo actual de un jugador, los equipos de un deporte) no traen el escudo: se toma de la lista de equipos ya cargada (`src/api/teams.ts`).
- Para pedir confirmación se usa `useConfirm` (ventana con el estilo del proyecto), no `window.confirm`.
