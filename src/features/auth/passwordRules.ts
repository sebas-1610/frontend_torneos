// Reglas de contraseña segura: las mismas que valida el backend (CreateUserDTO y ResetPasswordRequestDTO).
// Las usan "Crear cuenta" y "Recuperar contraseña" para avisar antes de enviar.
export const PASSWORD_RULES = [
  { label: 'Entre 8 y 16 caracteres', test: (p: string) => p.length >= 8 && p.length <= 16 },
  { label: 'Una letra minúscula', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Una letra mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Un número', test: (p: string) => /\d/.test(p) },
  { label: 'Un carácter especial (ej: ! @ # $)', test: (p: string) => /[^A-Za-z\d]/.test(p) },
]

export function isStrongPassword(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password))
}
