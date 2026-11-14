export default defineNuxtRouteMiddleware(async (to) => {
  const { ensureUserPermissions, hasPermission } = useUserPermissions()
  await ensureUserPermissions(true)

  const required = to.path === '/ordenamientos' ? 'ordenamientos.ver'
    : to.path === '/tarifas/procedimientos' ? 'procedimientos.ver'
    : to.path === '/tarifas/insumos' ? 'insumos.ver'
    : to.path === '/tarifas/lentes' ? 'lentes.ver'
    : to.path === '/gestion/seguimiento' ? 'seguimiento.ver'
    : null

  if (required && !hasPermission(required)) return navigateTo('/403')
})
