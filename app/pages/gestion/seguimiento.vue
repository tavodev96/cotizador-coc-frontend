<script setup>
definePageMeta({
  middleware: ['sanctum:auth'],
});

const router = useRouter()
const route = useRoute()
const { hasPermission, hasRole } = useUserPermissions()

const cotizaciones = ref([])
const filtrosTabla = ref({})
const ordenTabla = ref({ key: '', direction: 'asc' })
const columnas = [
  { key: 'created_at', label: 'Fecha de creación', align: 'left' },
  { key: 'codigo', label: 'Consecutivo', align: 'left' },
  { key: 'tipo_gestion', label: 'Tipo gestión', align: 'left' },
  { key: 'origen', label: 'Origen', align: 'left' },
  { key: 'paciente', label: 'Nombre del paciente', align: 'left' },
  { key: 'identificacion', label: 'Identificación', align: 'left' },
  { key: 'entidad', label: 'Entidad', align: 'left' },
  { key: 'asesor', label: 'Asesor', align: 'left' },
  { key: 'estado', label: 'Estado base', align: 'center' },
  { key: 'medico', label: 'Médico', align: 'left' },
  { key: 'estado_gestion', label: 'Estado de gestión', align: 'left' },
  { key: 'consultorio', label: 'Consultorio', align: 'left' },
  { key: 'poliza', label: 'Póliza', align: 'left' },
  { key: 'fecha_recepcion', label: 'Fecha recepción', align: 'left' },
  { key: 'fecha_ordenamiento', label: 'Fecha ordenamiento', align: 'left' },
  { key: 'fecha_vigencia', label: 'Fecha vigencia', align: 'left' },
  { key: 'fecha_programada', label: 'Fecha programada', align: 'left' },
  { key: 'hora_programada', label: 'Hora programada', align: 'center' },
  { key: 'fecha_realizado', label: 'Fecha realizado', align: 'left' },
  { key: 'items', label: 'Procedimientos', align: 'left' },
  { key: 'insumos', label: 'Insumos', align: 'left' },
  { key: 'total', label: 'Total', align: 'right' },
  { key: 'prioridad', label: 'Prioridad', align: 'center' },
  { key: 'salesforce', label: 'Salesforce', align: 'left' },
  { key: 'observaciones', label: 'Observaciones', align: 'left' },
  { key: 'dias', label: 'Días', align: 'center' },
  { key: 'acciones', label: 'Acciones', align: 'center', filterable: false, sortable: false },
]
const columnasPorDefecto = ['created_at', 'codigo', 'paciente', 'identificacion', 'estado', 'medico', 'estado_gestion', 'dias', 'acciones']
const columnasVisibles = ref([...columnasPorDefecto])
const buscadorRef = ref(null)
const resetBuscador = ref(false)
const busquedaRealizada = ref(false)
const cargandoBusqueda = ref(false)
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
})
const modalEliminar = ref(false)
const cotizacionAEliminar = ref(null)
const motivoEliminacion = ref('')
const eliminando = ref(false)
const confirmandoEliminacion = ref(false)
const modalEliminadas = ref(false)
const eliminadas = ref([])
const cargandoEliminadas = ref(false)
const paginationEliminadas = ref({ current_page: 1, last_page: 1, per_page: 10, total: 0 })
let filtrosTablaTimer = null

const canViewEliminadas = computed(() => {
  return hasPermission('seguimiento.eliminadas.ver')
    || hasRole('admin')
    || hasRole('Admin')
    || hasRole('administrador')
    || hasRole('Administrador')
    || hasRole('superadmin')
    || hasRole('Superadmin')
})

const hayFiltrosDashboard = computed(() => {
  return Boolean(
    route.query.asesor_id ||
    route.query.estado_id ||
    route.query.estado_gestion_id ||
    route.query.vigencia_estado ||
    route.query.codigo ||
    route.query.documento ||
    route.query.medico_id ||
    route.query.entidad_id ||
    route.query.fecha_inicio ||
    route.query.fecha_fin
  )
})

