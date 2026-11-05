<script setup>
import { computed, onMounted, ref } from 'vue'
import { push } from 'notivue'

definePageMeta({
  middleware: ['sanctum:auth'],
})

const { refreshUserPermissions, hasPermission, hasRole } = useUserPermissions()
const config = useRuntimeConfig()
const apiBase = config.public.apiBase?.replace('/api', '') || 'http://localhost:8000'

const canAccess = computed(() =>
  hasPermission('consultas.medicos.ver')
  || hasRole('administrador')
  || hasRole('superadmin')
)
const canComment = computed(() => hasPermission('consultas.medicos.comentar'))

const documento = ref('')
const procedimiento = ref('')
const codigo = ref('')
const cotizaciones = ref([])
const pagination = ref({ current_page: 1, last_page: 1, total: 0, per_page: 25 })
const cargando = ref(false)
const mostrarDetalle = ref(false)
const cargandoDetalle = ref(false)
const cotizacionSeleccionada = ref(null)
const nuevoComentario = ref('')
const guardandoComentario = ref(false)
const mostrarAdjuntos = ref(false)
const cargandoAdjuntos = ref(false)
const adjuntosSeleccionados = ref([])
const codigoAdjuntos = ref('')
const descargandoAdjuntoId = ref(null)

const buscar = async (page = 1) => {
  cargando.value = true
  try {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(pagination.value.per_page || 25),
    })
    if (documento.value.trim()) params.set('documento', documento.value.trim())
    if (procedimiento.value.trim()) params.set('procedimiento', procedimiento.value.trim())
    if (codigo.value.trim()) params.set('codigo', codigo.value.trim())

    const { data, error } = await useSanctumFetch(`/api/consultas/medicos?${params.toString()}`)
    if (error.value) {
      push.error({ title: 'Error', message: 'No se pudieron consultar las cotizaciones asignadas.' })
      return
    }

    cotizaciones.value = data.value?.data || []
    pagination.value = {
      current_page: data.value?.current_page || 1,
      last_page: data.value?.last_page || 1,
      total: data.value?.total || 0,
      per_page: data.value?.per_page || 25,
    }
  } catch (error) {
    console.error(error)
    push.error({ title: 'Error', message: 'Ocurrió un error al consultar las cotizaciones.' })
  } finally {
    cargando.value = false
  }
}

const limpiar = () => {
  documento.value = ''
  procedimiento.value = ''
  codigo.value = ''
  buscar(1)
}

const abrirDetalle = async (cotizacion) => {
  mostrarDetalle.value = true
  cargandoDetalle.value = true
  cotizacionSeleccionada.value = null
  nuevoComentario.value = ''

  try {
    const { data, error } = await useSanctumFetch(`/api/consultas/medicos/${cotizacion.id}`)
    if (error.value) {
      push.error({ title: 'Acceso no disponible', message: 'No se pudo cargar esta cotización.' })
      mostrarDetalle.value = false
      return
    }
    cotizacionSeleccionada.value = data.value?.cotizacion || null
  } catch (error) {
    console.error(error)
    push.error({ title: 'Error', message: 'No se pudo cargar el detalle.' })
    mostrarDetalle.value = false
  } finally {
    cargandoDetalle.value = false
  }
}

const cerrarDetalle = () => {
  mostrarDetalle.value = false
  cotizacionSeleccionada.value = null
  nuevoComentario.value = ''
}

const extraerAdjuntos = (cotizacion) => (cotizacion?.comentarios || []).flatMap(comentario =>
  (comentario.adjuntos || []).map(adjunto => ({
    ...adjunto,
    comentario: comentario.comentario,
    usuario: comentario.usuario?.name || 'Usuario no disponible',
  }))
)

