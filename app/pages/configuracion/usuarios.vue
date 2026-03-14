<script setup>
import { ref, onMounted } from 'vue'
import { push } from 'notivue'

definePageMeta({
    middleware: ['sanctum:auth']
    // admin-permisos removido temporalmente para configuración inicial
})

const { refreshUserPermissions } = useUserPermissions()

const users = ref([])
const roles = ref([])
const loading = ref(false)
const saving = ref(false)
const selectedUser = ref(null)
const selectedRoles = ref([])
const showModal = ref(false)

// ✅ DEFINIMOS fetchData (antes no existía)
const fetchData = async () => {
    loading.value = true
    try {
        const { data, error } = await useSanctumFetch('/api/users-roles', {
            method: 'GET'
        })

        if (error.value) {
            push.error({
                title: 'Error',
                message: 'No se pudieron cargar los usuarios y roles'
            })
            return
        }

        users.value = data.value.data.users || []
        roles.value = data.value.data.roles || []
    } catch (error) {
        console.error('Error al cargar datos:', error)
        push.error({
            title: 'Error',
            message: 'Ocurrió un error al cargar los datos'
        })
    } finally {
        loading.value = false
    }
}

// ✅ onMounted correcto
onMounted(async () => {
    await refreshUserPermissions()
    await fetchData()
})

const openEditModal = (user) => {
    selectedUser.value = user
    selectedRoles.value = user.roles?.map(r => r.name) || []
    showModal.value = true
}

const closeModal = () => {
    showModal.value = false
    selectedUser.value = null
    selectedRoles.value = []
}

const saveRoles = async () => {
    if (!selectedUser.value) return

    saving.value = true
    try {
        const { data, error } = await useSanctumFetch(`/api/users/${selectedUser.value.id}/roles`, {
            method: 'PUT',
            body: {
                roles: selectedRoles.value
            }
        })

        if (error.value) {
            push.error({
                title: 'Error',
                message: 'No se pudieron actualizar los roles'
            })
            return
        }

        push.success({
            title: 'Éxito',
            message: 'Roles actualizados correctamente'
        })

        await fetchData()
        closeModal()
    } catch (error) {
        console.error('Error al actualizar roles:', error)
        push.error({
            title: 'Error',
            message: 'Ocurrió un error al actualizar los roles'
        })
    } finally {
        saving.value = false
    }
}

const toggleRole = (roleName) => {
    const index = selectedRoles.value.indexOf(roleName)
    if (index > -1) {
        selectedRoles.value.splice(index, 1)
    } else {
        selectedRoles.value.push(roleName)
    }
}
</script>

<template>
    <div class="space-y-5">
        <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
            <h1 class="text-2xl font-semibold text-slate-900 mb-2">Gestión de usuarios y roles</h1>
            <p class="text-sm text-slate-600">Administra los roles asignados a cada usuario del sistema.</p>
        </section>

        <div v-if="loading" class="bg-white border border-slate-200 rounded-2xl shadow-sm text-center py-8">
            <p class="text-slate-600">Cargando...</p>
        </div>

        <div v-else-if="users && users.length > 0" class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 overflow-x-auto">
            <table class="min-w-full border border-slate-200 text-sm">
                <thead>
                    <tr class="bg-slate-50">
                        <th class="border border-slate-200 p-3 text-left">ID</th>
                        <th class="border border-slate-200 p-3 text-left">Nombre</th>
                        <th class="border border-slate-200 p-3 text-left">Email</th>
                        <th class="border border-slate-200 p-3 text-left">Roles</th>
                        <th class="border border-slate-200 p-3 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="user in users" :key="user.id" class="hover:bg-slate-50">
                        <td class="border border-slate-200 p-3">{{ user.id }}</td>
                        <td class="border border-slate-200 p-3 font-medium">{{ user.name }}</td>
                        <td class="border border-slate-200 p-3">{{ user.email }}</td>
                        <td class="border border-slate-200 p-3">
                            <div class="flex flex-wrap gap-1">
                                <span v-for="role in user.roles" :key="role.id"
                                    class="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                                    {{ role.name }}
                                </span>
                                <span v-if="!user.roles || user.roles.length === 0" class="text-slate-400 text-xs">
                                    Sin roles
                                </span>
                            </div>
                        </td>
                        <td class="border border-slate-200 p-3 text-center">
                            <button @click="openEditModal(user)"
                                class="bg-indigo-700 text-white px-3 py-2 rounded-lg hover:bg-indigo-800 text-xs font-medium">
                                Editar Roles
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-else class="bg-white border border-slate-200 rounded-2xl shadow-sm text-center py-8 text-slate-500">
            <p>No hay usuarios registrados</p>
        </div>

        <!-- Modal para editar roles -->
        <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            @click.self="closeModal">
            <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 border border-slate-200 shadow-xl">
                <h2 class="text-xl font-bold mb-4">
                    Asignar Roles a {{ selectedUser?.name }}
                </h2>

                <div class="mb-4">
                    <p class="text-sm text-slate-600 mb-3">
                        Selecciona los roles que deseas asignar a este usuario:
                    </p>

                    <div class="space-y-2">
                        <label v-for="role in roles" :key="role.id"
                            class="flex items-center p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                            <input type="checkbox" :checked="selectedRoles.includes(role.name)"
                                @change="toggleRole(role.name)" class="w-4 h-4 mr-2" />
                            <span>{{ role.name }}</span>
                        </label>
                    </div>
                </div>

                <div class="flex justify-end gap-2 mt-6">
                    <button @click="closeModal" class="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                        :disabled="saving">
                        Cancelar
                    </button>
                    <button @click="saveRoles"
                        class="px-4 py-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 disabled:opacity-50"
                        :disabled="saving">
                        {{ saving ? 'Guardando...' : 'Guardar' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
