import { useCallback, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { RolePermissionsPage } from './features/roles/RolePermissionsPage'
import './App.css'

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  return (
    <div className="app-shell">
      <Sidebar activeId="roles" open={menuOpen} onClose={closeMenu} />
      <div className="workspace">
        <TopBar section="Roles" page="Asignar permisos" menuOpen={menuOpen} onOpenMenu={() => setMenuOpen(true)} />
        <main className="canvas">
          <RolePermissionsPage />
        </main>
      </div>
    </div>
  )
}

export default App
