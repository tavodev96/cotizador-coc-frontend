<script setup>
const props = defineProps({ cotizacion: { type: Object, required: true }, iconOnly: { type: Boolean, default: false } })
const emit = defineEmits(['updated'])
const abierto = ref(false)
const guardando = ref(false)
const cargando = ref(false)
const historial = ref([])
const numero = ref('')
const fechaVigencia = ref('')
const fechaAutorizacion = ref('')
const error = ref('')

const fechaInput = (fecha) => fecha ? String(fecha).slice(0, 10) : ''
const abrir = async () => {
  numero.value = props.cotizacion.codificacion?.numero_autorizacion || ''
  fechaVigencia.value = fechaInput(props.cotizacion.codificacion?.fecha_vigencia)
  fechaAutorizacion.value = fechaInput(props.cotizacion.codificacion?.fecha_autorizacion)
  error.value = ''
  abierto.value = true
  cargando.value = true
  try {
    const { data, error: fallo } = await useSanctumFetch(`/api/cotizacion/${props.cotizacion.id}/codificacion/autorizacion/historial`)
    if (fallo.value) error.value = 'No se pudo cargar el historial.'
    else historial.value = data.value?.historial || []
  } finally {
    cargando.value = false
  }
}

const guardar = async () => {
  if (guardando.value) return
  if (!numero.value.trim() || !fechaVigencia.value || !fechaAutorizacion.value) {
    error.value = 'El número y ambas fechas son obligatorios.'
    return
  }
  guardando.value = true
  error.value = ''
  try {
    const { data, error: fallo } = await useSanctumFetch(`/api/cotizacion/${props.cotizacion.id}/codificacion/autorizacion`, {
      method: 'PUT',
      body: { numero_autorizacion: numero.value.trim(), fecha_vigencia: fechaVigencia.value, fecha_autorizacion: fechaAutorizacion.value },
    })
    if (fallo.value) {
      const errores = fallo.value?.data?.errors || {}
      error.value = Object.values(errores).flat()[0] || fallo.value?.data?.message || 'No se pudo actualizar la autorización.'
      return
    }
    historial.value = data.value?.historial || []
    emit('updated', data.value.codificacion, data.value.fecha_vigencia)
    abierto.value = false
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <button type="button" title="Gestionar autorización" :aria-label="props.iconOnly ? 'Gestionar autorización' : undefined" class="rounded-lg border border-emerald-300 bg-emerald-50 text-sm font-semibold text-emerald-800 hover:bg-emerald-100" :class="props.iconOnly ? 'inline-flex h-9 w-9 items-center justify-center' : 'px-3 py-2'" @click="abrir">
    <svg v-if="props.iconOnly" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3.5h6M8.5 12l2.5 2.5 4.5-5"/></svg>
    <span v-else>Gestionar autorización</span>
  </button>
  <Teleport to="body">
    <div v-if="abierto" class="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 p-4" @click.self="abierto = false">
      <section class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div class="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p class="text-xs font-bold uppercase text-emerald-700">Codificación</p>
            <h3 class="mt-1 text-xl font-semibold">Gestionar autorización</h3>
            <p class="mt-1 text-sm text-slate-500">Los cambios de número y fechas quedan registrados en el historial.</p>
          </div>
          <button type="button" aria-label="Cerrar" @click="abierto = false">✕</button>
        </div>
        <div class="mt-5 space-y-3">
          <label class="block text-sm font-semibold">Número de autorización<input v-model="numero" type="text" maxlength="255" class="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3" /></label>
          <label class="block text-sm font-semibold">Fecha de vigencia<input v-model="fechaVigencia" type="date" class="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3" /></label>
          <label class="block text-sm font-semibold">Fecha de autorización<input v-model="fechaAutorizacion" type="date" class="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3" /></label>
          <p v-if="error" role="alert" class="text-sm text-rose-700">{{ error }}</p>
          <div class="flex justify-end gap-2">
            <button type="button" class="rounded-lg border px-4 py-2" @click="abierto = false">Cancelar</button>
            <button type="button" :disabled="guardando" class="rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-60" @click="guardar">{{ guardando ? 'Guardando...' : 'Guardar autorización' }}</button>
          </div>
        </div>
        <div class="mt-6 border-t pt-5">
          <h4 class="font-semibold">Historial de autorizaciones</h4>
          <p v-if="cargando" class="mt-3 text-sm text-slate-500">Cargando...</p>
          <p v-else-if="!historial.length" class="mt-3 text-sm text-slate-500">Aún no hay cambios registrados.</p>
          <ol v-else class="mt-3 space-y-3">
            <li v-for="registro in historial" :key="registro.id" class="rounded-lg bg-slate-50 p-3 text-sm">
              <p class="font-semibold">{{ registro.accion === 'CREATE' ? 'Autorización registrada' : 'Autorización actualizada' }}</p>
              <p>Número: {{ registro.anterior || '—' }} → {{ registro.numero_autorizacion || '—' }}</p>
              <p v-if="registro.fecha_vigencia || registro.anterior_fecha_vigencia">Vigencia: {{ registro.anterior_fecha_vigencia || '—' }} → {{ registro.fecha_vigencia || '—' }}</p>
              <p v-if="registro.fecha_autorizacion || registro.anterior_fecha_autorizacion">Autorización: {{ registro.anterior_fecha_autorizacion || '—' }} → {{ registro.fecha_autorizacion || '—' }}</p>
              <p class="text-xs text-slate-500">{{ registro.usuario }} · {{ registro.fecha }}</p>
            </li>
          </ol>
        </div>
      </section>
    </div>
  </Teleport>
</template>
