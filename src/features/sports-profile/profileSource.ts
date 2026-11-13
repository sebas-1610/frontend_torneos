import { findPlayerProfile, type PlayerProfile } from '../../api/playerProfiles'
import { findPlayers, type Player } from '../../api/players'

/*
 * De dónde saca el perfil deportivo sus datos (principio D de SOLID: inversión de dependencias).
 *
 * La pantalla no importa las funciones HTTP: recibe algo que cumpla esta interfaz. Quien la monta
 * (App.tsx) le pasa la implementación real, `sportsProfileApi`; una prueba o una pantalla de ejemplo
 * podría pasarle otra que devuelva datos fijos, sin tocar la pantalla.
 */
export interface SportsProfileSource {
  findPlayers(): Promise<Player[]> // entre quiénes se busca
  findProfile(playerId: number): Promise<PlayerProfile> // todo lo del jugador elegido
}

// La implementación real: el backend de ms_torneos_deportiva.
export const sportsProfileApi: SportsProfileSource = {
  findPlayers,
  findProfile: findPlayerProfile,
}
