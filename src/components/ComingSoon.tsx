// Pantalla temporal para las opciones del menú que todavía no están hechas.
interface ComingSoonProps {
  title: string
}

export function ComingSoon({ title }: ComingSoonProps) {
  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">{title}</h1>
      </div>
      <p className="empty-state">Esta pantalla todavía está en construcción.</p>
    </div>
  )
}
