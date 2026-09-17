<template>
  <div class="space-y-6">
    <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-sm font-semibold uppercase tracking-wide text-indigo-700">Gestión</p>
          <h1 class="mt-1 text-2xl font-bold text-slate-900">Autogestión de ordenamientos</h1>
          <p class="mt-2 max-w-3xl text-sm text-slate-600">
            Ordenamientos recibidos desde Servinte y su relación con cotizaciones o codificaciones registradas en el sistema.
          </p>
        </div>
        <button
          class="inline-flex h-11 items-center justify-center rounded-xl bg-[#162983] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#0f1d5f] disabled:opacity-60"
          :disabled="cargando"
          @click="buscar(1)"
        >
          {{ cargando ? 'Actualizando...' : 'Actualizar' }}
        </button>
      </div>
    </section>

    <section class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">Total filtrado</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{{ pagination.total }}</p>
      </div>
      <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <p class="text-sm text-emerald-700">Gestionados</p>
        <p class="mt-2 text-3xl font-bold text-emerald-800">{{ totales.gestionados }}</p>
      </div>
      <div class="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <p class="text-sm text-amber-700">Sin gestionar</p>
        <p class="mt-2 text-3xl font-bold text-amber-800">{{ totales.sin_gestionar }}</p>
      </div>
    </section>

    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">Filtros</h2>
          <p class="text-sm text-slate-500">Los filtros consultan el backend y respetan la paginación para evitar cargar todos los registros.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input v-model="filters.id_servinte" class="input" placeholder="ID Servinte" @keyup.enter="buscar(1)" />
        <input v-model="filters.documento" class="input" placeholder="Documento" @keyup.enter="buscar(1)" />

        <div class="relative" data-autogestion-dropdown>
          <button type="button" class="select-search-btn" @click="abrirSelector('entidad')">
            <span class="truncate" :class="filters.entidad_nom ? 'text-slate-800' : 'text-slate-400'">{{ filters.entidad_nom || 'Entidad' }}</span>
            <span class="text-slate-400">⌄</span>
          </button>
          <div v-if="dropdowns.entidad" class="select-search-panel">
            <input v-model="busquedasOpciones.entidad" class="input h-10" placeholder="Buscar entidad..." @input="buscarOpcionesDebounced('entidad')" />
            <button v-if="filters.entidad_nom" class="mt-2 text-xs font-semibold text-slate-500 hover:text-rose-600" @click="limpiarSelector('entidad')">Limpiar entidad</button>
            <div class="mt-2 max-h-56 overflow-auto">
              <button v-for="opcion in opciones.entidad" :key="`${opcion.value}-${opcion.codigo || ''}`" class="option-row" @click="seleccionarOpcion('entidad', opcion)">
                <span class="font-medium">{{ opcion.value }}</span>
                <span v-if="opcion.codigo" class="text-xs text-slate-500">{{ opcion.codigo }}</span>
              </button>
              <p v-if="!cargandoOpciones.entidad && !opciones.entidad.length" class="px-2 py-3 text-sm text-slate-500">Sin opciones.</p>
              <p v-if="cargandoOpciones.entidad" class="px-2 py-3 text-sm text-indigo-600">Buscando...</p>
            </div>
          </div>
        </div>

        <input v-model="filters.consultorio" class="input" placeholder="Consultorio" @keyup.enter="buscar(1)" />

        <div class="relative" data-autogestion-dropdown>
          <button type="button" class="select-search-btn" @click="abrirSelector('medico')">
            <span class="truncate" :class="filters.medico ? 'text-slate-800' : 'text-slate-400'">{{ filters.medico || 'Médico' }}</span>
            <span class="text-slate-400">⌄</span>
          </button>
          <div v-if="dropdowns.medico" class="select-search-panel">
            <input v-model="busquedasOpciones.medico" class="input h-10" placeholder="Buscar médico..." @input="buscarOpcionesDebounced('medico')" />
            <button v-if="filters.medico" class="mt-2 text-xs font-semibold text-slate-500 hover:text-rose-600" @click="limpiarSelector('medico')">Limpiar médico</button>
            <div class="mt-2 max-h-56 overflow-auto">
              <button v-for="opcion in opciones.medico" :key="opcion.value" class="option-row" @click="seleccionarOpcion('medico', opcion)">{{ opcion.label }}</button>
              <p v-if="!cargandoOpciones.medico && !opciones.medico.length" class="px-2 py-3 text-sm text-slate-500">Sin opciones.</p>
              <p v-if="cargandoOpciones.medico" class="px-2 py-3 text-sm text-indigo-600">Buscando...</p>
            </div>
          </div>
        </div>

        <input v-model="filters.id_medico" class="input" placeholder="ID médico" @keyup.enter="buscar(1)" />

        <div class="relative" data-autogestion-dropdown>
          <button type="button" class="select-search-btn" @click="abrirSelector('cup')">
            <span class="truncate" :class="filters.cup ? 'text-slate-800' : 'text-slate-400'">{{ filters.cup || 'CUP' }}</span>
            <span class="text-slate-400">⌄</span>
          </button>
          <div v-if="dropdowns.cup" class="select-search-panel">
            <input v-model="busquedasOpciones.cup" class="input h-10" placeholder="Buscar CUP..." @input="buscarOpcionesDebounced('cup')" />
            <button v-if="filters.cup" class="mt-2 text-xs font-semibold text-slate-500 hover:text-rose-600" @click="limpiarSelector('cup')">Limpiar CUP</button>
            <div class="mt-2 max-h-56 overflow-auto">
              <button v-for="opcion in opciones.cup" :key="opcion.value" class="option-row" @click="seleccionarOpcion('cup', opcion)">{{ opcion.label }}</button>
              <p v-if="!cargandoOpciones.cup && !opciones.cup.length" class="px-2 py-3 text-sm text-slate-500">Sin opciones.</p>
              <p v-if="cargandoOpciones.cup" class="px-2 py-3 text-sm text-indigo-600">Buscando...</p>
            </div>
          </div>
        </div>

        <input v-model="filters.procedimiento" class="input" placeholder="Procedimiento" @keyup.enter="buscar(1)" />
        <input v-model="filters.cotizacion_codigo" class="input" placeholder="Código cotización" @keyup.enter="buscar(1)" />
        <input v-model="filters.fecha_desde" type="date" class="input" />
        <input v-model="filters.fecha_hasta" type="date" class="input" />
        <select v-model="filters.estado" class="input">
          <option value="">Todos los estados</option>
          <option value="gestionado">Gestionado</option>
          <option value="sin_gestionar">Sin gestionar</option>
        </select>
      </div>

      <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button class="h-10 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" :disabled="cargando" @click="limpiarFiltros">
          Borrar filtros y ver todos
        </button>
        <button
          class="inline-flex h-10 items-center justify-center rounded-xl bg-[#162983] px-4 text-sm font-semibold text-white hover:bg-[#0f1d5f] disabled:opacity-60"
          :disabled="cargando"
          @click="buscar(1)"
        >
          Aplicar filtros
        </button>
      </div>
    </section>

    <section class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">Ordenamientos Servinte</h2>
          <p class="text-sm text-slate-500">Página {{ pagination.current_page }} de {{ pagination.last_page }} · {{ pagination.per_page }} por página</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span v-if="cargando" class="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
            <span class="h-2 w-2 animate-ping rounded-full bg-indigo-600"></span>
            Cargando
          </span>
          <div class="relative" data-autogestion-dropdown>
            <button class="h-10 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="dropdowns.columnas = !dropdowns.columnas">
              Columnas visibles
            </button>
            <div v-if="dropdowns.columnas" class="absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
              <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Mostrar columnas</p>
              <label v-for="columna in columnasSeleccionables" :key="columna.key" class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <input type="checkbox" class="rounded border-slate-300 text-indigo-700" :checked="columnasVisibles.includes(columna.key)" @change="toggleColumna(columna.key)" />
                {{ columna.label }}
              </label>
            </div>
          </div>
        </div>
      </div>

      <div v-if="errorCarga" class="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">
        {{ errorCarga }}
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th v-for="columna in columnasTabla" :key="columna.key" class="px-4 py-3" :class="columna.key === 'acciones' ? 'text-right' : ''">
                {{ columna.label }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <template v-if="cargando">
              <tr v-for="n in 6" :key="`skeleton-${n}`">
                <td v-for="columna in columnasTabla" :key="columna.key" class="px-4 py-4">
                  <div class="h-4 w-full max-w-[160px] animate-pulse rounded bg-slate-200"></div>
                </td>
              </tr>
            </template>
            <template v-else>
              <tr v-for="ordenamiento in ordenamientos" :key="ordenamiento.id" class="hover:bg-slate-50">
                <td v-for="columna in columnasTabla" :key="columna.key" class="px-4 py-4" :class="columna.key === 'acciones' ? 'text-right' : 'text-slate-700'">
                  <template v-if="columna.key === 'estado'">
                    <div class="flex items-center gap-2">
                      <span
                        class="inline-flex h-8 w-8 items-center justify-center rounded-full text-base font-bold"
                        :class="ordenamiento.cotizacion_id ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'"
                        :title="ordenamiento.cotizacion_id ? 'Gestionado' : 'Sin gestionar'"
                      >
                        {{ ordenamiento.cotizacion_id ? '✓' : '×' }}
                      </span>
                      <button
                        class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                        title="Ver detalle del ordenamiento"
                        @click="abrirDetalle(ordenamiento)"
                      >
                        👁
                      </button>
                    </div>
                  </template>
                  <template v-else-if="columna.key === 'id_servinte'">
                    <span class="font-semibold text-slate-900">{{ ordenamiento.id_servinte || '-' }}</span>
                  </template>
                  <template v-else-if="columna.key === 'entidad'">
                    <p class="font-medium">{{ ordenamiento.entidad_nom || '-' }}</p>
                    <p class="text-xs text-slate-500">{{ ordenamiento.entidad_cod || '' }}</p>
                  </template>
                  <template v-else-if="columna.key === 'fecha'">
                    {{ formatearFecha(ordenamiento.fecha) }}
                  </template>
                  <template v-else-if="columna.key === 'cup_procedimiento'">
                    <p class="font-medium">{{ ordenamiento.cup || '-' }}</p>
                    <p class="line-clamp-2 text-xs text-slate-500">{{ ordenamiento.procedimiento || '-' }}</p>
                  </template>
                  <template v-else-if="columna.key === 'medico'">
                    <p>{{ ordenamiento.medico || '-' }}</p>
                    <p class="text-xs text-slate-500">{{ ordenamiento.id_medico || '' }}</p>
                  </template>
                  <template v-else-if="columna.key === 'cotizacion'">
                    <p class="font-semibold text-slate-900">{{ ordenamiento.cotizacion_codigo || '-' }}</p>
                    <p v-if="ordenamiento.cotizacion?.tipo_gestion" class="text-xs text-slate-500 capitalize">{{ ordenamiento.cotizacion.tipo_gestion }}</p>
                  </template>
                  <template v-else-if="columna.key === 'gestor'">
                    <p class="font-medium text-slate-900">{{ gestorOrdenamiento(ordenamiento) }}</p>
                    <p v-if="ordenamiento.relacionado_at" class="text-xs text-slate-500">{{ formatearFecha(ordenamiento.relacionado_at) }}</p>
                  </template>
                  <template v-else-if="columna.key === 'acciones'">
                    <button
                      v-if="!ordenamiento.cotizacion_id && canRelacionar"
                      class="inline-flex h-9 items-center justify-center rounded-lg border border-indigo-200 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                      @click="abrirModalRelacion(ordenamiento)"
                    >
                      Relacionar
                    </button>
                    <span v-else class="text-xs text-slate-400">-</span>
                  </template>
                  <template v-else>
                    {{ valorColumna(ordenamiento, columna.key) }}
                  </template>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div v-if="!cargando && !ordenamientos.length" class="px-5 py-10 text-center text-sm text-slate-500">
        No hay ordenamientos con los filtros seleccionados.
      </div>

      <div class="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <p class="text-sm text-slate-500">{{ pagination.total }} registro{{ pagination.total === 1 ? '' : 's' }}</p>
        <div class="flex flex-wrap gap-2">
          <button class="btn-page" :disabled="pagination.current_page <= 1 || cargando" @click="buscar(pagination.current_page - 1)">Anterior</button>
          <button
            v-for="page in pages"
            :key="page"
            class="btn-page"
            :class="page === pagination.current_page ? 'bg-[#162983] text-white' : ''"
            :disabled="cargando"
            @click="buscar(page)"
          >
            {{ page }}
          </button>
          <button class="btn-page" :disabled="pagination.current_page >= pagination.last_page || cargando" @click="buscar(pagination.current_page + 1)">Siguiente</button>
        </div>
      </div>
    </section>

    <div v-if="modalRelacion" class="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 px-4" @click.self="cerrarModalRelacion">
      <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold uppercase tracking-wide text-indigo-700">Relacionar ordenamiento</p>
            <h3 class="mt-1 text-xl font-semibold text-slate-900">ID Servinte {{ ordenamientoSeleccionado?.id_servinte }}</h3>
          </div>
          <button class="h-9 w-9 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200" @click="cerrarModalRelacion">×</button>
        </div>

        <p class="mt-3 text-sm text-slate-600">
          Ingresa el código de una cotización o codificación existente para marcar este ordenamiento como gestionado.
        </p>

        <div class="mt-4">
          <label class="mb-1 block text-sm font-medium text-slate-700">Código de cotización</label>
          <input v-model="codigoRelacion" class="input" placeholder="Ej: SAI-0000001" @keyup.enter="guardarRelacion" />
        </div>

        <p v-if="mensajeRelacion" class="mt-3 rounded-lg px-3 py-2 text-sm" :class="errorRelacion ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'">
          {{ mensajeRelacion }}
        </p>

        <div class="mt-5 flex justify-end gap-2">
          <button class="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="cerrarModalRelacion">Cancelar</button>
          <button class="h-10 rounded-lg bg-[#162983] px-4 text-sm font-semibold text-white hover:bg-[#0f1d5f] disabled:opacity-60" :disabled="guardandoRelacion" @click="guardarRelacion">
            {{ guardandoRelacion ? 'Guardando...' : 'Guardar relación' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="modalDetalle" class="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 px-4 py-6" @click.self="cerrarDetalle">
      <div class="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div class="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-5">
          <div>
            <p class="text-sm font-semibold uppercase tracking-wide text-indigo-700">Detalle del ordenamiento</p>
            <h3 class="mt-1 text-xl font-semibold text-slate-900">ID Servinte {{ detalleOrdenamiento?.id_servinte }}</h3>
          </div>
          <button class="h-9 w-9 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200" @click="cerrarDetalle">×</button>
        </div>

        <div class="max-h-[calc(90vh-92px)] overflow-y-auto px-6 py-5">
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div v-for="item in detalleOrdenamientoItems" :key="item.label" class="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ item.label }}</p>
              <p class="mt-1 break-words text-sm font-medium text-slate-800">{{ item.value || '-' }}</p>
            </div>
          </div>

          <div v-if="detalleOrdenamiento?.raw_payload" class="mt-5 rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100">
            <p class="mb-3 text-sm font-semibold text-white">Payload original</p>
            <pre class="max-h-80 overflow-auto whitespace-pre-wrap text-xs leading-relaxed">{{ JSON.stringify(detalleOrdenamiento.raw_payload, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ middleware: ['sanctum:auth'] })

const { hasPermission, hasRole } = useUserPermissions()

const storageColumnas = 'autogestion-columnas-visibles'
const columnas = [
  { key: 'estado', label: 'Estado' },
  { key: 'id_servinte', label: 'ID Servinte' },
  { key: 'documento', label: 'Documento' },
  { key: 'entidad', label: 'Entidad' },
  { key: 'fecha', label: 'Fecha' },
  { key: 'cup_procedimiento', label: 'CUP / Procedimiento' },
  { key: 'consultorio', label: 'Consultorio' },
  { key: 'medico', label: 'Médico' },
  { key: 'cotizacion', label: 'Cotización / Codificación' },
  { key: 'gestor', label: 'Gestionado por' },
  { key: 'acciones', label: 'Acciones' },
]
const columnasSeleccionables = columnas.filter((columna) => columna.key !== 'acciones')
const columnasVisibles = ref(columnasSeleccionables.map((columna) => columna.key))

const filters = reactive({
  id_servinte: '',
  documento: '',
  entidad_cod: '',
  entidad_nom: '',
  fecha_desde: '',
  fecha_hasta: '',
  consultorio: '',
  medico: '',
  id_medico: '',
  cup: '',
  procedimiento: '',
  cotizacion_codigo: '',
  estado: '',
})

const ordenamientos = ref([])
const cargando = ref(false)
const errorCarga = ref('')
const totales = reactive({ gestionados: 0, sin_gestionar: 0 })
const pagination = reactive({ current_page: 1, last_page: 1, per_page: 15, total: 0 })
const modalRelacion = ref(false)
const modalDetalle = ref(false)
const ordenamientoSeleccionado = ref(null)
const detalleOrdenamiento = ref(null)
const codigoRelacion = ref('')
const guardandoRelacion = ref(false)
const mensajeRelacion = ref('')
const errorRelacion = ref(false)
const dropdowns = reactive({ medico: false, cup: false, entidad: false, columnas: false })
const busquedasOpciones = reactive({ medico: '', cup: '', entidad: '' })
const opciones = reactive({ medico: [], cup: [], entidad: [] })
const cargandoOpciones = reactive({ medico: false, cup: false, entidad: false })
let opcionesTimer = null

const canRelacionar = computed(() => {
  return hasPermission('autogestion.relacionar') || hasRole('admin') || hasRole('Admin') || hasRole('administrador') || hasRole('Administrador') || hasRole('superadmin') || hasRole('Superadmin')
})

const columnasTabla = computed(() => columnas.filter((columna) => columna.key === 'acciones' || columnasVisibles.value.includes(columna.key)))

watch(columnasVisibles, (value) => {
  if (import.meta.client) localStorage.setItem(storageColumnas, JSON.stringify(value))
}, { deep: true })

const pages = computed(() => {
  const last = Number(pagination.last_page || 1)
  const current = Number(pagination.current_page || 1)
  const start = Math.max(1, current - 2)
  const end = Math.min(last, start + 4)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})

const detalleOrdenamientoItems = computed(() => {
  const item = detalleOrdenamiento.value || {}
  return [
    { label: 'Estado', value: item.cotizacion_id ? 'Gestionado' : 'Sin gestionar' },
    { label: 'ID Servinte', value: item.id_servinte },
    { label: 'Documento', value: item.documento },
    { label: 'Entidad', value: [item.entidad_nom, item.entidad_cod].filter(Boolean).join(' - ') },
    { label: 'Fecha', value: formatearFecha(item.fecha) },
    { label: 'Consultorio', value: item.consultorio },
    { label: 'Médico', value: [item.medico, item.id_medico].filter(Boolean).join(' - ') },
    { label: 'CUP', value: item.cup },
    { label: 'Procedimiento', value: item.procedimiento },
    { label: 'Cotización/Codificación', value: item.cotizacion_codigo },
    { label: 'Tipo gestión', value: item.cotizacion?.tipo_gestion },
    { label: 'Gestionado por', value: gestorOrdenamiento(item) },
    { label: 'Relacionado el', value: formatearFecha(item.relacionado_at) },
  ]
})

const params = (page = 1) => {
  const query = { page, per_page: pagination.per_page }
  Object.entries(filters).forEach(([key, value]) => {
    const clean = String(value || '').trim()
    if (clean) query[key] = clean
  })
  return query
}

const buscar = async (page = 1) => {
  cargando.value = true
  errorCarga.value = ''
  ordenamientos.value = []

  const { data, error } = await useSanctumFetch('/api/autogestion/ordenamientos', {
    method: 'GET',
    query: params(page),
  })

  if (error.value) {
    errorCarga.value = error.value?.data?.message || 'No fue posible cargar los ordenamientos de Autogestión.'
    pagination.current_page = page
    pagination.last_page = 1
    pagination.total = 0
    totales.gestionados = 0
    totales.sin_gestionar = 0
    cargando.value = false
    return
  }

  ordenamientos.value = data.value?.data || []
  const meta = data.value?.pagination || {}
  pagination.current_page = meta.current_page || page
  pagination.last_page = meta.last_page || 1
  pagination.per_page = meta.per_page || pagination.per_page
  pagination.total = meta.total || 0
  totales.gestionados = data.value?.totales?.gestionados || 0
  totales.sin_gestionar = data.value?.totales?.sin_gestionar || 0

  cargando.value = false
}

const limpiarFiltros = () => {
  Object.keys(filters).forEach((key) => {
    filters[key] = ''
  })
  Object.keys(busquedasOpciones).forEach((key) => {
    busquedasOpciones[key] = ''
  })
  buscar(1)
}

const toggleColumna = (key) => {
  if (columnasVisibles.value.includes(key)) {
    if (columnasVisibles.value.length === 1) return
    columnasVisibles.value = columnasVisibles.value.filter((columna) => columna !== key)
    return
  }
  columnasVisibles.value = [...columnasVisibles.value, key]
}

const abrirSelector = async (tipo) => {
  Object.keys(dropdowns).forEach((key) => {
    dropdowns[key] = key === tipo ? !dropdowns[key] : false
  })
  if (dropdowns[tipo]) await buscarOpciones(tipo)
}

const buscarOpcionesDebounced = (tipo) => {
  clearTimeout(opcionesTimer)
  opcionesTimer = setTimeout(() => buscarOpciones(tipo), 300)
}

const buscarOpciones = async (tipo) => {
  cargandoOpciones[tipo] = true
  const { data } = await useSanctumFetch('/api/autogestion/ordenamientos/opciones', {
    method: 'GET',
    query: { tipo, q: busquedasOpciones[tipo], limit: 30 },
  })
  opciones[tipo] = data.value?.data || []
  cargandoOpciones[tipo] = false
}

const seleccionarOpcion = (tipo, opcion) => {
  if (tipo === 'entidad') {
    filters.entidad_nom = opcion.value || ''
    filters.entidad_cod = opcion.codigo || ''
  } else {
    filters[tipo] = opcion.value || ''
  }
  busquedasOpciones[tipo] = opcion.label || opcion.value || ''
  dropdowns[tipo] = false
}

const limpiarSelector = (tipo) => {
  if (tipo === 'entidad') {
    filters.entidad_nom = ''
    filters.entidad_cod = ''
  } else {
    filters[tipo] = ''
  }
  busquedasOpciones[tipo] = ''
  buscarOpciones(tipo)
}

const abrirModalRelacion = (ordenamiento) => {
  ordenamientoSeleccionado.value = ordenamiento
  codigoRelacion.value = ''
  mensajeRelacion.value = ''
  errorRelacion.value = false
  modalRelacion.value = true
}

const cerrarModalRelacion = () => {
  if (guardandoRelacion.value) return
  modalRelacion.value = false
  ordenamientoSeleccionado.value = null
}

const abrirDetalle = (ordenamiento) => {
  detalleOrdenamiento.value = ordenamiento
  modalDetalle.value = true
}

const cerrarDetalle = () => {
  modalDetalle.value = false
  detalleOrdenamiento.value = null
}

const guardarRelacion = async () => {
  if (!ordenamientoSeleccionado.value) return
  const codigo = codigoRelacion.value.trim()
  if (!codigo) {
    errorRelacion.value = true
    mensajeRelacion.value = 'Ingresa el código de cotización a relacionar.'
    return
  }

  guardandoRelacion.value = true
  mensajeRelacion.value = ''
  errorRelacion.value = false

  const { data, error } = await useSanctumFetch(`/api/autogestion/ordenamientos/${ordenamientoSeleccionado.value.id}/relacionar`, {
    method: 'PUT',
    body: { codigo },
  })

  if (error.value) {
    errorRelacion.value = true
    mensajeRelacion.value = error.value?.data?.message || 'No fue posible relacionar la cotización.'
    guardandoRelacion.value = false
    return
  }

  mensajeRelacion.value = data.value?.message || 'Ordenamiento relacionado correctamente.'
  guardandoRelacion.value = false
  modalRelacion.value = false
  await buscar(pagination.current_page)
}

const valorColumna = (ordenamiento, key) => ordenamiento?.[key] || '-'

const formatearFecha = (valor) => {
  if (!valor) return '-'
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return String(valor)
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(fecha)
}

const gestorOrdenamiento = (ordenamiento) => {
  if (!ordenamiento?.cotizacion_id) return '-'
  return ordenamiento.usuario_relacion?.name || ordenamiento.usuario_relacion?.email || ordenamiento.cotizacion?.asesor?.name || ordenamiento.cotizacion?.asesor?.email || 'Sin usuario asociado'
}

const cerrarDropdownsPorClick = (event) => {
  if (event.target?.closest?.('[data-autogestion-dropdown]')) return
  Object.keys(dropdowns).forEach((key) => {
    dropdowns[key] = false
  })
}

onMounted(() => {
  if (import.meta.client) {
    try {
      const stored = JSON.parse(localStorage.getItem(storageColumnas) || '[]')
      const validas = stored.filter((key) => columnasSeleccionables.some((columna) => columna.key === key))
      if (validas.length) columnasVisibles.value = validas
    } catch {}
    document.addEventListener('click', cerrarDropdownsPorClick)
  }
  buscar(1)
})

onBeforeUnmount(() => {
  clearTimeout(opcionesTimer)
  if (import.meta.client) document.removeEventListener('click', cerrarDropdownsPorClick)
})
</script>

<style scoped>
.input {
  @apply h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100;
}

.btn-page {
  @apply h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50;
}

.select-search-btn {
  @apply flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 text-left text-sm outline-none transition hover:border-indigo-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100;
}

.select-search-panel {
  @apply absolute z-30 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-xl;
}

.option-row {
  @apply flex w-full flex-col rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-800;
}
</style>
