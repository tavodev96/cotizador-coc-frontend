export default defineNuxtRouteMiddleware(async () => {
  const { user } = useSanctumAuth()

  // Si no hay usuario, redirigir al login
  if (!user.value) {
    return navigateTo('/login')
  }

  const permissions = user.value.permissions || []
  const canAccess = permissions.includes('configuracion.permisos') || permissions.includes('configuracion.modulos')

  // Verificar si el usuario tiene el permiso necesario
  if (!canAccess) {
    return navigateTo('/403')
  }
})