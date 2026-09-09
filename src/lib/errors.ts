type ServiceError = { code?: string }

export function friendlyErrorMessage(error: unknown, fallback = 'No pudimos completar la operación. Intenta de nuevo.') {
  const serviceError = (error && typeof error === 'object' ? error : {}) as ServiceError
  switch (serviceError.code) {
    case '23505': return 'Ya existe un registro con esta información. Revisa los datos e inténtalo de nuevo.'
    case '23514': return 'Uno de los datos no es válido para guardar. Revisa la información e inténtalo nuevamente.'
    case '42501': return 'No tienes permiso para realizar esta acción.'
    case 'PGRST116': return 'No encontramos el registro solicitado.'
    default: return fallback
  }
}

export function throwFriendlyDatabaseError(error: unknown, fallback?: string): never {
  throw new Error(friendlyErrorMessage(error, fallback))
}
