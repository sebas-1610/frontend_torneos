import { request } from './client'
import type { PlayerSummary } from './players'
import type { TeamSummary } from './teams'

// Rutas de /api/deportiva/team-players (HU-GD-05): los contratos de los jugadores con los equipos.
// No hay edición ni borrado: un contrato que cambia se retira y se crea otro; retirar lo deja en el
// historial.

// El estado no se guarda: el backend lo calcula con las fechas cada vez.
export type ContractStatus = 'VIGENTE' | 'FUTURO' | 'FINALIZADO' | 'RETIRADO'

export interface Contract {
  id: number
  team: TeamSummary
  player: PlayerSummary // sin foto: se toma de la lista de jugadores
  startDate: string // "AAAA-MM-DD"
  endDate: string // el fin pactado
  retiredAt: string | null // el día en que lo retiraron, si pasó antes del fin pactado
  status: ContractStatus
}

export interface ContractInput {
  teamId: number
  playerId: number
  startDate: string
  endDate: string
}

// Todos los contratos de un equipo (vigentes, por empezar e historial), por apellidos del jugador.
export function findContractsByTeam(teamId: number): Promise<Contract[]> {
  return request<Contract[]>(`/deportiva/team-players/teams/${teamId}`)
}

// 409 si el jugador ya tiene con ese equipo un contrato que se cruza con esas fechas; 400 si el
// equipo o el jugador están desactivados.
export function assignPlayer(input: ContractInput): Promise<Contract> {
  return request<Contract>('/deportiva/team-players', { method: 'POST', body: JSON.stringify(input) })
}

// Cierra el contrato con la fecha de hoy. Si todavía no empezaba, queda cancelado.
export function retireContract(id: number): Promise<Contract> {
  return request<Contract>(`/deportiva/team-players/${id}/retire`, { method: 'PATCH' })
}

// Hasta cuándo duró de verdad: la fecha de retiro si lo retiraron; si no, su fin pactado.
export function effectiveEnd(contract: Contract): string {
  return contract.retiredAt ?? contract.endDate
}

// ¿Sigue abierto? Vigente o por empezar: el jugador "está asociado" al equipo.
export function isOpen(contract: Contract): boolean {
  return contract.status === 'VIGENTE' || contract.status === 'FUTURO'
}
