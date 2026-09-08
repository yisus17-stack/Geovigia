import type { RiskLevel, TechnicalResult } from '../../types'

type BadgeProps = { value: RiskLevel | TechnicalResult | 'Pendiente' | 'Completado' | 'Procesando' | 'Error' }

function Badge({ value }: BadgeProps) {
  const tone = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll(' ', '-')
  return <span className={`badge badge-${tone}`}>{value}</span>
}

export default Badge
