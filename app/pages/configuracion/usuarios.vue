<script setup>
import { ref, onMounted, computed } from 'vue'
import { push } from 'notivue'

definePageMeta({
    middleware: ['sanctum:auth']
})

const { refreshUserPermissions, hasPermission, hasRole } = useUserPermissions()

const isConfigAdmin = computed(() => {
    return hasRole('administrador') || hasRole('admin') || hasRole('Admin') || hasRole('superadmin')
})

const canViewUsers = computed(() => {
    return isConfigAdmin.value
})

const canCreateUsers = computed(() => isConfigAdmin.value && hasPermission('configuracion.usuarios.crear'))
const canEditUserRoles = computed(() => isConfigAdmin.value && hasPermission('configuracion.usuarios.cambiar_rol'))
const canChangeUserPassword = computed(() => isConfigAdmin.value && hasPermission('configuracion.usuarios.cambiar_contrasena'))
const canAssignMedicos = computed(() => isConfigAdmin.value && hasPermission('configuracion.usuarios.asignar_medicos'))

const users = ref([])
const roles = ref([])
const medicos = ref([])
const loading = ref(false)
const saving = ref(false)

// --- Modal: Editar roles ---
const selectedUser = ref(null)
const selectedRoles = ref([])
const showModal = ref(false)

// --- Modal: Crear usuario ---
const showCreateModal = ref(false)
const creatingUser = ref(false)
const newUser = ref({ name: '', email: '', password: '', password_confirmation: '', roles: [] })
const createErrors = ref({})

// --- Modal: Cambiar contraseña ---
const showPasswordModal = ref(false)
const changingPassword = ref(false)
const passwordUser = ref(null)
const passwordForm = ref({ password: '', password_confirmation: '' })
const passwordErrors = ref({})

// --- Modal: Asociar médicos ---
const showMedicosModal = ref(false)
const medicosUser = ref(null)
const selectedMedicos = ref([])
const savingMedicos = ref(false)
const busquedaMedico = ref('')

// ── helpers ──────────────────────────────────────────────────────────────────
const extractErrors = (errorValue) => {
    const status = errorValue?.response?.status ?? errorValue?.statusCode
    if (status === 422) {
        return errorValue?.data?.errors ?? {}
    }
    return {}
}

const firstError = (errors, field) => errors[field]?.[0] ?? null

