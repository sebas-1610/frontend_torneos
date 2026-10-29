import { Check } from 'lucide-react'
import { PASSWORD_RULES } from './passwordRules'

// Lista de reglas: cada una se marca en verde apenas se cumple.
export function PasswordRuleList({ password }: { password: string }) {
  return (
    <ul className="login__rules">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password)
        return (
          <li key={rule.label} className={ok ? 'login__rule login__rule--ok' : 'login__rule'}>
            <Check size={14} aria-hidden="true" />
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}
