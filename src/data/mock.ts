import type { Analysis, Orchard } from '../types'

// Datos de demostración. Sustituir por consultas Supabase cuando exista el esquema.
export const orchards: Orchard[] = [
  { id: 'los-pinos', name: 'Huerta Los Pinos', crop: 'Aguacate', municipality: 'Uruapan', locality: 'Caltzontzin', hectares: 12.4, lastAnalysis: '12 feb 2026', result: 'Requiere revisión', risk: 'Medio' },
  { id: 'santa-elena', name: 'Rancho Santa Elena', crop: 'Berries', municipality: 'Los Reyes', locality: 'Atapan', hectares: 8.7, lastAnalysis: '08 feb 2026', result: 'Posible incumplimiento', risk: 'Alto' },
  { id: 'el-encino', name: 'El Encino', crop: 'Aguacate', municipality: 'Tancítaro', locality: 'Zirimbo', hectares: 16.2, lastAnalysis: '30 ene 2026', result: 'Sin indicios', risk: 'Bajo' },
]

export const analyses: Analysis[] = [
  { id: 'aud-2026-00124', code: 'AUD-2026-00124', orchardId: 'santa-elena', date: '08 feb 2026', period: 'ene 2024 — ene 2026', result: 'Posible incumplimiento', risk: 'Alto', confidence: 91, affectedHectares: 2.1, changePercent: 24.1 },
  { id: 'aud-2026-00108', code: 'AUD-2026-00108', orchardId: 'los-pinos', date: '12 feb 2026', period: 'feb 2024 — feb 2026', result: 'Requiere revisión', risk: 'Medio', confidence: 83, affectedHectares: 0.8, changePercent: 6.5 },
]

export const getOrchard = (id: string) => orchards.find((orchard) => orchard.id === id) ?? orchards[0]
export const getAnalysis = (id: string) => analyses.find((analysis) => analysis.id === id) ?? analyses[0]
