import { ref } from 'vue'

export const useUserPermissions = () => {
  const { user } = useSanctumAuth()
  const loading = ref(false)
  const error = ref(null)
  const permissionsLoaded = useState<boolean>('permissions-loaded', () => false)
  const permissionsLoading = useState<boolean>('permissions-loading', () => false)

  const hasPermissionsPayload = () => {
    return !!user.value && Array.isArray(user.value.permissions) && Array.isArray(user.value.roles)
  }

  /**
   * Recarga los datos del usuario incluyendo permisos y roles
   */
  const refreshUserPermissions = async (force = false) => {
    if (!force && permissionsLoaded.value && hasPermissionsPayload()) {
      return true
    }

    if (permissionsLoading.value) {
      return false
    }

    loading.value = true
    permissionsLoading.value = true
    error.value = null
    
    try {
      const { data, error: fetchError } = await useSanctumFetch('/api/me', {
        method: 'GET'
      })

      if (fetchError.value) {
        error.value = fetchError.value
        return false
      }

      // Actualizar el usuario con los nuevos datos que incluyen permisos y roles
      if (data.value && user.value) {
        // Asignar permisos y roles al usuario
        Object.assign(user.value, {
          permissions: data.value.permissions || [],
          roles: data.value.roles || []
        })

        permissionsLoaded.value = true
        return true
      }
    } catch (err) {
      error.value = err
      console.error('Error al refrescar permisos:', err)
      return false
    } finally {
      loading.value = false
      permissionsLoading.value = false
    }
  }

  const ensureUserPermissions = async () => {
    return refreshUserPermissions(false)
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  const hasPermission = (permission) => {
    if (!user.value || !user.value.permissions) return false
    return user.value.permissions.includes(permission)
  }

  /**
   * Verifica si el usuario tiene alguno de los permisos en un array
   */
  const hasAnyPermission = (permissions) => {
    if (!user.value || !user.value.permissions) return false
    return permissions.some(permission => user.value.permissions.includes(permission))
  }

  /**
   * Verifica si el usuario tiene un rol específico
   */
  const hasRole = (role) => {
    if (!user.value || !user.value.roles) return false
    return user.value.roles.includes(role)
  }

  return {
    user,
    loading,
    error,
    refreshUserPermissions,
    ensureUserPermissions,
    hasPermission,
    hasAnyPermission,
    hasRole
  }
}
