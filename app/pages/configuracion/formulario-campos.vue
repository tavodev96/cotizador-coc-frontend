<template>
  <div class="space-y-6">
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-sm font-semibold uppercase tracking-wide text-indigo-700">Configuración</p>
          <h1 class="mt-1 text-2xl font-semibold text-slate-900">Campos del formulario</h1>
          <p class="mt-1 text-sm text-slate-600">Activa o desactiva campos visibles en la creación de cotizaciones.</p>
        </div>
        <button
          class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          :disabled="cargando"
          @click="cargarCampos"
        >
          Actualizar
        </button>
      </div>
    </section>

    <section v-if="!canManageCampos" class="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
      Necesitas el permiso de configuración para administrar estos campos.
    </section>

    <section v-else class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">Formulario de cotización</h2>
          <p class="text-sm text-slate-500">Los cambios aplican al módulo /gestion/cotizacion.</p>
        </div>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {{ campos.length }} campo{{ campos.length === 1 ? '' : 's' }}
        </span>
      </div>

      <div v-if="cargando" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-16 animate-pulse rounded-xl bg-slate-100" />
      </div>

      <div v-else-if="campos.length === 0" class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        No hay campos configurados para este formulario.
      </div>

      <div v-else class="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
        <div v-for="campo in campos" :key="campo.id" class="flex flex-col gap-3 bg-white p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="font-semibold text-slate-900">{{ campo.etiqueta }}</p>
            <p class="text-sm text-slate-500">{{ campo.formulario }} · {{ campo.campo }}</p>
          </div>
          <button
            class="relative inline-flex h-8 w-16 items-center rounded-full transition disabled:opacity-60"
            :class="campo.activo ? 'bg-emerald-500' : 'bg-slate-300'"
            :disabled="guardandoId === campo.id"
            :aria-label="campo.activo ? 'Desactivar campo' : 'Activar campo'"
            @click="actualizarCampo(campo, !campo.activo)"
          >
            <span
              class="inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white text-xs font-bold text-slate-600 shadow transition"
              :class="campo.activo ? 'translate-x-9' : 'translate-x-1'"
            >
              {{ campo.activo ? 'Sí' : 'No' }}
            </span>
          </button>
        </div>
      </div>

      <p v-if="mensaje" class="mt-4 rounded-lg border px-3 py-2 text-sm" :class="mensajeError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'">
        {{ mensaje }}
      </p>
    </section>
  </div>
</template>

<script setup>
definePageMeta({ middleware: ['sanctum:auth'] })

const { hasPermission, hasRole, ensureUserPermissions } = useUserPermissions()

const campos = ref([])
const cargando = ref(false)
const guardandoId = ref(null)
const mensaje = ref('')
const mensajeError = ref(false)

const canManageCampos = computed(() => {
  return hasRole('superadmin')
    || hasRole('Superadmin')
    || hasRole('administrador')
    || hasRole('Administrador')
})

const cargarCampos = async () => {
  if (!canManageCampos.value) return

  cargando.value = true
  mensaje.value = ''
  mensajeError.value = false

  const { data, error } = await useSanctumFetch('/api/configuracion/formulario-campos', {
    method: 'GET',
    query: { formulario: 'gestion_cotizacion' },
  })

  if (error.value) {
    mensaje.value = error.value?.data?.message || 'No fue posible cargar la configuración.'
    mensajeError.value = true
    campos.value = []
  } else {
    campos.value = data.value?.data || []
  }

  cargando.value = false
}

const actualizarCampo = async (campo, activo) => {
  guardandoId.value = campo.id
  mensaje.value = ''
  mensajeError.value = false

  const { data, error } = await useSanctumFetch(`/api/configuracion/formulario-campos/${campo.id}`, {
    method: 'PUT',
    body: { activo },
  })

  if (error.value) {
    mensaje.value = error.value?.data?.message || 'No fue posible actualizar el campo.'
    mensajeError.value = true
  } else {
    const actualizado = data.value?.data
    const index = campos.value.findIndex((item) => item.id === campo.id)
    if (index >= 0 && actualizado) campos.value[index] = actualizado
    mensaje.value = 'Configuración actualizada correctamente.'
  }

  guardandoId.value = null
}

onMounted(async () => {
  await ensureUserPermissions()
  await cargarCampos()
})
</script>
