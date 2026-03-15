<script setup>
import { computed, ref, onMounted } from 'vue'
import { push } from 'notivue'

definePageMeta({
  middleware: ['sanctum:auth']
  // admin-permisos removido temporalmente para configuración inicial
})

const { refreshUserPermissions } = useUserPermissions()

const roles = ref([])
const permissions = ref([])
const loading = ref(false)
const updating = ref(false)

const allPermissionNames = computed(() => permissions.value.map(permission => permission.name))

// Recargar permisos al montar
onMounted(async () => {
  await refreshUserPermissions()
  await fetchData()
})

const fetchData = async () => {
  loading.value = true
  try {
    console.log('Haciendo fetch a /api/roles-permissions')
    const { data, error } = await useSanctumFetch('/api/roles-permissions', {
      method: 'GET'
    })

    console.log('Respuesta:', { data: data.value.data.roles, error: error.value })

    if (error.value) {
      console.error('Error en fetchData:', error.value)
      push.error({
        title: 'Error',
        message: `No se pudieron cargar los roles y permisos: ${error.value.statusCode || 'Sin código'}`
      })
      // Asegurar que sean arrays vacíos
      roles.value = []
      permissions.value = []
      return
    }

    // Validar que la respuesta tenga la estructura esperada
    if (data.value && data.value.data && data.value.data.roles && data.value.data.permissions) {
      roles.value = data.value.data.roles
      permissions.value = data.value.data.permissions
    } else {
      console.error('Estructura de datos inesperada:', data.value)
      roles.value = []
      permissions.value = []
      push.error({
        title: 'Error',
        message: 'La respuesta del servidor no tiene el formato esperado'
      })
    }
  } catch (error) {
    console.error('Error al cargar datos:', error)
    // Asegurar que sean arrays vacíos en caso de error
    roles.value = []
    permissions.value = []
    push.error({
      title: 'Error',
      message: 'Ocurrió un error al cargar los datos'
    })
  } finally {
    loading.value = false
  }
}

const updateRolePermissions = async (role, rolePermissions, successMessage) => {
  updating.value = true

  try {
    const { error } = await useSanctumFetch(`/api/roles-permissions/${role.id}`, {
      method: 'PUT',
      body: {
        permissions: rolePermissions
      }
    })

    if (error.value) {
      push.error({
        title: 'Error',
        message: 'No se pudieron actualizar los permisos'
      })
      return
    }

    const roleIndex = roles.value.findIndex(r => r.id === role.id)
    if (roleIndex !== -1) {
      const nextPermissions = permissions.value.filter(permission => rolePermissions.includes(permission.name))
      roles.value[roleIndex].permissions = nextPermissions
      roles.value = [...roles.value]
    }

    push.success({
      title: 'Éxito',
      message: successMessage
    })
  } catch (error) {
    console.error('Error al actualizar permisos:', error)
    push.error({
      title: 'Error',
      message: 'Ocurrió un error al actualizar los permisos'
    })
    // Si hay error, recargar datos para asegurar consistencia
    await fetchData()
  } finally {
    updating.value = false
  }
}

const togglePermission = async (role, permission) => {
  const rolePermissions = (role.permissions || []).map(p => p.name)
  const hasPermission = rolePermissions.includes(permission.name)

  if (hasPermission) {
    rolePermissions.splice(rolePermissions.indexOf(permission.name), 1)
  } else {
    rolePermissions.push(permission.name)
  }

  await updateRolePermissions(role, rolePermissions, 'Permisos actualizados correctamente')
}

const isAllSelectedForRole = (role) => {
  const names = allPermissionNames.value
  if (names.length === 0) {
    return false
  }

  const rolePermissions = new Set((role.permissions || []).map(permission => permission.name))
  return names.every(name => rolePermissions.has(name))
}

const toggleAllPermissions = async (role) => {
  const shouldSelectAll = !isAllSelectedForRole(role)
  const rolePermissions = shouldSelectAll ? [...allPermissionNames.value] : []
  const successMessage = shouldSelectAll
    ? `Todos los permisos asignados a ${role.name}`
    : `Todos los permisos removidos de ${role.name}`

  await updateRolePermissions(role, rolePermissions, successMessage)
}

</script>

<template>
  <div class="space-y-5">
    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
      <h1 class="text-2xl font-semibold text-slate-900 mb-2">Administración de roles y permisos</h1>
      <p class="text-sm text-slate-600">Controla el acceso del sistema mediante permisos por rol.</p>
    </section>

    <div v-if="loading" class="bg-white border border-slate-200 rounded-2xl shadow-sm text-center py-8">
      <p class="text-slate-600">Cargando...</p>
    </div>

    <div v-else-if="roles && roles.length > 0" class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 overflow-x-auto">
      <div v-if="updating" class="mb-4 text-indigo-600 text-sm">
        Actualizando permisos...
      </div>
      
      <table class="min-w-full border border-slate-200 text-sm">
        <thead>
          <tr class="bg-slate-50">
            <th class="border border-slate-200 p-2 text-left">Permiso</th>
            <th
              v-for="role in roles"
              :key="role.id"
              class="border border-slate-200 p-2 text-center"
            >
              <div class="flex flex-col items-center gap-1">
                <span>{{ role.name }}</span>
                <label class="inline-flex items-center gap-1 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    :checked="isAllSelectedForRole(role)"
                    @change="toggleAllPermissions(role)"
                    :disabled="updating || permissions.length === 0"
                    class="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span>Todos</span>
                </label>
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="permission in permissions"
            :key="permission.id"
          >
            <td class="border border-slate-200 p-2 font-medium">
              {{ permission.name }}
            </td>

            <td
              v-for="role in roles"
              :key="role.id"
              class="border border-slate-200 p-2 text-center"
            >
              <input
                type="checkbox"
                :checked="role.permissions?.some(p => p.name === permission.name)"
                @change="togglePermission(role, permission)"
                :disabled="updating"
                class="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="bg-white border border-slate-200 rounded-2xl shadow-sm text-center py-8 text-slate-500">
      <p>No hay roles o permisos configurados</p>
    </div>
  </div>
</template>