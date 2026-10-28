import { useAnimatedNumber } from '../hooks/useAnimatedNumber'

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const display = useAnimatedNumber(value)
  return <span className={className ? `num ${className}` : 'num'}>{display}</span>
}
