<script setup>
definePageMeta({
  middleware: ['sanctum:auth'],
})

const router = useRouter()
const { ensureUserPermissions, hasPermission } = useUserPermissions()

// ── Estado ─────────────────────────────────────────────────
const cotizaciones   = ref([])
const medicos        = ref([])
const entidades      = ref([])
const loading        = ref(false)
const loadingCatalogo = ref(false)
const totalRegistros = ref(0)
const paginaActual   = ref(1)
const totalPaginas   = ref(1)

const canViewProgramacion = computed(() => hasPermission('programacion.ver'))
const canViewDetalle = computed(() => hasPermission('programacion.ver_detalle'))
const canChangeEstado = computed(() => hasPermission('programacion.cambiar_estado'))

// Filtros
const filtroCodigo   = ref('')
const filtroDocumento = ref('')
const filtroMedico   = ref('')
const filtroEntidad  = ref('')
const filtroMedicoTexto = ref('')
const filtroEntidadTexto = ref('')
const mostrarDropdownMedicos = ref(false)
const mostrarDropdownEntidades = ref(false)
const medicoDropdownRef = ref(null)
const entidadDropdownRef = ref(null)

// ── Modal cambio estado ─────────────────────────────────────
const estadosDisponibles      = ref([])
const mostrarModalEstado      = ref(false)
const cotizacionSeleccionada  = ref(null)
const nuevoEstadoId           = ref(null)
const comentarioEstado        = ref('')
const fechaProgramada         = ref('')
const horaProgramada          = ref('')
const savingEstado            = ref(false)
const requiereComentarioIds   = [6] // RECHAZADA
const estadosPermitidosProgramacion = ['PROGRAMADA', 'RECHAZADA']

// ── Helpers ────────────────────────────────────────────────
const formatoFecha = (iso) => {
  if (!iso) return '-'
  const f = new Date(iso)
  return `${String(f.getDate()).padStart(2,'0')}/${String(f.getMonth()+1).padStart(2,'0')}/${f.getFullYear()} ${String(f.getHours()).padStart(2,'0')}:${String(f.getMinutes()).padStart(2,'0')}`
}

const formatoFechaHoraProgramada = (fecha, hora) => {
  if (!fecha && !hora) return '-'
  if (!hora) return fecha
  return `${fecha} ${normalizarHora24(hora)}`
}

const normalizarHora24 = (hora) => {
  if (!hora) return ''
  return String(hora).slice(0, 5)
}

const esHora24Valida = (hora) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(normalizarHora24(hora))

const esCotizacionProgramada = (cotizacion) => {
  return String(cotizacion?.estado?.nombre || '').toUpperCase().trim() === 'PROGRAMADA'
}

const hoyISO = computed(() => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
})

const horaMinima = computed(() => {
  if (fechaProgramada.value !== hoyISO.value) return ''
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
})

const nombrePaciente = (c) => {
  const p = c?.paciente || {}
  return p.nombre_completo || `${p.nombres || ''} ${p.apellidos || ''}`.trim() || 'Sin nombre'
}

