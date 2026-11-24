import { useCallback, useState } from 'react'
import type { Profile, ProfileInput } from '../../api/profile'

// Misma regla que valida el backend (BaseProfileDTO). La foto no se revisa aquí: llega ya lista de
// utils/image.ts, o es la que estaba guardada.
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/

// @Past del backend: la fecha de nacimiento debe ser anterior a hoy. Formato AAAA-MM-DD del <input type="date">.
function yesterday(): string {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// Lo que se está escribiendo en un formulario de perfil. Lo comparten "Mi perfil" y la ventana
// "Perfil" de Usuarios, así las dos validan igual.
export function useProfileDraft() {
  const [phone, setPhone] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [birthDate, setBirthDate] = useState('')
  const [maxBirthDate] = useState(yesterday)
  const [fills, setFills] = useState(0) // cuántas veces se ha llenado con lo guardado

  // Llena el formulario con lo guardado, o lo vacía si el usuario no tiene perfil.
  const fill = useCallback((profile: Profile | null) => {
    setPhone(profile?.phone ?? '')
    setPhoto(profile?.photo ?? null)
    setBirthDate(profile?.birthDate ?? '')
    setFills((count) => count + 1)
  }, [])

  const input: ProfileInput = { phone: phone.trim(), photo, birthDate: birthDate || null }
  const phoneOk = PHONE_PATTERN.test(input.phone)
  const birthDateOk = birthDate === '' || birthDate <= maxBirthDate

  return {
    phone,
    setPhone,
    photo,
    setPhoto,
    birthDate,
    setBirthDate,
    maxBirthDate,
    fill,
    fills,
    input,
    phoneOk,
    birthDateOk,
    valid: phoneOk && birthDateOk,
    // Sin perfil guardado siempre hay algo por crear.
    differsFrom: (saved: Profile | null) =>
      saved === null ||
      input.phone !== saved.phone ||
      input.photo !== saved.photo ||
      input.birthDate !== saved.birthDate,
  }
}

export type ProfileDraft = ReturnType<typeof useProfileDraft>