const abrirAdjuntos = async (cotizacion) => {
  mostrarAdjuntos.value = true
  cargandoAdjuntos.value = true
  adjuntosSeleccionados.value = []
  codigoAdjuntos.value = cotizacion.codigo || ''

  try {
    const { data, error } = await useSanctumFetch(`/api/consultas/medicos/${cotizacion.id}`)
    if (error.value) {
      push.error({ title: 'Archivos no disponibles', message: 'No se pudieron cargar los adjuntos de esta codificación.' })
      mostrarAdjuntos.value = false
      return
    }

    const detalle = data.value?.cotizacion || null
    codigoAdjuntos.value = detalle?.codigo || cotizacion.codigo || ''
    adjuntosSeleccionados.value = extraerAdjuntos(detalle)
  } catch (error) {
    console.error(error)
    push.error({ title: 'Error', message: 'No se pudieron cargar los adjuntos.' })
    mostrarAdjuntos.value = false
  } finally {
    cargandoAdjuntos.value = false
  }
}

const descargarAdjunto = async (adjunto) => {
  if (descargandoAdjuntoId.value !== null) return

  descargandoAdjuntoId.value = adjunto.id
  try {
    const response = await fetch(fileUrl(adjunto.archivo_path))
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const objectUrl = URL.createObjectURL(await response.blob())
    const enlace = document.createElement('a')
    enlace.href = objectUrl
    enlace.download = adjunto.archivo_nombre || 'adjunto'
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    URL.revokeObjectURL(objectUrl)
  } catch (error) {
    console.error(error)
    push.error({ title: 'Descarga no disponible', message: 'No fue posible descargar el archivo. Intenta abrirlo nuevamente.' })
  } finally {
    descargandoAdjuntoId.value = null
  }
}

const agregarComentario = async () => {
  if (!cotizacionSeleccionada.value || !nuevoComentario.value.trim() || guardandoComentario.value) return

  guardandoComentario.value = true
  try {
    const { data, error } = await useSanctumFetch(`/api/consultas/medicos/${cotizacionSeleccionada.value.id}/comentarios`, {
      method: 'POST',
      body: { comentario: nuevoComentario.value.trim() },
    })
    if (error.value) {
      push.error({ title: 'Error', message: 'No se pudo registrar el comentario.' })
      return
    }

    cotizacionSeleccionada.value.comentarios = cotizacionSeleccionada.value.comentarios || []
    cotizacionSeleccionada.value.comentarios.push(data.value?.comentario)
    nuevoComentario.value = ''
    push.success({ title: 'Comentario agregado', message: 'Se identificará como comentario de consulta médica.' })
  } catch (error) {
    console.error(error)
    push.error({ title: 'Error', message: 'Ocurrió un error al registrar el comentario.' })
  } finally {
    guardandoComentario.value = false
  }
}

const procedimientos = (cotizacion) => {
  const items = Array.isArray(cotizacion?.items) ? cotizacion.items : []
  return items.map(item => ({
    codigo: item.codigo || 'Sin CUPS',
    nombre: item.nombre || 'Sin nombre',
    lateralidad: item.lateralidad || '',
  }))
}

const nombresProcedimientos = (cotizacion) => procedimientos(cotizacion)
  .map(item => `${item.codigo} — ${item.nombre}`)
  .join('\n') || 'Sin procedimientos'

const adjuntos = computed(() => extraerAdjuntos(cotizacionSeleccionada.value))

