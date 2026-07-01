<template>
  <header class="fixed top-0 inset-x-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur px-4 md:px-6 xl:px-8">
    <div class="max-w-[1600px] mx-auto flex items-center justify-between py-3">
      <div class="font-bold text-indigo-900 text-xl flex items-center gap-3">
        <img
          src="/img/logo_clinica_oftalmologia.png"
          class="w-36 md:w-40"
          alt="Clínica de Oftalmología"
          loading="eager"
          fetchpriority="high"
          decoding="sync"
        >
      </div>
      <div class="flex items-center gap-3 text-slate-500">
        <div class="hidden md:block text-right">
          <p class="text-sm font-medium text-slate-700">Sistema de cotización</p>
          <p class="text-xs text-slate-500">Gestión clínica</p>
        </div>
        <div class="relative" data-user-menu>
          <button
            class="bg-center bg-cover bg-no-repeat rounded-full inline-block h-11 w-11 ring-2 ring-slate-200 hover:ring-indigo-300 transition"
            style="background-image: url(/img/user.png)"
            aria-label="Menú de usuario"
            @click="menuAbierto = !menuAbierto"
          />
          <div v-if="menuAbierto" class="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg py-2 text-sm text-slate-700">
            <button class="w-full px-4 py-2 text-left hover:bg-slate-50" @click="abrirPerfil">Perfil</button>
            <NuxtLink to="/logout" class="block px-4 py-2 hover:bg-slate-50">Cerrar sesión</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </header>

  <Teleport to="body">
    <div v-if="mostrarPerfil" class="fixed inset-0 z-[1000] flex min-h-screen items-center justify-center bg-slate-950/40 px-4 py-6" @click.self="mostrarPerfil = false">
        <div class="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-indigo-700 uppercase">Perfil</p>
              <h2 class="text-xl font-semibold text-slate-900 mt-1">Actualizar información</h2>
            </div>
            <button class="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600" @click="mostrarPerfil = false">×</button>
          </div>
          <div class="mt-4 space-y-3">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input v-model="perfilForm.name" class="w-full h-11 border border-slate-300 rounded-lg px-3" />
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Correo</label>
                <input :value="user?.email || ''" disabled class="w-full h-11 border border-slate-200 rounded-lg px-3 bg-slate-100 text-slate-600" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                <input :value="rolesTexto" disabled class="w-full h-11 border border-slate-200 rounded-lg px-3 bg-slate-100 text-slate-600" />
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Nueva contraseña</label>
                <input v-model="perfilForm.password" type="password" class="w-full h-11 border border-slate-300 rounded-lg px-3" placeholder="Opcional" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Confirmar contraseña</label>
                <input v-model="perfilForm.password_confirmation" type="password" class="w-full h-11 border border-slate-300 rounded-lg px-3" placeholder="Opcional" />
              </div>
            </div>
            <p v-if="perfilMsg" class="rounded-lg px-3 py-2 text-sm" :class="perfilError ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'">{{ perfilMsg }}</p>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button class="h-10 px-4 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50" @click="mostrarPerfil = false">Cancelar</button>
            <button class="h-10 px-4 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white disabled:opacity-60" :disabled="guardandoPerfil" @click="guardarPerfil">
              {{ guardandoPerfil ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </div>
        </div>
      </div>
  </Teleport>
</template>

<script setup>
const { user } = useSanctumAuth()
const { refreshUserPermissions } = useUserPermissions()

const menuAbierto = ref(false)
const mostrarPerfil = ref(false)
const guardandoPerfil = ref(false)
const perfilMsg = ref('')
const perfilError = ref(false)
const perfilForm = reactive({ name: '', password: '', password_confirmation: '' })

const rolesTexto = computed(() => Array.isArray(user.value?.roles) ? user.value.roles.join(', ') : 'Sin rol')

const abrirPerfil = () => {
  perfilForm.name = user.value?.name || ''
  perfilForm.password = ''
  perfilForm.password_confirmation = ''
  perfilMsg.value = ''
  perfilError.value = false
  menuAbierto.value = false
  mostrarPerfil.value = true
}

const guardarPerfil = async () => {
  guardandoPerfil.value = true
  perfilMsg.value = ''
  perfilError.value = false

  const body = { name: perfilForm.name }
  if (perfilForm.password || perfilForm.password_confirmation) {
    body.password = perfilForm.password
    body.password_confirmation = perfilForm.password_confirmation
  }

  const { data, error } = await useSanctumFetch('/api/me/profile', { method: 'PUT', body })

  if (error.value) {
    perfilError.value = true
    perfilMsg.value = error.value?.data?.message || 'No fue posible actualizar el perfil.'
    guardandoPerfil.value = false
    return
  }

  if (user.value && data.value) Object.assign(user.value, data.value)
  await refreshUserPermissions(true)
  perfilMsg.value = 'Perfil actualizado correctamente.'
  perfilForm.password = ''
  perfilForm.password_confirmation = ''
  guardandoPerfil.value = false
}
</script>
