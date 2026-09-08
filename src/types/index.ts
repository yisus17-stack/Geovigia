export type UserRole = 'auditor'

export type RiskLevel = 'Bajo' | 'Medio' | 'Alto' | 'Crítico'
export type TechnicalResult =
  | 'Sin indicios'
  | 'Requiere revisión'
  | 'Posible incumplimiento'
  | 'Información insuficiente'

export type Orchard = {
  id: string
  name: string
  crop: 'Aguacate' | 'Berries' | 'Otro'
  municipality: string
  locality: string
  hectares: number
  lastAnalysis: string
  result: TechnicalResult
  risk: RiskLevel
}

export type Analysis = {
  id: string
  code: string
  orchardId: string
  date: string
  period: string
  result: TechnicalResult
  risk: RiskLevel
  confidence: number
  affectedHectares: number
  changePercent: number
}
