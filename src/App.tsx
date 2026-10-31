import { useCallback, useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { RolePermissionsPage } from './features/roles/RolePermissionsPage'
import { ComingSoon } from './components/ComingSoon'
import { UsersPage } from './features/users/UsersPage'
import { PermissionsPage } from './features/permissions/PermissionsPage'
import { RolesPage } from './features/roles/RolesPage'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage'
import { SESSION_EXPIRED_EVENT, clearSession, getSession } from './auth/session'
import { logout, me, type User } from './api/auth'
import { handleOAuthRedirect } from './auth/oauth'
import './App.css'

// Pantallas del menú lateral: el id coincide con el enlace (#usuarios, #roles...).
// section y page son lo que se muestra en la barra de arriba.
const PAGES: Record<string, { section: string; page: string }> = {
  dashboard: { section: 'Inicio', page: 'Dashboard' },
  usuarios: { section: 'Control de acceso', page: 'Usuarios' },
  roles: { section: 'Control de acceso', page: 'Roles' },
  // No está en el menú: se abre con el botón "Asignar permisos" de Roles.
  'roles-permisos': { section: 'Roles', page: 'Asignar permisos' },
  permisos: { section: 'Control de acceso', page: 'Permisos' },
  seguridad: { section: 'Control de acceso', page: 'Seguridad' },
  auditoria: { section: 'Control de acceso', page: 'Auditoría' },
}

// Lee la pantalla de la URL (lo que va después del #). Si no hay o no existe, abre Roles.
function pageFromHash(): string {
  const id = window.location.hash.slice(1)
  return id in PAGES ? id : 'roles'
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

  // Pantalla abierta. Cambia cuando se hace clic en un enlace del menú (cambia el # de la URL).
  const [activeId, setActiveId] = useState(pageFromHash)
  useEffect(() => {
    const handleHashChange = () => setActiveId(pageFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Usuario de la sesión (para el encabezado y el menú "Mi cuenta").
  const [user, setUser] = useState<User | null>(null)

  // Al entrar, pedimos al backend quién es el usuario de este token.
  useEffect(() => {
    if (!loggedIn) return
    let active = true
    me()
      .then((current) => {
        if (active) setUser(current)
      })
      .catch(() => {
        // Si falla, el encabezado muestra "Mi cuenta". Si fue un 401, la sesión ya se cerró sola.
      })
    return () => {
      active = false
    }
  }, [loggedIn])

  // Sesión vencida o rechazada por el backend: volvemos al login con un aviso (HU-SE-08).
  useEffect(() => {
    function handleExpired() {
      setUser(null)
      setLoggedIn(false)
      setAuthView('login')
      setNotice('Tu sesión expiró. Inicia sesión de nuevo.')
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired)
  }, [])

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
      setNotice(null)
      setLoggedIn(false)
    }
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

  return (
    <div className="app-shell">
      {/* "Asignar permisos" es parte de Roles: en el menú se marca Roles. */}
      <Sidebar activeId={activeId === 'roles-permisos' ? 'roles' : activeId} open={menuOpen} onClose={closeMenu} />
      <div className="workspace">
        <TopBar
          section={PAGES[activeId].section}
          page={PAGES[activeId].page}
          menuOpen={menuOpen}
          onOpenMenu={() => setMenuOpen(true)}
          user={user}
          onUserChange={setUser}
          onLogout={handleLogout}
        />
        <main className="canvas">
          {activeId === 'roles' ? (
            <RolesPage />
          ) : activeId === 'roles-permisos' ? (
            <RolePermissionsPage />
          ) : activeId === 'usuarios' ? (
            <UsersPage />
          ) : activeId === 'permisos' ? (
            <PermissionsPage />
          ) : (
            <ComingSoon title={PAGES[activeId].page} />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
