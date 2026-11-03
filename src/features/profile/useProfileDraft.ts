import { useCallback, useState } from 'react'
import type { Profile, ProfileInput } from '../../api/profile'

// Mismas reglas que valida el backend (BaseProfileDTO).
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/
const PHOTO_PATTERN = /^https?:\/\/\S+$/

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
  const [photo, setPhoto] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [maxBirthDate] = useState(yesterday)

  // Llena el formulario con lo guardado, o lo vacía si el usuario no tiene perfil.
  const fill = useCallback((profile: Profile | null) => {
    setPhone(profile?.phone ?? '')
    setPhoto(profile?.photo ?? '')
    setBirthDate(profile?.birthDate ?? '')
  }, [])

  const input: ProfileInput = { phone: phone.trim(), photo: photo.trim() || null, birthDate: birthDate || null }
  const phoneOk = PHONE_PATTERN.test(input.phone)
  const photoOk = input.photo === null || (input.photo.length <= 500 && PHOTO_PATTERN.test(input.photo))
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
    input,
    phoneOk,
    photoOk,
    birthDateOk,
    valid: phoneOk && photoOk && birthDateOk,
    // Sin perfil guardado siempre hay algo por crear.
    differsFrom: (saved: Profile | null) =>
      saved === null ||
      input.phone !== saved.phone ||
      input.photo !== saved.photo ||
      input.birthDate !== saved.birthDate,
  }
}

export type ProfileDraft = ReturnType<typeof useProfileDraft>