const formatoFecha = (fechaISO) => {
  if (!fechaISO) return ''
  const fecha = new Date(fechaISO)
  const dia = String(fecha.getDate()).padStart(2, '0')
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const anio = fecha.getFullYear()
  const horas = String(fecha.getHours()).padStart(2, '0')
  const minutos = String(fecha.getMinutes()).padStart(2, '0')
  return `${dia}/${mes}/${anio} ${horas}:${minutos}`
}

const actualizarResultados = (resultados) => {
  cotizaciones.value = resultados
  ordenTabla.value = { key: '', direction: 'asc' }
  busquedaRealizada.value = true
}

const actualizarPagination = (meta) => {
  pagination.value = {
    current_page: meta?.current_page || 1,
    last_page: meta?.last_page || 1,
    per_page: meta?.per_page || 10,
    total: meta?.total || 0,
  }
}

const actualizarLoading = (estado) => {
  cargandoBusqueda.value = Boolean(estado)
  if (estado) busquedaRealizada.value = true
}

const nombrePaciente = (cotizacion) => {
  const paciente = cotizacion?.paciente || {}
  return paciente.nombre_completo || `${paciente.nombres || ''} ${paciente.apellidos || ''}`.trim() || 'Sin nombre'
}

const claseVigencia = (vigencia) => {
  const estado = vigencia?.estado || ''

  if (estado === 'vencida') {
    return 'bg-rose-100 text-rose-700'
  }

  if (estado === 'por_vencer') {
    return 'bg-amber-100 text-amber-700'
  }

  if (estado === 'vigente') {
    return 'bg-emerald-100 text-emerald-700'
  }

  return 'bg-slate-100 text-slate-700'
}

const valorColumna = (cotizacion, key) => {
  const valores = {
    created_at: fechaCorta(cotizacion?.created_at),
    codigo: cotizacion?.codigo || '',
    tipo_gestion: cotizacion?.tipo_gestion || '',
    origen: textoOrigen(cotizacion?.origen),
    paciente: nombrePaciente(cotizacion),
    identificacion: cotizacion?.paciente?.numero_identificacion || 'N/A',
    entidad: cotizacion?.entidad?.nombre || cotizacion?.paciente?.entidad?.nombre || 'N/A',
    asesor: cotizacion?.asesor?.name || cotizacion?.asesor?.nombre || 'N/A',
    estado: cotizacion?.estado?.nombre || 'Sin estado',
    medico: cotizacion?.medico?.nombre || 'N/A',
    estado_gestion: cotizacion?.estado_gestion?.nombre || 'Sin gestión',
    consultorio: cotizacion?.consultorio?.nombre || 'N/A',
    poliza: cotizacion?.poliza?.nombre || cotizacion?.poliza_nombre || 'N/A',
    fecha_recepcion: fechaCorta(cotizacion?.fecha_recepcion),
    fecha_ordenamiento: fechaCorta(cotizacion?.fecha_ordenamiento),
    fecha_vigencia: fechaCorta(cotizacion?.fecha_vigencia || cotizacion?.codificacion?.fecha_vigencia),
    fecha_programada: fechaCorta(cotizacion?.fecha_programada),
    hora_programada: cotizacion?.hora_programada || '',
    fecha_realizado: fechaCorta(cotizacion?.fecha_realizado),
    items: resumenItems(cotizacion?.items),
    insumos: resumenItems(cotizacion?.detalles),
    total: formatearMoneda(totalCotizacion(cotizacion)),
    prioridad: cotizacion?.es_prioritaria ? 'Prioritaria' : 'Normal',
    salesforce: salesforceTexto(cotizacion),
    observaciones: cotizacion?.observaciones || '',
    dias: diasObservacion(cotizacion),
  }

  return valores[key] ?? ''
}

