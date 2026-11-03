import { ShieldOff, UserRound } from 'lucide-react'

interface NoAccessProps {
  page: string // nombre de la pantalla, ej: "Usuarios"
  roles: string[] // roles de la sesión
}

// Se muestra en vez de una pantalla cuando ninguno de los roles da el permiso que esa pantalla pide
// (HU-SE-08). Así no se llama al backend para recibir un 403 genérico.
export function NoAccess({ page, roles }: NoAccessProps) {
  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">{page}</h1>
      </div>
      <section className="panel no-access" aria-labelledby="no-access-title">
        <span className="no-access__icon" aria-hidden="true">
          <ShieldOff size={22} strokeWidth={1.8} />
        </span>
        <h2 id="no-access-title" className="no-access__title">
          No tienes acceso a {page}
        </h2>
        <p className="no-access__text">
          {roles.length === 0
            ? 'Todavía no tienes roles asignados, así que no puedes usar las opciones de administración.'
            : `Ninguno de tus roles (${roles.join(', ')}) incluye el permiso para esta pantalla.`}{' '}
          Pide a un administrador que te asigne un rol con ese permiso.
        </p>
        <a className="button button--outline" href="#perfil">
          <UserRound size={16} aria-hidden="true" />
          Ir a Mi perfil
        </a>
      </section>
    </div>
  )
}