const procedimientosUnicos = (cotizacion) => {
  const items = Array.isArray(cotizacion?.items) ? cotizacion.items : []
  const seen = new Set()

  return items.filter((item) => {
    const key = String(item?.codigo || '').trim().toUpperCase()
    if (!key || seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

const medicosFiltrados = computed(() => {
  const term = filtroMedicoTexto.value.trim().toLowerCase()
  if (!term) return medicos.value.slice(0, 25)
  return medicos.value.filter((m) => String(m?.nombre || '').toLowerCase().includes(term)).slice(0, 25)
})

const entidadesFiltradas = computed(() => {
  const term = filtroEntidadTexto.value.trim().toLowerCase()
  if (!term) return entidades.value.slice(0, 25)
  return entidades.value.filter((e) => String(e?.nombre || '').toLowerCase().includes(term)).slice(0, 25)
})

const onInputMedico = () => {
  filtroMedico.value = ''
}

const onInputEntidad = () => {
  filtroEntidad.value = ''
}

const seleccionarMedico = (medico) => {
  filtroMedico.value = String(medico.id)
  filtroMedicoTexto.value = medico.nombre || ''
  mostrarDropdownMedicos.value = false
}

const seleccionarEntidad = (entidad) => {
  filtroEntidad.value = String(entidad.id)
  filtroEntidadTexto.value = entidad.nombre || ''
  mostrarDropdownEntidades.value = false
}

const cerrarDropdownsSiClickFuera = (event) => {
  const target = event?.target

  if (medicoDropdownRef.value && !medicoDropdownRef.value.contains(target)) {
    mostrarDropdownMedicos.value = false
  }

  if (entidadDropdownRef.value && !entidadDropdownRef.value.contains(target)) {
    mostrarDropdownEntidades.value = false
  }
}

// ── Carga catálogos ────────────────────────────────────────
const cargarCatalogos = async () => {
  loadingCatalogo.value = true
  try {
    const [resCatalogo, resEstados] = await Promise.all([
      useSanctumFetch('/api/catalogos'),
      useSanctumFetch('/api/estados/cotizacion', { method: 'GET' }),
    ])
    medicos.value   = resCatalogo.data.value?.medicos   ?? []
    entidades.value = resCatalogo.data.value?.entidades ?? []
    const estadosRaw = resEstados.data.value ?? []
    estadosDisponibles.value = Array.isArray(estadosRaw)
      ? estadosRaw
        .filter((e) => estadosPermitidosProgramacion.includes(String(e.nombre || '').toUpperCase().trim()))
        .sort((a, b) => a.orden - b.orden)
      : []
  } finally {
    loadingCatalogo.value = false
  }
}

// ── Carga cotizaciones aprobadas ───────────────────────────
const cargar = async (pagina = 1) => {
  loading.value = true
  try {
    const params = new URLSearchParams({ estado_ids: '3,5', page: pagina, per_page: 7 })
    if (filtroCodigo.value.trim())    params.set('codigo',      filtroCodigo.value.trim())
    if (filtroDocumento.value.trim()) params.set('documento',   filtroDocumento.value.trim())
    if (filtroMedico.value)           params.set('medico_id',   filtroMedico.value)
    if (filtroEntidad.value)          params.set('entidad_id',  filtroEntidad.value)

    const { data, error } = await useSanctumFetch(`/api/programacion?${params.toString()}`)

    if (error.value) return

    cotizaciones.value  = data.value?.data         ?? []
    totalRegistros.value = data.value?.total        ?? 0
    paginaActual.value  = data.value?.current_page ?? 1
    totalPaginas.value  = data.value?.last_page     ?? 1
  } finally {
    loading.value = false
  }
}

const limpiarFiltros = () => {
  filtroCodigo.value   = ''
  filtroDocumento.value = ''
  filtroMedico.value   = ''
  filtroEntidad.value  = ''
  filtroMedicoTexto.value = ''
  filtroEntidadTexto.value = ''
  cargar(1)
}

// ── Cambio de estado ────────────────────────────────────────
const abrirModalEstado = (cotizacion) => {
  if (!canChangeEstado.value) return
  cotizacionSeleccionada.value = cotizacion
  nuevoEstadoId.value          = cotizacion.estado_id
  comentarioEstado.value       = ''
  fechaProgramada.value        = cotizacion?.fecha_programada || ''
  horaProgramada.value         = normalizarHora24(cotizacion?.hora_programada || '')
  mostrarModalEstado.value     = true
}

const cerrarModalEstado = () => {
  mostrarModalEstado.value    = false
  cotizacionSeleccionada.value = null
  nuevoEstadoId.value         = null
  comentarioEstado.value      = ''
  fechaProgramada.value       = ''
  horaProgramada.value        = ''
}

const confirmarCambioEstado = async () => {
  if (!cotizacionSeleccionada.value || !nuevoEstadoId.value) return
  const estadoActual = Number(cotizacionSeleccionada.value.estado_id)
  const estadoNuevo = Number(nuevoEstadoId.value)

  const mismaFecha = String(cotizacionSeleccionada.value?.fecha_programada || '') === String(fechaProgramada.value || '')
  const mismaHora = normalizarHora24(cotizacionSeleccionada.value?.hora_programada || '') === normalizarHora24(horaProgramada.value || '')

  if (estadoActual === estadoNuevo && (!esEstadoProgramada.value || (mismaFecha && mismaHora))) {
    cerrarModalEstado()
    return
  }

  const necesitaComentario = requiereComentarioIds.includes(Number(nuevoEstadoId.value))
  const reprogramacionConCambio = estadoActual === 5 && estadoNuevo === 5 && (!mismaFecha || !mismaHora)
  if ((necesitaComentario || reprogramacionConCambio) && !comentarioEstado.value.trim()) return

  if (esEstadoProgramada.value && !fechaProgramada.value) return
  if (esEstadoProgramada.value && !horaProgramada.value) return
  if (esEstadoProgramada.value && !esHora24Valida(horaProgramada.value)) return

  savingEstado.value = true
  try {
    // Cambiar estado
    const { error } = await useSanctumFetch(`/api/programacion/${cotizacionSeleccionada.value.id}/estado`, {
      method: 'PUT',
      body: {
        estado: nuevoEstadoId.value,
        comentario_cambio_estado: comentarioEstado.value.trim() || null,
        fecha_programada: esEstadoProgramada.value ? fechaProgramada.value : null,
        hora_programada: esEstadoProgramada.value ? normalizarHora24(horaProgramada.value) : null,
      },
    })

    if (!error.value) {
      await cargar(paginaActual.value)
    }
  } finally {
    savingEstado.value = false
    cerrarModalEstado()
  }
}

const estadoNombreById = (id) => {
  return estadosDisponibles.value.find(e => e.id === Number(id))?.nombre ?? '–'
}

const necesitaComentario = computed(() =>
  requiereComentarioIds.includes(Number(nuevoEstadoId.value))
)

const esEstadoProgramada = computed(() => {
  const estado = estadosDisponibles.value.find((e) => Number(e.id) === Number(nuevoEstadoId.value))
  return String(estado?.nombre || '').toUpperCase().trim() === 'PROGRAMADA'
})

onMounted(async () => {
  document.addEventListener('click', cerrarDropdownsSiClickFuera)

  await ensureUserPermissions()
  if (!canViewProgramacion.value) {
    await router.replace('/403')
    return
  }
  await Promise.all([cargarCatalogos(), cargar(1)])
})

onBeforeUnmount(() => {
  document.removeEventListener('click', cerrarDropdownsSiClickFuera)
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-5">

    <!-- Encabezado -->
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Programación de cirugías</h1>
      <p class="text-sm text-slate-500 mt-1">Cotizaciones en estado <span class="font-semibold text-emerald-700">APROBADA</span> y <span class="font-semibold text-emerald-700">PROGRAMADA</span>.</p>
    </div>

    <!-- Filtros -->
    <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">N° Cotización</label>
          <input
            v-model="filtroCodigo"
            type="text"
            placeholder="SAI-0000001"
            class="w-full h-9 rounded-lg border border-slate-300 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @keyup.enter="cargar(1)"
          >
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">N° Identificación</label>
          <input
            v-model="filtroDocumento"
            type="text"
            placeholder="Documento del paciente"
            class="w-full h-9 rounded-lg border border-slate-300 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @keyup.enter="cargar(1)"
          >
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Médico</label>
          <div ref="medicoDropdownRef" class="relative" @focusin="mostrarDropdownMedicos = true">
            <input
              v-model="filtroMedicoTexto"
              type="text"
              placeholder="Buscar médico..."
              class="w-full h-9 rounded-lg border border-slate-300 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @input="onInputMedico"
            >
            <div
              v-if="mostrarDropdownMedicos"
              class="absolute z-20 mt-1 w-full max-h-52 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg"
            >
              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                @click="filtroMedico = ''; filtroMedicoTexto = ''; mostrarDropdownMedicos = false"
              >
                Todos los médicos
              </button>
              <button
                v-for="m in medicosFiltrados"
                :key="m.id"
                type="button"
                class="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                @click="seleccionarMedico(m)"
              >
                {{ m.nombre }}
              </button>
              <p v-if="!medicosFiltrados.length" class="px-3 py-2 text-sm text-slate-500">
                Sin coincidencias.
              </p>
            </div>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Entidad</label>
          <div ref="entidadDropdownRef" class="relative" @focusin="mostrarDropdownEntidades = true">
            <input
              v-model="filtroEntidadTexto"
              type="text"
              placeholder="Buscar entidad..."
              class="w-full h-9 rounded-lg border border-slate-300 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @input="onInputEntidad"
            >
            <div
              v-if="mostrarDropdownEntidades"
              class="absolute z-20 mt-1 w-full max-h-52 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg"
            >
              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                @click="filtroEntidad = ''; filtroEntidadTexto = ''; mostrarDropdownEntidades = false"
              >
                Todas las entidades
              </button>
              <button
                v-for="e in entidadesFiltradas"
                :key="e.id"
                type="button"
                class="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                @click="seleccionarEntidad(e)"
              >
                {{ e.nombre }}
              </button>
              <p v-if="!entidadesFiltradas.length" class="px-3 py-2 text-sm text-slate-500">
                Sin coincidencias.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 mt-4">
        <button
          @click="cargar(1)"
          :disabled="loading"
          class="h-9 px-4 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-medium transition-colors disabled:opacity-60"
        >
          Buscar
        </button>
        <button
          @click="limpiarFiltros"
          class="h-9 px-4 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Limpiar
        </button>
        <span class="ml-auto text-sm text-slate-500">
          {{ totalRegistros }} resultado{{ totalRegistros === 1 ? '' : 's' }}
        </span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-16">
      <svg class="w-10" fill="hsl(228,97%,42%)" viewBox="0 0 24 24">
        <circle cx="4" cy="12" r="3">
          <animate id="sp1" begin="0;sp3.end+0.25s" attributeName="cy" calcMode="spline" dur="0.6s" values="12;6;12" keySplines=".33,.66,.66,1;.33,0,.66,.33"/>
        </circle>
        <circle cx="12" cy="12" r="3">
          <animate begin="sp1.begin+0.1s" attributeName="cy" calcMode="spline" dur="0.6s" values="12;6;12" keySplines=".33,.66,.66,1;.33,0,.66,.33"/>
        </circle>
        <circle cx="20" cy="12" r="3">
          <animate id="sp3" begin="sp1.begin+0.2s" attributeName="cy" calcMode="spline" dur="0.6s" values="12;6;12" keySplines=".33,.66,.66,1;.33,0,.66,.33"/>
        </circle>
      </svg>
      <span class="ml-3 text-slate-600 font-medium">Cargando cotizaciones...</span>
    </div>

    <!-- Lista -->
    <div v-else-if="cotizaciones.length" class="grid grid-cols-1 gap-3">
      <article
        v-for="c in cotizaciones"
        :key="c.id"
        :class="[
          'rounded-xl p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow border',
          esCotizacionProgramada(c)
            ? 'bg-emerald-50 border-emerald-300'
            : 'bg-white border-slate-200'
        ]"
      >
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <!-- Info principal -->
          <div class="space-y-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-slate-900 font-semibold">{{ c.codigo }}</p>
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-wide">
                {{ c.estado?.nombre ?? 'Sin estado' }}
              </span>
              <span class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wide">
                {{ c.tipo_gestion ?? '-' }}
              </span>
            </div>
            <p class="text-sm text-slate-500">{{ formatoFecha(c.created_at) }}</p>
            <p class="text-sm text-slate-700">
              Paciente: <span class="font-medium text-slate-900">{{ nombrePaciente(c) }}</span>
            </p>
            <p class="text-sm text-slate-700">
              Identificación: <span class="font-medium text-slate-900">{{ c.paciente?.numero_identificacion ?? 'N/A' }}</span>
            </p>
            <p v-if="c.medico" class="text-sm text-slate-700">
              Médico: <span class="font-medium text-slate-900">{{ c.medico?.nombre }}</span>
            </p>
            <p v-if="c.entidad" class="text-sm text-slate-700">
              Entidad: <span class="font-medium text-slate-900">{{ c.entidad?.nombre }}</span>
            </p>
            <p v-if="c.fecha_programada || c.hora_programada" class="text-sm text-slate-700">
              Fecha/Hora programada:
              <span class="font-medium text-slate-900">{{ formatoFechaHoraProgramada(c.fecha_programada, c.hora_programada) }}</span>
            </p>
          </div>

          <!-- Acciones -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <NuxtLink
              v-if="canViewDetalle"
              :to="`/cotizacion/${c.id}`"
              class="inline-flex items-center h-9 px-3 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Ver detalle
            </NuxtLink>
            <button
              v-if="canChangeEstado"
              @click="abrirModalEstado(c)"
              class="inline-flex items-center h-9 px-3 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-medium transition-colors"
            >
              Cambiar estado
            </button>
          </div>
        </div>

        <div class="mt-3 border-t border-slate-100 pt-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Procedimientos</p>
          <div v-if="procedimientosUnicos(c).length" class="flex flex-wrap gap-2">
            <span
              v-for="proc in procedimientosUnicos(c)"
              :key="proc.id"
              class="px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold"
            >
              {{ proc.codigo }} - {{ proc.nombre }}
            </span>
          </div>
          <p v-else class="text-sm text-slate-500">Sin procedimientos asociados.</p>
        </div>
      </article>
    </div>

    <!-- Sin resultados -->
    <div v-else class="flex justify-center items-center py-12">
      <div class="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" class="mx-auto text-slate-400">
          <path fill="currentColor" d="M9 11H7v2h2zm4 0h-2v2h2zm4 0h-2v2h2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m0 16H5V9h14z"/>
        </svg>
        <p class="mt-3 text-slate-700 font-medium">No hay cotizaciones aprobadas pendientes de programar.</p>
      </div>
    </div>

    <!-- Paginación -->
    <div v-if="totalPaginas > 1 && !loading" class="flex justify-center gap-2 pt-2">
      <button
        v-for="p in totalPaginas"
        :key="p"
        @click="cargar(p)"
        :class="[
          'h-9 w-9 rounded-lg text-sm font-medium transition-colors',
          p === paginaActual
            ? 'bg-indigo-700 text-white'
            : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
        ]"
      >
        {{ p }}
      </button>
    </div>
  </div>

  <!-- ── Modal cambio de estado ────────────────────────────── -->
  <div
    v-if="mostrarModalEstado"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
  >
    <div class="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md border border-slate-200 relative">
      <button
        @click="cerrarModalEstado"
        class="absolute top-3 right-3 text-slate-400 hover:text-slate-700 text-xl leading-none"
      >✕</button>

      <h3 class="text-lg font-bold text-slate-900 mb-1">Cambiar estado</h3>
      <p class="text-sm text-slate-500 mb-4">
        Cotización <span class="font-semibold text-slate-700">{{ cotizacionSeleccionada?.codigo }}</span>
      </p>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Nuevo estado</label>
          <select
            v-model="nuevoEstadoId"
            :disabled="Number(cotizacionSeleccionada?.estado_id) === 5"
            class="w-full h-10 rounded-lg border border-slate-300 text-sm px-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option v-for="e in estadosDisponibles" :key="e.id" :value="e.id">{{ e.nombre }}</option>
          </select>
          <p v-if="Number(cotizacionSeleccionada?.estado_id) === 5" class="text-xs text-amber-700 mt-1">
            Esta cotización ya está PROGRAMADA. Desde este módulo solo puedes ajustar fecha y hora con comentario.
          </p>
        </div>

        <div v-if="esEstadoProgramada">
          <label class="block text-sm font-medium text-slate-700 mb-1">
            Fecha programada <span class="text-red-600">* obligatoria</span>
          </label>
          <input
            v-model="fechaProgramada"
            type="date"
            :min="hoyISO"
            class="w-full h-10 rounded-lg border border-slate-300 text-sm px-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
          <p v-if="!fechaProgramada" class="text-xs text-red-600 mt-1">
            Debes seleccionar la fecha en que quedó programada la cirugía.
          </p>

          <label class="block text-sm font-medium text-slate-700 mt-3 mb-1">
            Hora programada <span class="text-red-600">* obligatoria</span>
          </label>
          <input
            v-model="horaProgramada"
            type="text"
            inputmode="numeric"
            maxlength="5"
            placeholder="HH:mm"
            class="w-full h-10 rounded-lg border border-slate-300 text-sm px-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @input="horaProgramada = normalizarHora24(($event.target.value || '').replace(/[^0-9:]/g, ''))"
          >
          <p v-if="!horaProgramada" class="text-xs text-red-600 mt-1">
            Debes seleccionar la hora en que se ejecutará el procedimiento.
          </p>
          <p v-else-if="!esHora24Valida(horaProgramada)" class="text-xs text-red-600 mt-1">
            Usa formato 24 horas: HH:mm (ejemplo 14:30).
          </p>
          <p v-else-if="fechaProgramada === hoyISO && horaProgramada < horaMinima" class="text-xs text-red-600 mt-1">
            Si programas para hoy, la hora no puede ser inferior a la actual.
          </p>
        </div>

        <!-- Comentario: obligatorio para ANULADA/RECHAZADA, opcional para otros -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">
            Comentario
            <span v-if="necesitaComentario || (Number(cotizacionSeleccionada?.estado_id) === 5 && Number(nuevoEstadoId) === 5 && (String(cotizacionSeleccionada?.fecha_programada || '') !== String(fechaProgramada || '') || normalizarHora24(cotizacionSeleccionada?.hora_programada || '') !== normalizarHora24(horaProgramada || '')) )" class="text-red-600 ml-1">* obligatorio</span>
            <span v-else class="text-slate-400 ml-1">(opcional)</span>
          </label>
          <textarea
            v-model="comentarioEstado"
            rows="3"
            placeholder="Escribe un comentario..."
            class="w-full rounded-lg border border-slate-300 text-sm px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p v-if="necesitaComentario && !comentarioEstado.trim()" class="text-xs text-red-600 mt-1">
            Este estado requiere un comentario obligatorio.
          </p>
          <p v-else-if="Number(cotizacionSeleccionada?.estado_id) === 5 && Number(nuevoEstadoId) === 5 && (String(cotizacionSeleccionada?.fecha_programada || '') !== String(fechaProgramada || '') || normalizarHora24(cotizacionSeleccionada?.hora_programada || '') !== normalizarHora24(horaProgramada || '')) && !comentarioEstado.trim()" class="text-xs text-red-600 mt-1">
            Debes explicar por qué cambias la fecha u hora programada.
          </p>
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <button
          @click="cerrarModalEstado"
          class="h-9 px-4 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          @click="confirmarCambioEstado"
          :disabled="savingEstado || ((necesitaComentario || (Number(cotizacionSeleccionada?.estado_id) === 5 && Number(nuevoEstadoId) === 5 && (String(cotizacionSeleccionada?.fecha_programada || '') !== String(fechaProgramada || '') || normalizarHora24(cotizacionSeleccionada?.hora_programada || '') !== normalizarHora24(horaProgramada || '')))) && !comentarioEstado.trim()) || (esEstadoProgramada && (!fechaProgramada || !horaProgramada || !esHora24Valida(horaProgramada) || (fechaProgramada === hoyISO && horaProgramada < horaMinima)))"
          class="h-9 px-4 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          <template v-if="savingEstado">
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Guardando...
          </template>
          <template v-else>Confirmar</template>
        </button>
      </div>
    </div>
  </div>
</template>