const normalizarTexto = (valor) => String(valor ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()

const columnasTabla = computed(() => columnas.filter((columna) => columnasVisibles.value.includes(columna.key)))

const cotizacionesFiltradas = computed(() => {
  const filtradas = cotizaciones.value

  if (!ordenTabla.value.key) return filtradas

  const direccion = ordenTabla.value.direction === 'desc' ? -1 : 1
  const key = ordenTabla.value.key

  return [...filtradas].sort((a, b) => {
    const valorA = valorColumna(a, key)
    const valorB = valorColumna(b, key)
    const numeroA = Number(String(valorA).replace(/[^\d.-]/g, ''))
    const numeroB = Number(String(valorB).replace(/[^\d.-]/g, ''))

    if (!Number.isNaN(numeroA) && !Number.isNaN(numeroB) && String(valorA).match(/\d/) && String(valorB).match(/\d/)) {
      return (numeroA - numeroB) * direccion
    }

    return String(valorA).localeCompare(String(valorB), 'es', { numeric: true, sensitivity: 'base' }) * direccion
  })
})

const alternarOrden = (key) => {
  if (ordenTabla.value.key === key) {
    ordenTabla.value.direction = ordenTabla.value.direction === 'asc' ? 'desc' : 'asc'
    return
  }

  ordenTabla.value = { key, direction: 'asc' }
}

const storageKeyColumnas = 'seguimiento-columnas-visibles'

const cargarColumnas = () => {
  if (import.meta.server) return
  const raw = localStorage.getItem(storageKeyColumnas)
  if (!raw) return

  try {
    const parsed = JSON.parse(raw)
    const validas = Array.isArray(parsed) ? parsed.filter((key) => columnas.some((columna) => columna.key === key)) : []
    if (validas.length) columnasVisibles.value = validas
  } catch (error) {
    console.error('No fue posible leer columnas de seguimiento:', error)
  }
}

watch(columnasVisibles, (actual) => {
  if (!actual.length) {
    columnasVisibles.value = [...columnasPorDefecto]
    return
  }

  if (!actual.includes('acciones')) {
    columnasVisibles.value = [...actual, 'acciones']
    return
  }

  if (!import.meta.server) {
    localStorage.setItem(storageKeyColumnas, JSON.stringify(actual))
  }
}, { deep: true })

watch(filtrosTabla, () => {
  if (!busquedaRealizada.value) return
  if (filtrosTablaTimer) clearTimeout(filtrosTablaTimer)
  filtrosTablaTimer = setTimeout(() => {
    buscadorRef.value?.buscar(1)
  }, 450)
}, { deep: true })

const claseDiasObservacion = (cotizacion) => {
  if (cotizacion?.vigencia?.estado === 'vencida') {
    return 'bg-rose-600 text-white'
  }

  return 'bg-emerald-600 text-white'
}

const diasObservacion = (cotizacion) => {
  const dias = cotizacion?.vigencia?.dias_restantes
  if (dias === null || dias === undefined || Number.isNaN(Number(dias))) return '-'
  return Math.abs(Number(dias))
}

const textoOrigen = (origen) => {
  if (!origen) return 'N/A'
  return String(origen).replace(/_/g, ' ')
}

const formatearMoneda = (valor) => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
}).format(Number(valor || 0))

const totalCotizacion = (cotizacion) => {
  if (cotizacion?.total !== null && cotizacion?.total !== undefined) return Number(cotizacion.total) || 0
  const totalItems = Array.isArray(cotizacion?.items)
    ? cotizacion.items.reduce((acc, item) => acc + ((Number(item?.valor || item?.valor_unitario || 0) || 0) * (Number(item?.cantidad || 1) || 1)), 0)
    : 0
  const totalDetalles = Array.isArray(cotizacion?.detalles)
    ? cotizacion.detalles.reduce((acc, detalle) => acc + ((Number(detalle?.valor || detalle?.valor_unitario || 0) || 0) * (Number(detalle?.cantidad || 1) || 1)), 0)
    : 0
  const valorPoliza = Number(cotizacion?.poliza?.valor_poliza || cotizacion?.valor_poliza || 0) || 0
  return totalItems + totalDetalles + valorPoliza
}

const resumenItems = (items) => {
  if (!Array.isArray(items) || !items.length) return 'N/A'
  return items
    .slice(0, 3)
    .map((item) => `${item?.codigo || ''}${item?.nombre ? ` - ${item.nombre}` : ''}`.trim())
    .filter(Boolean)
    .join(' | ') + (items.length > 3 ? ` +${items.length - 3}` : '')
}

