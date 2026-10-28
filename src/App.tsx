import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { RolePermissionsPage } from './features/roles/RolePermissionsPage'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <Sidebar activeId="roles" />
      <main className="content">
        <TopBar
          title="Asignar Permisos a Roles"
          subtitle="Administra de manera centralizada los permisos que puede ejecutar cada rol del sistema."
        />
        <RolePermissionsPage />
      </main>
    </div>
  )
}

export default App
