import { CircleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { TopBar, type Crumb } from './components/TopBar'
import { RolePermissionsPage } from './features/roles/RolePermissionsPage'
import { NoAccess } from './components/NoAccess'
import { UsersPage } from './features/users/UsersPage'
import { PermissionsPage } from './features/permissions/PermissionsPage'
import { RolesPage } from './features/roles/RolesPage'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { SportsPage } from './features/sports/SportsPage'
import { SkillsPage } from './features/skills/SkillsPage'
import { TeamsPage } from './features/teams/TeamsPage'
import { TeamSportsPage } from './features/teams/TeamSportsPage'
import { PlayersPage } from './features/players/PlayersPage'
import { SESSION_EXPIRED_EVENT, clearSession, getSession, watchSessionExpiry } from './auth/session'
import { AccessContext, canOpenPage, defaultPage, makeCan } from './auth/access'
import { logout, me, type Me, type User } from './api/auth'
import { ApiError, errorMessage } from './api/client'
import { findMyProfile } from './api/profile'
import { handleOAuthRedirect } from './auth/oauth'
import './App.css'

type PageId =
  | 'usuarios'
  | 'roles'
  | 'roles-permisos'
  | 'permisos'
  | 'deportes'
  | 'equipos'
  | 'equipos-deportes'
  | 'jugadores'
  | 'habilidades'
  | 'perfil'

// Pantallas: el id coincide con el enlace (#usuarios, #roles...).
// Cada una da su miga de pan para la barra de arriba; page también va en el título de la pestaña.
const PAGES: Record<PageId, Crumb> = {
  usuarios: { section: 'Control de acceso', page: 'Usuarios' },
  roles: { section: 'Control de acceso', page: 'Roles' },
  // No está en el menú: se abre desde Roles ("Asignar permisos" o el botón Permisos de cada rol).
  'roles-permisos': { section: 'Roles', sectionHref: '#roles', page: 'Asignar permisos' },
  permisos: { section: 'Control de acceso', page: 'Permisos' },
  // Gestión deportiva (Anexo 2): ms_torneos_deportiva.
  deportes: { section: 'Gestión deportiva', page: 'Deportes' },
  equipos: { section: 'Gestión deportiva', page: 'Equipos' },
  // No está en el menú: se abre desde Equipos ("Asociar" en el detalle de un equipo).
  'equipos-deportes': { section: 'Equipos', sectionHref: '#equipos', page: 'Asociar deportes' },
  jugadores: { section: 'Gestión deportiva', page: 'Jugadores' },
  habilidades: { section: 'Gestión deportiva', page: 'Habilidades' },
  perfil: { section: 'Mi cuenta', page: 'Mi perfil' },
}

// Pantallas que no están en el menú: qué opción queda marcada mientras están abiertas.
const MENU_OWNER: Record<string, PageId> = { 'roles-permisos': 'roles', 'equipos-deportes': 'equipos' }

// Título de la pestaña sin sesión.
const AUTH_TITLES = { login: 'Iniciar sesión', register: 'Crear cuenta', forgot: 'Recuperar contraseña' }

function isPageId(value: string): value is PageId {
  return Object.hasOwn(PAGES, value)
}

interface Route {
  page: PageId | null // null: la URL no trae una pantalla válida
  param: string | null // lo que va después de la barra, ej: el id del rol en #roles-permisos/5
}

// Lee la pantalla de la URL (lo que va después del #): "#usuarios" o "#roles-permisos/5".
function routeFromHash(): Route {
  const [page, param] = window.location.hash.slice(1).split('/')
  return isPageId(page) ? { page, param: param || null } : { page: null, param: null }
}

// El id que viaja en la URL (#roles-permisos/5, #equipos-deportes/3); null si no es un número.
function idFrom(param: string | null): number | null {
  const id = Number(param)
  return param !== null && Number.isInteger(id) ? id : null
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  // Si venimos de Google/GitHub/Microsoft, guarda el token que trae la URL (o el error).
  const [oauthError] = useState(handleOAuthRedirect)
  // ¿Hay sesión guardada? Si no, mostramos el login.
  const [loggedIn, setLoggedIn] = useState(() => getSession() !== null)
  // Sin sesión mostramos "Iniciar sesión", "Crear cuenta" o "Recuperar contraseña".
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot'>('login')
  // Correo para dejar escrito en el formulario y aviso verde (ej: después de crear la cuenta).
  const [authEmail, setAuthEmail] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  // Pantalla de la URL. Cambia cuando se hace clic en un enlace (cambia el # de la URL).
  const [route, setRoute] = useState(routeFromHash)
  useEffect(() => {
    const handleHashChange = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Usuario de la sesión con sus roles y permisos (/api/auth/me).
  const [user, setUser] = useState<Me | null>(null)
  const [meError, setMeError] = useState<string | null>(null)
  const [meKey, setMeKey] = useState(0)
  // Foto del perfil para el avatar del encabezado; null si no tiene perfil o no puso foto.
  const [photo, setPhoto] = useState<string | null>(null)

  // Al entrar, pedimos al backend quién es el usuario de este token y la foto de su perfil.
  useEffect(() => {
    if (!loggedIn) return
    let active = true
    me()
      .then((current) => {
        if (active) setUser(current)
      })
      .catch((err) => {
        // Un 401 ya cerró la sesión (client.ts); cualquier otro error se muestra con "Reintentar".
        if (active && !(err instanceof ApiError && err.status === 401)) setMeError(errorMessage(err))
      })
    findMyProfile()
      .then((profile) => {
        if (active) setPhoto(profile.photo)
      })
      .catch(() => {
        // 404: todavía no tiene perfil. El avatar muestra las iniciales.
        if (active) setPhoto(null)
      })
    return () => {
      active = false
    }
  }, [loggedIn, meKey])

  // Lo que la sesión puede hacer, para el menú y los botones de cada pantalla (HU-SE-08).
  const can = useMemo(() => makeCan(user?.permissions ?? []), [user])
  const access = useMemo(() => ({ can, userId: user?.id ?? null }), [can, user])

  // Sin pantalla en la URL se abre la primera que el usuario puede usar; null hasta saber sus permisos.
  const activeId = route.page ?? (user ? defaultPage(can) : null)

  const tabTitle = !loggedIn ? AUTH_TITLES[authView] : activeId ? PAGES[activeId].page : null
  useEffect(() => {
    document.title = tabTitle ? `${tabTitle} · Arcanos` : 'Arcanos'
  }, [tabTitle])

  // Sesión vencida o rechazada por el backend: volvemos al login con un aviso (HU-SE-08).
  useEffect(() => {
    function handleExpired() {
      setUser(null)
      setPhoto(null)
      setMeError(null)
      setLoggedIn(false)
      setAuthView('login')
      setNotice('Tu sesión expiró. Inicia sesión de nuevo.')
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired)
  }, [])

  // Al llegar la hora de vencimiento se vuelve al login aunque no se haga ninguna petición.
  // Va después del efecto anterior para que el aviso ya tenga quién lo escuche.
  useEffect(() => {
    if (!loggedIn) return
    return watchSessionExpiry()
  }, [loggedIn])

  function showLogin(email: string, message: string | null) {
    setAuthEmail(email)
    setNotice(message)
    setAuthView('login')
  }

  async function handleLogout() {
    try {
      await logout() // el backend invalida el token
    } catch {
      // Aunque el backend no responda, cerramos la sesión en este navegador.
    } finally {
      clearSession()
      setUser(null)
      setPhoto(null)
      setMeError(null)
      setNotice(null)
      setLoggedIn(false)
    }
  }

  // El menú "Mi cuenta" devuelve el usuario sin roles ni permisos (2FA): se conservan los que había.
  function handleUserChange(updated: User) {
    setUser((current) => (current ? { ...current, ...updated } : current))
  }

  if (!loggedIn) {
    if (authView === 'register') {
      return (
        <RegisterPage
          onRegistered={(email) => showLogin(email, 'Cuenta creada. Ya puedes iniciar sesión.')}
          onBack={() => showLogin('', null)}
        />
      )
    }
    if (authView === 'forgot') {
      return (
        <ForgotPasswordPage
          initialEmail={authEmail}
          onDone={(email, message) => showLogin(email, message)}
          onBack={() => showLogin(authEmail, null)}
        />
      )
    }
    return (
      <LoginPage
        onLoggedIn={() => {
          setNotice(null)
          setMeError(null)
          setLoggedIn(true)
        }}
        initialError={oauthError}
        notice={notice}
        initialEmail={authEmail}
        onCreateAccount={() => {
          setNotice(null)
          setAuthView('register')
        }}
        onForgotPassword={(email) => {
          setAuthEmail(email)
          setNotice(null)
          setAuthView('forgot')
        }}
      />
    )
  }

  function renderPage() {
    // activeId solo es null mientras falta el usuario.
    if (user === null || activeId === null) {
      return meError ? (
        <div className="page">
          <div className="inline-error" role="alert">
            <CircleAlert size={16} aria-hidden="true" />
            <span>{meError}</span>
            <button
              type="button"
              className="text-action"
              onClick={() => {
                setMeError(null)
                setMeKey((key) => key + 1)
              }}
            >
              Reintentar
            </button>
          </div>
        </div>
      ) : (
        <p className="empty-state">Cargando tu sesión…</p>
      )
    }
    // Ninguno de sus roles da el permiso que pide esta pantalla: se explica en vez de mostrar un 403.
    if (!canOpenPage(activeId, can)) {
      return <NoAccess page={PAGES[activeId].page} roles={user.roles} />
    }
    switch (activeId) {
      case 'roles':
        return <RolesPage />
      case 'roles-permisos':
        // La key vuelve a montar la pantalla si la URL pide otro rol (por ejemplo, con "Atrás").
        return <RolePermissionsPage key={route.param ?? 'inicial'} initialRoleId={idFrom(route.param)} />
      case 'usuarios':
        return <UsersPage onOwnPhotoChange={setPhoto} />
      case 'permisos':
        return <PermissionsPage />
      case 'deportes':
        return <SportsPage />
      case 'equipos':
        return <TeamsPage />
      case 'equipos-deportes':
        return <TeamSportsPage key={route.param ?? 'inicial'} initialTeamId={idFrom(route.param)} />
      case 'jugadores':
        return <PlayersPage />
      case 'habilidades':
        return <SkillsPage />
      case 'perfil':
        return <ProfilePage user={user} onPhotoChange={setPhoto} />
    }
  }

  return (
    <AccessContext value={access}>
      <div className="app-shell">
        {/* "Asignar permisos" es parte de Roles y "Asociar deportes", de Equipos: el menú marca al dueño. */}
        <Sidebar
          activeId={MENU_OWNER[activeId ?? ''] ?? activeId}
          open={menuOpen}
          onClose={closeMenu}
          canOpen={(pageId) => canOpenPage(pageId, can)}
          roles={user?.roles ?? null}
        />
        <div className="workspace">
          <TopBar
            crumb={activeId ? PAGES[activeId] : null}
            menuOpen={menuOpen}
            onOpenMenu={() => setMenuOpen(true)}
            user={user}
            photo={photo}
            onUserChange={handleUserChange}
            onLogout={handleLogout}
          />
          <main className="canvas">{renderPage()}</main>
        </div>
      </div>
    </AccessContext>
  )
}

export default App