const salesforceTexto = (cotizacion) => {
  const status = cotizacion?.salesforce_status || cotizacion?.last_salesforce_log?.status
  if (status === 'success') return 'Enviada'
  if (status === 'queued') return 'Encolada'
  if (status === 'error') return 'Error'
  return 'No enviada'
}

const abrirEliminar = (cotizacion) => {
  cotizacionAEliminar.value = cotizacion
  motivoEliminacion.value = ''
  confirmandoEliminacion.value = false
  modalEliminar.value = true
}

const cancelarEliminar = () => {
  if (eliminando.value) return
  modalEliminar.value = false
  cotizacionAEliminar.value = null
  motivoEliminacion.value = ''
  confirmandoEliminacion.value = false
}

const solicitarConfirmacionEliminar = () => {
  if (motivoEliminacion.value.trim().length < 5) {
    alert('Registra una observación de al menos 5 caracteres.')
    return
  }
  confirmandoEliminacion.value = true
}

const confirmarEliminar = async () => {
  if (!cotizacionAEliminar.value || eliminando.value) return
  eliminando.value = true

  const { error } = await useSanctumFetch(`/api/cotizacion/${cotizacionAEliminar.value.id}`, {
    method: 'DELETE',
    body: { motivo: motivoEliminacion.value.trim() },
  })

  if (error.value) {
    alert(error.value?.data?.message || 'No fue posible eliminar la cotización.')
    eliminando.value = false
    return
  }

  cotizaciones.value = cotizaciones.value.filter((item) => item.id !== cotizacionAEliminar.value.id)
  pagination.value.total = Math.max(Number(pagination.value.total || 0) - 1, 0)
  eliminando.value = false
  cancelarEliminar()
  await buscadorRef.value?.buscar(pagination.value.current_page)
}

const cargarEliminadas = async (page = 1) => {
  cargandoEliminadas.value = true
  const { data, error } = await useSanctumFetch('/api/cotizaciones/eliminadas', {
    query: { page, per_page: paginationEliminadas.value.per_page },
  })

  if (!error.value && data.value) {
    eliminadas.value = data.value.data || []
    paginationEliminadas.value = {
      current_page: data.value.current_page || 1,
      last_page: data.value.last_page || 1,
      per_page: data.value.per_page || 10,
      total: data.value.total || 0,
    }
  }

  cargandoEliminadas.value = false
}

const abrirHistoricoEliminadas = async () => {
  if (!canViewEliminadas.value) return
  modalEliminadas.value = true
  await cargarEliminadas(1)
}

const nombrePacienteEliminada = (item) => {
  const paciente = item?.snapshot?.paciente || {}
  return paciente.nombre_completo || `${paciente.nombres || ''} ${paciente.apellidos || ''}`.trim() || 'Sin paciente'
}

const irPagina = async (page) => {
  if (page < 1 || page > pagination.value.last_page || cargandoBusqueda.value) return
  await buscadorRef.value?.buscar(page)
}

