export default defineNuxtRouteMiddleware(async () => {
  const { user } = useSanctumAuth()

  // Si no hay usuario, redirigir al login
  if (!user.value) {
    return navigateTo('/login')
  }

  // Verificar si el usuario tiene el permiso necesario
  if (!user.value.permissions || !user.value.permissions.includes('configuracion.permisos')) {
    return navigateTo('/403')
  }
})