const esTecnica = (user) => (user?.roles || []).some((role) => {
    const nombre = String(role.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    return nombre === 'tecnica' || nombre === 'tecnico'
})

const medicosFiltrados = computed(() => {
    const term = busquedaMedico.value.trim().toLocaleLowerCase('es-CO')
    if (!term) return medicos.value

    return medicos.value.filter((medico) => (
        String(medico.nombre || '').toLocaleLowerCase('es-CO').includes(term)
        || String(medico.identificacion || '').toLocaleLowerCase('es-CO').includes(term)
    ))
})

const replaceUser = (updatedUser) => {
    if (!updatedUser?.id) return
    const index = users.value.findIndex(user => user.id === updatedUser.id)
    if (index === -1) users.value.push(updatedUser)
    else users.value.splice(index, 1, updatedUser)
}

// ── fetchData ─────────────────────────────────────────────────────────────────
const fetchData = async (silent = false) => {
    if (!silent) loading.value = true
    try {
        const { data, error } = await useSanctumFetch('/api/users-roles', { method: 'GET' })
        if (error.value) {
            push.error({ title: 'Error', message: 'No se pudieron cargar los usuarios y roles' })
            return
        }
        users.value = data.value.data.users || []
        roles.value = data.value.data.roles || []
        medicos.value = data.value.data.medicos || []
    } catch (e) {
        console.error(e)
        push.error({ title: 'Error', message: 'Ocurrió un error al cargar los datos' })
    } finally {
        if (!silent) loading.value = false
    }
}

onMounted(async () => {
    await refreshUserPermissions()

    if (!canViewUsers.value) {
        await navigateTo('/403')
        return
    }

    await fetchData()
})

// ── Modal Editar Roles ────────────────────────────────────────────────────────
const openEditModal = (user) => {
    if (!canEditUserRoles.value) return
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
    if (!selectedUser.value || !canEditUserRoles.value) return
    saving.value = true
    try {
        const { data, error } = await useSanctumFetch(`/api/users/${selectedUser.value.id}/roles`, {
            method: 'PUT',
            body: { roles: selectedRoles.value }
        })
        if (error.value) {
            push.error({ title: 'Error', message: 'No se pudieron actualizar los roles' })
            return
        }
        push.success({ title: 'Exito', message: 'Roles actualizados correctamente' })
        replaceUser(data.value?.user)
        closeModal()
        void fetchData(true)
    } catch (e) {
        console.error(e)
        push.error({ title: 'Error', message: 'Ocurrió un error al actualizar los roles' })
    } finally {
        saving.value = false
    }
}

const toggleRole = (roleName) => {
    const index = selectedRoles.value.indexOf(roleName)
    if (index > -1) selectedRoles.value.splice(index, 1)
    else selectedRoles.value.push(roleName)
}

const openMedicosModal = (user) => {
    if (!canAssignMedicos.value || !esTecnica(user)) return
    medicosUser.value = user
    selectedMedicos.value = (user.medicos || []).map(medico => medico.id)
    busquedaMedico.value = ''
    showMedicosModal.value = true
}

const closeMedicosModal = () => {
    showMedicosModal.value = false
    medicosUser.value = null
    selectedMedicos.value = []
    busquedaMedico.value = ''
}

const saveMedicos = async () => {
    if (!medicosUser.value || !canAssignMedicos.value) return
    savingMedicos.value = true
    try {
        const { data, error } = await useSanctumFetch(`/api/users/${medicosUser.value.id}/medicos`, {
            method: 'PUT',
            body: { medico_ids: selectedMedicos.value },
        })
        if (error.value) {
            push.error({ title: 'Error', message: 'No se pudieron actualizar los médicos asociados' })
            return
        }
        push.success({ title: 'Éxito', message: 'Médicos asociados correctamente' })
        replaceUser(data.value?.user)
        closeMedicosModal()
        void fetchData(true)
    } catch (e) {
        console.error(e)
        push.error({ title: 'Error', message: 'Ocurrió un error al asociar los médicos' })
    } finally {
        savingMedicos.value = false
    }
}

// ── Modal Crear Usuario ───────────────────────────────────────────────────────
const openCreateModal = () => {
    if (!canCreateUsers.value) return
    newUser.value = { name: '', email: '', password: '', password_confirmation: '', roles: [] }
    createErrors.value = {}
    showCreateModal.value = true
}

const closeCreateModal = () => {
    showCreateModal.value = false
}

const toggleNewRole = (roleName) => {
    const index = newUser.value.roles.indexOf(roleName)
    if (index > -1) newUser.value.roles.splice(index, 1)
    else newUser.value.roles.push(roleName)
}

const createUser = async () => {
    if (!canCreateUsers.value) return
    createErrors.value = {}
    creatingUser.value = true
    try {
        const { data, error } = await useSanctumFetch('/api/users', {
            method: 'POST',
            body: {
                name: newUser.value.name,
                email: newUser.value.email,
                password: newUser.value.password,
                password_confirmation: newUser.value.password_confirmation,
                roles: newUser.value.roles,
            }
        })
        if (error.value) {
            createErrors.value = extractErrors(error.value)
            const msg = error.value?.data?.message || 'No se pudo crear el usuario'
            push.error({ title: 'Error', message: msg })
            return
        }
        push.success({ title: 'Exito', message: 'Usuario creado correctamente' })
        replaceUser(data.value?.user)
        closeCreateModal()
        void fetchData(true)
    } catch (e) {
        console.error(e)
        push.error({ title: 'Error', message: 'Ocurrió un error al crear el usuario' })
    } finally {
        creatingUser.value = false
    }
}

// ── Modal Cambiar Contraseña ──────────────────────────────────────────────────
const openPasswordModal = (user) => {
    if (!canChangeUserPassword.value) return
    passwordUser.value = user
    passwordForm.value = { password: '', password_confirmation: '' }
    passwordErrors.value = {}
    showPasswordModal.value = true
}

const closePasswordModal = () => {
    showPasswordModal.value = false
    passwordUser.value = null
}

const savePassword = async () => {
    if (!passwordUser.value || !canChangeUserPassword.value) return
    passwordErrors.value = {}
    changingPassword.value = true
    try {
        const { error } = await useSanctumFetch(`/api/users/${passwordUser.value.id}/password`, {
            method: 'PUT',
            body: {
                password: passwordForm.value.password,
                password_confirmation: passwordForm.value.password_confirmation,
            }
        })
        if (error.value) {
            passwordErrors.value = extractErrors(error.value)
            const msg = error.value?.data?.message || 'No se pudo actualizar la contraseña'
            push.error({ title: 'Error', message: msg })
            return
        }
        push.success({ title: 'Exito', message: 'Contraseña actualizada correctamente' })
        closePasswordModal()
        void fetchData(true)
    } catch (e) {
        console.error(e)
        push.error({ title: 'Error', message: 'Ocurrió un error al cambiar la contraseña' })
    } finally {
        changingPassword.value = false
    }
}
</script>

<template>
    <div class="space-y-5">
        <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5 flex items-center justify-between gap-4">
            <div>
                <h1 class="text-2xl font-semibold text-slate-900 mb-1">Gestión de usuarios y roles</h1>
                <p class="text-sm text-slate-600">Administra los usuarios y los roles asignados en el sistema.</p>
            </div>
            <button
                v-if="canCreateUsers"
                @click="openCreateModal"
                class="flex items-center gap-2 bg-indigo-700 text-white px-4 py-2 rounded-xl hover:bg-indigo-800 text-sm font-medium shrink-0"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Crear usuario
            </button>
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
                        <th class="border border-slate-200 p-3 text-left">Médicos asociados</th>
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
                                <span v-for="role in user.roles" :key="role.id" class="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                                    {{ role.name }}
                                </span>
                                <span v-if="!user.roles || user.roles.length === 0" class="text-slate-400 text-xs">
                                    Sin roles
                                </span>
                            </div>
                        </td>
                        <td class="border border-slate-200 p-3">
                            <div v-if="esTecnica(user) && user.medicos?.length" class="flex flex-wrap gap-1">
                                <span v-for="medico in user.medicos" :key="medico.id" class="px-2 py-1 bg-cyan-100 text-cyan-800 rounded-full text-xs font-medium">
                                    {{ medico.nombre }}
                                </span>
                            </div>
                            <span v-else class="text-slate-400 text-xs">{{ esTecnica(user) ? 'Sin médicos' : 'No aplica' }}</span>
                        </td>
                        <td class="border border-slate-200 p-3">
                            <div class="flex items-center justify-center gap-2 flex-wrap">
                                <button
                                    v-if="canEditUserRoles"
                                    @click="openEditModal(user)"
                                    class="bg-indigo-700 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-800 text-xs font-medium"
                                >
                                    Editar roles
                                </button>
                                <button
                                    v-if="canChangeUserPassword"
                                    @click="openPasswordModal(user)"
                                    class="bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 text-xs font-medium"
                                >
                                    Cambiar contraseña
                                </button>
                                <button
                                    v-if="canAssignMedicos && esTecnica(user)"
                                    @click="openMedicosModal(user)"
                                    class="bg-cyan-700 text-white px-3 py-1.5 rounded-lg hover:bg-cyan-800 text-xs font-medium"
                                >
                                    Asociar médicos
                                </button>
                                <span v-if="!canEditUserRoles && !canChangeUserPassword && !canAssignMedicos" class="text-slate-400 text-xs">Sin acciones disponibles</span>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-else class="bg-white border border-slate-200 rounded-2xl shadow-sm text-center py-8 text-slate-500">
            <p>No hay usuarios registrados</p>
        </div>

        <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="closeModal">
            <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 border border-slate-200 shadow-xl">
                <h2 class="text-xl font-bold mb-4">Asignar roles a {{ selectedUser?.name }}</h2>
                <p class="text-sm text-slate-600 mb-3">Selecciona los roles que deseas asignar:</p>
                <div class="space-y-2">
                    <label v-for="role in roles" :key="role.id" class="flex items-center p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                        <input type="checkbox" :checked="selectedRoles.includes(role.name)" @change="toggleRole(role.name)" class="w-4 h-4 mr-2" />
                        <span>{{ role.name }}</span>
                    </label>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button @click="closeModal" :disabled="saving" class="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">
                        Cancelar
                    </button>
                    <button @click="saveRoles" :disabled="saving" class="px-4 py-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 disabled:opacity-50">
                        {{ saving ? 'Guardando...' : 'Guardar' }}
                    </button>
                </div>
            </div>
        </div>

        <div v-if="showMedicosModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="closeMedicosModal">
            <div class="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 border border-slate-200 shadow-xl">
                <h2 class="text-xl font-bold mb-1">Asociar médicos</h2>
                <p class="text-sm text-slate-600 mb-4">{{ medicosUser?.name }} solo verá en la consulta médica las cotizaciones de los médicos seleccionados.</p>
                <input
                    v-model="busquedaMedico"
                    type="search"
                    placeholder="Buscar por nombre o identificación"
                    class="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
                <div class="max-h-72 overflow-y-auto space-y-1 rounded-lg border border-slate-200 p-2">
                    <label v-for="medico in medicosFiltrados" :key="medico.id" class="flex items-center gap-2 rounded-lg p-2 hover:bg-slate-50 cursor-pointer">
                        <input v-model="selectedMedicos" type="checkbox" :value="medico.id" class="h-4 w-4" />
                        <span class="text-sm text-slate-800">{{ medico.nombre }}</span>
                        <span v-if="medico.identificacion" class="text-xs text-slate-500">{{ medico.identificacion }}</span>
                    </label>
                    <p v-if="!medicosFiltrados.length" class="p-3 text-sm text-slate-500">No hay médicos que coincidan con la búsqueda.</p>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button @click="closeMedicosModal" :disabled="savingMedicos" class="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">Cancelar</button>
                    <button @click="saveMedicos" :disabled="savingMedicos" class="px-4 py-2 bg-cyan-700 text-white rounded-lg hover:bg-cyan-800 disabled:opacity-50">
                        {{ savingMedicos ? 'Guardando...' : 'Guardar médicos' }}
                    </button>
                </div>
            </div>
        </div>

        <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="closeCreateModal">
            <div class="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 border border-slate-200 shadow-xl">
                <h2 class="text-xl font-bold mb-5">Crear nuevo usuario</h2>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Nombre completo</label>
                        <input
                            v-model="newUser.name"
                            type="text"
                            placeholder="Ej: Juan Pérez"
                            class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            :class="firstError(createErrors,'name') ? 'border-red-400' : 'border-slate-300'"
                        />
                        <p v-if="firstError(createErrors,'name')" class="text-red-500 text-xs mt-1">
                            {{ firstError(createErrors,'name') }}
                        </p>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Correo electrónico</label>
                        <input
                            v-model="newUser.email"
                            type="email"
                            placeholder="correo@ejemplo.com"
                            class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            :class="firstError(createErrors,'email') ? 'border-red-400' : 'border-slate-300'"
                        />
                        <p v-if="firstError(createErrors,'email')" class="text-red-500 text-xs mt-1">
                            {{ firstError(createErrors,'email') }}
                        </p>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                            <input
                                v-model="newUser.password"
                                type="password"
                                placeholder="••••••••"
                                class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                :class="firstError(createErrors,'password') ? 'border-red-400' : 'border-slate-300'"
                            />
                            <p v-if="firstError(createErrors,'password')" class="text-red-500 text-xs mt-1">
                                {{ firstError(createErrors,'password') }}
                            </p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Confirmar contraseña</label>
                            <input
                                v-model="newUser.password_confirmation"
                                type="password"
                                placeholder="••••••••"
                                class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 border-slate-300"
                            />
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Roles (opcional)</label>
                        <div class="space-y-1 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
                            <label v-for="role in roles" :key="role.id" class="flex items-center p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                                <input type="checkbox" :checked="newUser.roles.includes(role.name)" @change="toggleNewRole(role.name)" class="w-4 h-4 mr-2" />
                                <span class="text-sm">{{ role.name }}</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-2 mt-6">
                    <button @click="closeCreateModal" :disabled="creatingUser" class="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">
                        Cancelar
                    </button>
                    <button @click="createUser" :disabled="creatingUser" class="px-4 py-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 disabled:opacity-50">
                        {{ creatingUser ? 'Creando...' : 'Crear usuario' }}
                    </button>
                </div>
            </div>
        </div>

        <div v-if="showPasswordModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="closePasswordModal">
            <div class="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 border border-slate-200 shadow-xl">
                <h2 class="text-xl font-bold mb-1">Cambiar contraseña</h2>
                <p class="text-sm text-slate-500 mb-5">Usuario: <span class="font-medium text-slate-700">{{ passwordUser?.name }}</span></p>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Nueva contraseña</label>
                        <input
                            v-model="passwordForm.password"
                            type="password"
                            placeholder="••••••••"
                            class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            :class="firstError(passwordErrors,'password') ? 'border-red-400' : 'border-slate-300'"
                        />
                        <p v-if="firstError(passwordErrors,'password')" class="text-red-500 text-xs mt-1">
                            {{ firstError(passwordErrors,'password') }}
                        </p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Confirmar contraseña</label>
                        <input
                            v-model="passwordForm.password_confirmation"
                            type="password"
                            placeholder="••••••••"
                            class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 border-slate-300"
                        />
                    </div>
                </div>

                <div class="flex justify-end gap-2 mt-6">
                    <button @click="closePasswordModal" :disabled="changingPassword" class="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">
                        Cancelar
                    </button>
                    <button @click="savePassword" :disabled="changingPassword" class="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50">
                        {{ changingPassword ? 'Guardando...' : 'Actualizar contraseña' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