const fechaCorta = (fechaISO) => {
  if (!fechaISO) return ''
  const match = String(fechaISO).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[3]}/${match[2]}/${match[1]}`
  return formatoFecha(fechaISO).slice(0, 10)
}

const borrarFiltros = () => {
  cotizaciones.value = []
  filtrosTabla.value = {}
  ordenTabla.value = { key: '', direction: 'asc' }
  resetBuscador.value = !resetBuscador.value
  busquedaRealizada.value = false
  actualizarPagination({ current_page: 1, last_page: 1, per_page: 10, total: 0 })
  router.replace({ path: route.path, query: {} })
};

onMounted(() => {
  cargarColumnas()
})

onBeforeUnmount(() => {
  if (filtrosTablaTimer) clearTimeout(filtrosTablaTimer)
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-5">
    <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
      <QuoterBuscador ref="buscadorRef" @resultados="actualizarResultados" @pagination="actualizarPagination" @loading="actualizarLoading" :reset="resetBuscador" :column-filters="filtrosTabla" />
    </div>

    <div
      v-if="cargandoBusqueda && hayFiltrosDashboard"
      class="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-700 animate-pulse"
    >
      Aplicando filtros del dashboard y cargando resultados...
    </div>

    <div class="flex items-center justify-between gap-3">
      <div class="text-sm text-slate-600">
        <span v-if="busquedaRealizada">{{ cotizacionesFiltradas.length }} resultado{{ cotizacionesFiltradas.length === 1 ? '' : 's' }} visible{{ cotizacionesFiltradas.length === 1 ? '' : 's' }}</span>
        <span v-else>Aplica filtros para consultar cotizaciones</span>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-2">
        <button
          v-if="canViewEliminadas"
          type="button"
          class="h-10 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"
          @click="abrirHistoricoEliminadas"
        >
          Ver eliminadas
        </button>

        <details v-if="cotizaciones.length > 0" class="relative">
          <summary class="h-10 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center text-sm font-medium">
            Columnas visibles ({{ columnasVisibles.length }})
          </summary>
          <div class="absolute right-0 z-20 mt-2 w-72 max-h-80 overflow-auto rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
            <label v-for="col in columnas" :key="col.key" class="flex items-center gap-2 py-1 text-sm text-slate-700">
              <input
                v-model="columnasVisibles"
                type="checkbox"
                :value="col.key"
                :disabled="col.key === 'acciones'"
                class="rounded border-slate-300"
              />
              <span>{{ col.label }}</span>
            </label>
          </div>
        </details>

        <button
          v-if="cotizaciones.length > 0 || busquedaRealizada"
          @click="borrarFiltros"
          class="h-10 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
        >
          Borrar filtros
        </button>
      </div>
    </div>

    <div v-if="cotizaciones.length || cargandoBusqueda" class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div class="flex items-center gap-2">
            <p class="text-sm font-semibold text-slate-900">Resultados de seguimiento</p>
            <span v-if="cargandoBusqueda" class="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
              <span class="h-2 w-2 animate-ping rounded-full bg-indigo-600"></span>
              Cargando
            </span>
          </div>
          <p class="text-xs text-slate-500">
            {{ cargandoBusqueda ? 'Actualizando resultados con los filtros aplicados...' : 'Revisa, imprime o edita cada cotización desde la misma tabla.' }}
          </p>
        </div>
        <span class="w-fit rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
          {{ cargandoBusqueda ? 'Consultando...' : `${cotizacionesFiltradas.length} de ${pagination.total} registro${pagination.total === 1 ? '' : 's'}` }}
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-[1700px] w-full text-sm border-collapse">
        <thead class="bg-[#172a83] text-white">
          <tr>
            <th
              v-for="col in columnasTabla"
              :key="col.key"
              class="px-4 py-3 text-xs font-bold uppercase tracking-wide"
              :class="col.align === 'center' ? 'text-center' : 'text-left'"
            >
              <button
                v-if="col.sortable !== false"
                type="button"
                class="inline-flex items-center gap-1 uppercase"
                @click="alternarOrden(col.key)"
              >
                {{ col.label }}
                <span class="text-[10px]">{{ ordenTabla.key === col.key ? (ordenTabla.direction === 'asc' ? '▲' : '▼') : '↕' }}</span>
              </button>
              <span v-else>{{ col.label }}</span>
            </th>
          </tr>
          <tr class="bg-indigo-950/90">
            <th v-for="col in columnasTabla" :key="`filter-${col.key}`" class="px-3 py-2">
              <input
                v-if="col.filterable !== false"
                v-model="filtrosTabla[col.key]"
                type="text"
                :placeholder="`Filtrar ${col.label}`"
                class="w-full rounded-md border border-indigo-300 bg-white px-2 py-1 text-xs font-normal text-slate-800 placeholder:text-slate-400 disabled:cursor-wait disabled:bg-slate-100 disabled:text-slate-400"
                :disabled="cargandoBusqueda"
              />
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <template v-if="cargandoBusqueda">
            <tr v-for="n in 8" :key="`skeleton-${n}`" class="animate-pulse">
              <td
                v-for="col in columnasTabla"
                :key="`skeleton-${n}-${col.key}`"
                class="px-4 py-3 align-top"
                :class="[col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left', ['created_at', 'codigo', 'identificacion', 'hora_programada', 'total'].includes(col.key) ? 'whitespace-nowrap' : 'min-w-40']"
              >
                <div
                  v-if="col.key === 'acciones'"
                  class="ml-auto flex justify-end gap-2"
                >
                  <span class="h-9 w-9 rounded-lg bg-slate-200"></span>
                  <span class="h-9 w-9 rounded-lg bg-slate-200"></span>
                  <span class="h-9 w-9 rounded-lg bg-slate-200"></span>
                </div>
                <span
                  v-else-if="['estado', 'estado_gestion', 'prioridad', 'salesforce', 'dias'].includes(col.key)"
                  class="inline-block h-7 w-24 rounded-full bg-slate-200"
                ></span>
                <span
                  v-else
                  class="block h-4 rounded bg-slate-200"
                  :class="col.key === 'paciente' || col.key === 'items' || col.key === 'observaciones' ? 'w-48' : 'w-28'"
                ></span>
              </td>
            </tr>
          </template>
          <template v-else>
          <tr v-for="c in cotizacionesFiltradas" :key="c.id" class="hover:bg-indigo-50/40 transition-colors">
            <td
              v-for="col in columnasTabla"
              :key="`${c.id}-${col.key}`"
              class="px-4 py-3 align-top text-slate-700"
              :class="[col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left', ['created_at', 'codigo', 'identificacion', 'hora_programada', 'total'].includes(col.key) ? 'whitespace-nowrap' : 'min-w-40']"
            >
              <span v-if="col.key === 'codigo'" class="font-bold text-slate-950">{{ c.codigo }}</span>
              <span v-else-if="col.key === 'paciente'" class="font-semibold text-slate-950">{{ nombrePaciente(c) }}</span>
              <span v-else-if="col.key === 'estado'" class="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase text-indigo-700 ring-1 ring-indigo-200">
                {{ c.estado?.nombre || 'Sin estado' }}
              </span>
              <span v-else-if="col.key === 'estado_gestion'" class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700 ring-1 ring-slate-200">
                {{ c.estado_gestion?.nombre || 'Sin gestión' }}
              </span>
              <span v-else-if="col.key === 'prioridad'" class="inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase" :class="c.es_prioritaria ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'">
                {{ valorColumna(c, col.key) }}
              </span>
              <span v-else-if="col.key === 'salesforce'" class="inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase" :class="salesforceTexto(c) === 'Enviada' ? 'bg-emerald-100 text-emerald-700' : salesforceTexto(c) === 'Error' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'">
                {{ salesforceTexto(c) }}
              </span>
              <template v-else-if="col.key === 'dias'">
                <span
                  v-if="c.vigencia?.mostrar !== false"
                  class="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-bold ring-2 ring-white shadow-sm"
                  :class="claseDiasObservacion(c)"
                  :title="c.vigencia?.label || ''"
                >
                  {{ diasObservacion(c) }}
                </span>
                <span v-else>-</span>
              </template>
              <div v-else-if="col.key === 'acciones'" class="flex items-center justify-end gap-2 whitespace-nowrap">
                <NuxtLink :to="`/cotizacion/${c.id}`" title="Ver detalle" class="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-white hover:border-indigo-300">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5c5.5 0 9 5.3 9 7s-3.5 7-9 7s-9-5.3-9-7s3.5-7 9-7m0 2c-4 0-6.8 3.8-7 5c.2 1.2 3 5 7 5s6.8-3.8 7-5c-.2-1.2-3-5-7-5m0 2.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 0 1 0-5"/></svg>
                </NuxtLink>
                <NuxtLink :to="`/cotizacion/imprimir/${c.id}`" title="Imprimir cotización" class="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 9V3h12v6h1a3 3 0 0 1 3 3v5h-4v4H6v-4H2v-5a3 3 0 0 1 3-3zm2 0h8V5H8zm0 10h8v-5H8zm11-4v-3a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v3h1v-3h12v3z"/></svg>
                </NuxtLink>
                <NuxtLink :to="`/cotizacion/editar/${c.id}`" title="Editar" class="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-indigo-700 text-white hover:bg-indigo-800">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="m5 16.2l9.9-9.9l2.8 2.8L7.8 19H5zm11.3-11.3l1.1-1.1a1.5 1.5 0 0 1 2.1 0l.7.7a1.5 1.5 0 0 1 0 2.1l-1.1 1.1z"/></svg>
                </NuxtLink>
                <button type="button" title="Eliminar" class="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-rose-600 text-white hover:bg-rose-700" @click="abrirEliminar(c)">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zm2-4h2V8H9zm4 0h2V8h-2z"/></svg>
                </button>
              </div>
              <span v-else class="block max-w-72 break-words">{{ valorColumna(c, col.key) || 'N/A' }}</span>
            </td>
          </tr>
          </template>
        </tbody>
      </table>
      <div v-if="!cargandoBusqueda && !cotizacionesFiltradas.length" class="px-4 py-8 text-center text-sm text-slate-600">
        No hay registros que coincidan con los filtros de la tabla.
      </div>
      </div>

      <div class="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <p class="text-sm text-slate-600">
          Página {{ pagination.current_page }} de {{ pagination.last_page }} · {{ pagination.per_page }} por página
        </p>
        <div class="flex items-center gap-2">
          <button
            class="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            :disabled="pagination.current_page <= 1 || cargandoBusqueda"
            @click="irPagina(pagination.current_page - 1)"
          >
            Anterior
          </button>
          <button
            class="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            :disabled="pagination.current_page >= pagination.last_page || cargandoBusqueda"
            @click="irPagina(pagination.current_page + 1)"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="busquedaRealizada" class="flex justify-center items-center py-10">
      <div class="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" class="mx-auto text-slate-400">
          <path fill="none" stroke="currentColor" stroke-linecap="square" stroke-width="2"
            d="M15.803 15.803A7.5 7.5 0 1 0 3 10.503m12.803 5.3l5.304 5.304m-5.304-5.304A7.48 7.48 0 0 1 10.5 18m-8.828-3.328L4.5 17.5m0 0l2.829 2.828M4.5 17.5l-2.828 2.828M4.5 17.5l2.829-2.828" />
        </svg>
        <p class="mt-3 text-slate-700 font-medium">No se encontraron cotizaciones con los filtros aplicados.</p>
      </div>
    </div>

    <div v-else class="flex justify-center items-center py-10">
      <div class="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="54" height="54" viewBox="0 0 24 24" class="mx-auto text-slate-400">
          <path fill="currentColor"
            d="M3 19q-.425 0-.712-.288T2 18t.288-.712T3 17h8q.425 0 .713.288T12 18t-.288.713T11 19zm0-5q-.425 0-.712-.288T2 13t.288-.712T3 12h3q.425 0 .713.288T7 13t-.288.713T6 14zm0-5q-.425 0-.712-.288T2 8t.288-.712T3 7h3q.425 0 .713.288T7 8t-.288.713T6 9zm11 7q-2.075 0-3.537-1.463T9 11t1.463-3.537T14 6t3.538 1.463T19 11q0 .725-.213 1.438t-.637 1.312l3.15 3.15q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-3.15-3.15q-.6.425-1.312.638T14 16m0-2q1.25 0 2.125-.875T17 11t-.875-2.125T14 8t-2.125.875T11 11t.875 2.125T14 14" />
        </svg>
        <p class="mt-3 text-slate-700 font-medium">Busca por código, documento del paciente o rango de fechas.</p>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="modalEliminar" class="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 px-4 py-6" @click.self="cancelarEliminar">
        <div class="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-rose-700">Eliminar cotización</p>
              <h2 class="mt-1 text-xl font-bold text-slate-950">{{ cotizacionAEliminar?.codigo || 'Cotización' }}</h2>
              <p class="mt-1 text-sm text-slate-600">Esta acción eliminará la cotización activa y guardará el histórico con el motivo registrado.</p>
            </div>
            <button type="button" class="h-9 w-9 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200" @click="cancelarEliminar">×</button>
          </div>

          <div class="mt-5 space-y-4">
            <div>
              <label class="mb-1 block text-sm font-semibold text-slate-700">Observación obligatoria</label>
              <textarea
                v-model="motivoEliminacion"
                rows="4"
                class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
                placeholder="Indica por qué se elimina esta cotización"
                :disabled="eliminando || confirmandoEliminacion"
              />
            </div>

            <div v-if="confirmandoEliminacion" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <p class="font-bold">Confirma la eliminación definitiva.</p>
              <p class="mt-1">Se conservará el histórico, la observación y una copia de los datos eliminados.</p>
            </div>
          </div>

          <div class="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" class="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" :disabled="eliminando" @click="cancelarEliminar">
              Cancelar
            </button>
            <button
              v-if="!confirmandoEliminacion"
              type="button"
              class="h-10 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700"
              @click="solicitarConfirmacionEliminar"
            >
              Continuar
            </button>
            <button
              v-else
              type="button"
              class="h-10 rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
              :disabled="eliminando"
              @click="confirmarEliminar"
            >
              {{ eliminando ? 'Eliminando...' : 'Sí, eliminar definitivamente' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="modalEliminadas" class="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 px-4 py-6" @click.self="modalEliminadas = false">
        <div class="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200">
          <div class="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-indigo-700">Histórico</p>
              <h2 class="mt-1 text-xl font-bold text-slate-950">Cotizaciones eliminadas</h2>
              <p class="mt-1 text-sm text-slate-600">Consulta qué se eliminó, quién lo eliminó y el motivo registrado.</p>
            </div>
            <button type="button" class="h-9 w-9 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200" @click="modalEliminadas = false">×</button>
          </div>

          <div class="overflow-auto p-5">
            <div v-if="cargandoEliminadas" class="space-y-3">
              <div v-for="n in 4" :key="n" class="h-20 animate-pulse rounded-xl bg-slate-100"></div>
            </div>
            <div v-else-if="!eliminadas.length" class="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              No hay cotizaciones eliminadas registradas.
            </div>
            <div v-else class="space-y-3">
              <div v-for="item in eliminadas" :key="item.id" class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p class="font-bold text-slate-950">{{ item.codigo || `ID ${item.cotizacion_id}` }}</p>
                    <p class="text-sm text-slate-600">Paciente: {{ nombrePacienteEliminada(item) }}</p>
                    <p class="text-sm text-slate-600">Entidad: {{ item.snapshot?.entidad?.nombre || 'N/A' }} · Médico: {{ item.snapshot?.medico?.nombre || 'N/A' }}</p>
                  </div>
                  <div class="text-left text-xs text-slate-500 md:text-right">
                    <p>Eliminó: {{ item.usuario?.name || 'Usuario no disponible' }}</p>
                    <p>{{ formatoFecha(item.created_at) }}</p>
                  </div>
                </div>
                <div class="mt-3 rounded-lg bg-white p-3 text-sm text-slate-700 border border-slate-200">
                  <span class="font-semibold text-slate-900">Motivo:</span> {{ item.motivo }}
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <p class="text-sm text-slate-600">Página {{ paginationEliminadas.current_page }} de {{ paginationEliminadas.last_page }} · {{ paginationEliminadas.total }} registro{{ paginationEliminadas.total === 1 ? '' : 's' }}</p>
            <div class="flex items-center gap-2">
              <button class="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50" :disabled="paginationEliminadas.current_page <= 1 || cargandoEliminadas" @click="cargarEliminadas(paginationEliminadas.current_page - 1)">
                Anterior
              </button>
              <button class="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50" :disabled="paginationEliminadas.current_page >= paginationEliminadas.last_page || cargandoEliminadas" @click="cargarEliminadas(paginationEliminadas.current_page + 1)">
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