const tipoDocumento = (cotizacion) => {
  const tipo = String(cotizacion?.tipo_gestion || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return tipo === 'codificacion' ? 'Codificación' : 'Cotización'
}

const origenCotizacion = (origen) => {
  const value = String(origen ?? '').trim()
  if (value === '1') return { etiqueta: 'Consultorio privado', clase: 'bg-violet-100 text-violet-800' }
  if (value === '2') return { etiqueta: 'Consultorio institucional', clase: 'bg-sky-100 text-sky-800' }
  return { etiqueta: 'Sin origen', clase: 'bg-slate-100 text-slate-600' }
}

const formatearFecha = (fecha) => {
  if (!fecha) return 'No registrada'
  const value = new Date(fecha.includes?.('T') ? fecha : `${fecha}T12:00:00`)
  if (Number.isNaN(value.getTime())) return 'No registrada'
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(value)
}

const fileUrl = (path) => `${apiBase}/storage/${path}`

onMounted(async () => {
  await refreshUserPermissions()
  if (!canAccess.value) {
    await navigateTo('/403')
    return
  }
  await buscar()
})
</script>

<template>
  <div class="w-full max-w-none space-y-5">
    <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <h1 class="text-2xl font-semibold text-slate-900">Cotizaciones por médico</h1>
      <p class="mt-1 text-sm text-slate-600">Solo se muestran las cotizaciones de los médicos asociados a tu usuario.</p>
      <form class="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]" @submit.prevent="buscar(1)">
        <input v-model="documento" type="search" placeholder="Número de identificación del paciente" class="h-11 rounded-lg border border-slate-300 px-3" />
        <input v-model="procedimiento" type="search" placeholder="CUPS o nombre del procedimiento" class="h-11 rounded-lg border border-slate-300 px-3" />
        <input v-model="codigo" type="search" placeholder="Número de cotización o codificación" class="h-11 rounded-lg border border-slate-300 px-3" />
        <button type="submit" :disabled="cargando" class="h-11 rounded-lg bg-indigo-700 px-5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60">
          {{ cargando ? 'Buscando...' : 'Buscar' }}
        </button>
        <button type="button" :disabled="cargando" class="h-11 rounded-lg bg-slate-100 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60" @click="limpiar">
          Limpiar
        </button>
      </form>
    </section>

    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 md:px-5">
        <p class="text-sm text-slate-600">{{ pagination.total }} resultado{{ pagination.total === 1 ? '' : 's' }}</p>
        <p class="text-sm text-slate-500">Página {{ pagination.current_page }} de {{ pagination.last_page }}</p>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-[1180px] w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3 font-semibold">Código</th>
              <th class="px-4 py-3 font-semibold">Paciente</th>
              <th class="px-4 py-3 font-semibold">Identificación</th>
              <th class="px-4 py-3 font-semibold">Médico</th>
              <th class="px-4 py-3 font-semibold">Procedimientos</th>
              <th class="px-4 py-3 font-semibold">Origen</th>
              <th class="px-4 py-3 font-semibold">Estado</th>
              <th class="px-4 py-3 font-semibold">Fecha</th>
              <th class="px-4 py-3 font-semibold text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cargando"><td colspan="9" class="px-4 py-10 text-center text-slate-500"><span class="inline-flex items-center gap-3"><svg class="h-5 w-5 animate-spin text-indigo-700" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" /><path class="opacity-75" fill="currentColor" d="M21 12a9 9 0 0 0-9-9v3a6 6 0 0 1 6 6h3Z" /></svg> Cargando cotizaciones...</span></td></tr>
            <tr v-else-if="!cotizaciones.length"><td colspan="9" class="px-4 py-10 text-center text-slate-500">No hay cotizaciones para los médicos asociados con los filtros actuales.</td></tr>
            <tr v-for="cotizacion in cotizaciones" :key="cotizacion.id" class="border-t border-slate-200 hover:bg-slate-50/70">
              <td class="px-4 py-3 font-semibold text-indigo-700">{{ cotizacion.codigo }}</td>
              <td class="px-4 py-3">{{ cotizacion.paciente?.nombre_completo || 'Paciente no registrado' }}</td>
              <td class="px-4 py-3 font-mono text-xs">{{ cotizacion.paciente?.numero_identificacion || 'No registrada' }}</td>
              <td class="px-4 py-3">{{ cotizacion.medico?.nombre || 'No especificado' }}</td>
              <td class="max-w-80 px-4 py-3">
                <span class="line-clamp-2" :title="nombresProcedimientos(cotizacion)">{{ nombresProcedimientos(cotizacion) }}</span>
              </td>
              <td class="px-4 py-3"><span class="whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold" :class="origenCotizacion(cotizacion.origen).clase">{{ origenCotizacion(cotizacion.origen).etiqueta }}</span></td>
              <td class="px-4 py-3"><span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{{ cotizacion.estado?.nombre || 'Sin estado' }}</span></td>
              <td class="px-4 py-3 whitespace-nowrap">{{ formatearFecha(cotizacion.fecha_recepcion || cotizacion.created_at) }}</td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <button class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" @click="abrirAdjuntos(cotizacion)">Archivos</button>
                  <button class="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50" @click="abrirDetalle(cotizacion)">Ver detalle</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-end gap-3 border-t border-slate-200 px-4 py-3">
        <button :disabled="cargando || pagination.current_page <= 1" class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40" @click="buscar(pagination.current_page - 1)">Anterior</button>
        <button :disabled="cargando || pagination.current_page >= pagination.last_page" class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40" @click="buscar(pagination.current_page + 1)">Siguiente</button>
      </div>
    </section>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="mostrarDetalle" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4" @click.self="cerrarDetalle">
          <section class="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <header class="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div><p class="text-xs font-bold uppercase tracking-wide text-indigo-700">{{ tipoDocumento(cotizacionSeleccionada) }}</p><h2 class="mt-1 text-xl font-semibold text-slate-900">{{ cotizacionSeleccionada?.codigo || 'Detalle' }}</h2></div>
              <button class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600 hover:bg-slate-200" aria-label="Cerrar" @click="cerrarDetalle">×</button>
            </header>
            <div v-if="cargandoDetalle" class="p-12 text-center text-slate-500">Cargando detalle...</div>
            <div v-else-if="cotizacionSeleccionada" class="space-y-6 p-5">
              <div class="grid gap-3 md:grid-cols-2">
                <div class="rounded-xl border border-slate-200 bg-slate-50 p-4"><p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Paciente</p><p class="mt-2 font-semibold text-slate-900">{{ cotizacionSeleccionada.paciente?.nombre_completo || 'No registrado' }}</p><p class="mt-1 text-sm text-slate-600">{{ cotizacionSeleccionada.paciente?.numero_identificacion || 'Sin identificación' }}</p></div>
                <div class="rounded-xl border border-slate-200 bg-slate-50 p-4"><p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Resumen</p><p class="mt-2 text-sm"><b>Médico:</b> {{ cotizacionSeleccionada.medico?.nombre || 'No especificado' }}</p><p class="mt-1 text-sm"><b>Estado:</b> {{ cotizacionSeleccionada.estado?.nombre || 'Sin estado' }}</p><p class="mt-1 text-sm"><b>Entidad:</b> {{ cotizacionSeleccionada.entidad?.nombre || 'No especificada' }}</p><p v-if="cotizacionSeleccionada.codificacion?.numero_autorizacion" class="mt-1 text-sm"><b>Autorización:</b> {{ cotizacionSeleccionada.codificacion.numero_autorizacion }}</p></div>
              </div>

              <section class="overflow-hidden rounded-xl border border-slate-200"><h3 class="bg-slate-50 px-4 py-3 font-semibold text-slate-900">Procedimientos</h3><div class="divide-y divide-slate-200"><div v-for="item in procedimientos(cotizacionSeleccionada)" :key="`${item.codigo}-${item.lateralidad}`" class="grid gap-1 px-4 py-3 text-sm md:grid-cols-[10rem_1fr_8rem]"><span class="font-mono text-slate-600">{{ item.codigo }}</span><span>{{ item.nombre }}</span><span class="capitalize text-slate-500">{{ item.lateralidad || '-' }}</span></div></div></section>

              <section class="rounded-xl border border-slate-200 p-4"><h3 class="font-semibold text-slate-900">Observaciones</h3><p class="mt-2 whitespace-pre-line text-sm text-slate-700">{{ cotizacionSeleccionada.observaciones || 'Sin observaciones.' }}</p></section>

              <section class="rounded-xl border border-slate-200 p-4"><h3 class="font-semibold text-slate-900">Archivos adjuntos</h3><p v-if="!adjuntos.length" class="mt-2 text-sm text-slate-500">No hay archivos adjuntos en esta cotización.</p><ul v-else class="mt-3 space-y-2"><li v-for="adjunto in adjuntos" :key="adjunto.id" class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span><b>{{ adjunto.archivo_nombre }}</b><span class="ml-2 text-slate-500">— {{ adjunto.usuario }}</span></span><a :href="fileUrl(adjunto.archivo_path)" target="_blank" rel="noopener" class="font-semibold text-indigo-700 hover:underline">Ver archivo</a></li></ul></section>

              <section class="rounded-xl border border-slate-200 p-4"><h3 class="font-semibold text-slate-900">Comentarios</h3><div v-for="comentario in cotizacionSeleccionada.comentarios || []" :key="comentario.id" class="mt-3 rounded-lg border p-3 text-sm" :class="comentario.origen === 'medico' ? 'border-cyan-200 bg-cyan-50' : 'border-slate-200 bg-slate-50'"><p class="font-semibold text-slate-800"><span v-if="comentario.origen === 'medico'" class="mr-2 rounded-full bg-cyan-100 px-2 py-0.5 text-xs text-cyan-800">Consulta médica</span>{{ comentario.usuario?.name || 'Usuario no disponible' }}</p><p class="mt-1 whitespace-pre-line text-slate-700">{{ comentario.comentario }}</p></div>
                <div v-if="canComment" class="mt-4 border-t border-slate-200 pt-4"><label class="text-sm font-semibold text-slate-700">Agregar comentario de consulta médica</label><textarea v-model="nuevoComentario" class="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm" placeholder="Escribe un comentario para esta cotización" :disabled="guardandoComentario" /><div class="mt-2 flex justify-end"><button :disabled="guardandoComentario || !nuevoComentario.trim()" class="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50" @click="agregarComentario">{{ guardandoComentario ? 'Guardando...' : 'Agregar comentario' }}</button></div></div>
              </section>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="mostrarAdjuntos" class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4" @click.self="mostrarAdjuntos = false">
          <section class="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header class="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-wide text-indigo-700">Archivos adjuntos</p>
                <h2 class="mt-1 text-xl font-semibold text-slate-900">{{ codigoAdjuntos || 'Codificación' }}</h2>
              </div>
              <button class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600 hover:bg-slate-200" aria-label="Cerrar" @click="mostrarAdjuntos = false">×</button>
            </header>
            <div class="max-h-[65vh] overflow-y-auto p-5">
              <div v-if="cargandoAdjuntos" class="flex items-center justify-center gap-3 py-12 text-sm text-slate-500">
                <svg class="h-5 w-5 animate-spin text-indigo-700" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" /><path class="opacity-75" fill="currentColor" d="M21 12a9 9 0 0 0-9-9v3a6 6 0 0 1 6 6h3Z" /></svg>
                Cargando archivos...
              </div>
              <div v-else-if="!adjuntosSeleccionados.length" class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">No hay archivos adjuntos en esta codificación.</div>
              <ul v-else class="space-y-3">
                <li v-for="adjunto in adjuntosSeleccionados" :key="adjunto.id" class="rounded-xl border border-slate-200 p-4">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="min-w-0">
                      <p class="truncate font-semibold text-slate-800">{{ adjunto.archivo_nombre }}</p>
                      <p class="mt-1 text-xs text-slate-500">Adjuntado por {{ adjunto.usuario }}</p>
                      <p v-if="adjunto.comentario" class="mt-2 text-sm text-slate-600">{{ adjunto.comentario }}</p>
                    </div>
                    <button
                      type="button"
                      :disabled="descargandoAdjuntoId !== null"
                      class="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                      @click="descargarAdjunto(adjunto)"
                    >
                      <svg v-if="descargandoAdjuntoId === adjunto.id" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" /><path class="opacity-75" fill="currentColor" d="M21 12a9 9 0 0 0-9-9v3a6 6 0 0 1 6 6h3Z" /></svg>
                      {{ descargandoAdjuntoId === adjunto.id ? 'Descargando...' : 'Descargar' }}
                    </button>
                  </div>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
