<script setup lang="ts">
definePageMeta({
  middleware: ['sanctum:auth'],
})

type ColumnaKey =
  | 'tipo_gestion'
  | 'codigo_cotizacion'
  | 'fecha_atencion'
  | 'fecha_elaboracion'
  | 'fecha_codificacion'
  | 'fecha_vencimiento'
  | 'codigo_codificacion'
  | 'tipo_consultorio'
  | 'medico'
  | 'entidad'
  | 'nombre_paciente'
  | 'tipo_identificacion_paciente'
  | 'numero_identificacion_paciente'
  | 'cups_procedimientos'
  | 'lateralidad'
  | 'valor_coc_dc_derecho_clinico'
  | 'asesor'
  | 'estado_gestion'
  | 'observacion_gestion'

interface ColumnaDef {
  key: ColumnaKey
  label: string
}

interface OpcionCatalogo {
  id: number
  nombre?: string
  name?: string
}

interface ReporteItem {
  id: number
  tipo_gestion: string
  codigo_cotizacion: string
  fecha_atencion: string | null
  fecha_elaboracion: string | null
  fecha_codificacion: string | null
  fecha_vencimiento: string | null
  codigo_codificacion: string | null
  tipo_consultorio: string
  medico: string | null
  entidad: string | null
  nombre_paciente: string | null
  tipo_identificacion_paciente: string | null
  numero_identificacion_paciente: string | null
  cups_procedimientos: string | null
  lateralidad: string | null
  valor_coc_dc_derecho_clinico: string
  asesor: string | null
  estado_gestion: string | null
  observacion_gestion: string | null
}

interface ReporteResponse {
  data: ReporteItem[]
  current_page: number
  per_page: number
  total: number
  last_page: number
}

const filtros = reactive({
  tipo_gestion: '',
  codigo: '',
  medico_id: '',
  entidad_id: '',
  asesor_id: '',
  estado_id: '',
  fecha_atencion_inicio: '',
  fecha_atencion_fin: '',
  fecha_elaboracion_inicio: '',
  fecha_elaboracion_fin: '',
})

const tiposGestion = [
  { value: '', label: 'Todos' },
  { value: 'cotización', label: 'Cotización' },
  { value: 'codificación', label: 'Codificación' },
  { value: 'información', label: 'Información' },
]

const columnas: ColumnaDef[] = [
  { key: 'tipo_gestion', label: 'Tipo gestión' },
  { key: 'codigo_cotizacion', label: 'Código cotización' },
  { key: 'fecha_atencion', label: 'Fecha atención' },
  { key: 'fecha_elaboracion', label: 'Fecha elaboración' },
  { key: 'fecha_codificacion', label: 'Fecha codificación' },
  { key: 'fecha_vencimiento', label: 'Fecha vencimiento' },
  { key: 'codigo_codificacion', label: 'Código codificación' },
  { key: 'tipo_consultorio', label: 'Tipo consultorio' },
  { key: 'medico', label: 'Médico' },
  { key: 'entidad', label: 'Entidad' },
  { key: 'nombre_paciente', label: 'Paciente' },
  { key: 'tipo_identificacion_paciente', label: 'Tipo ID' },
  { key: 'numero_identificacion_paciente', label: 'No. ID' },
  { key: 'cups_procedimientos', label: 'CUPS' },
  { key: 'lateralidad', label: 'Lateralidad' },
  { key: 'valor_coc_dc_derecho_clinico', label: 'Valor COC (DP)' },
  { key: 'asesor', label: 'Asesor' },
  { key: 'estado_gestion', label: 'Estado gestión' },
  { key: 'observacion_gestion', label: 'Observación' },
]

const columnasVisibles = ref<ColumnaKey[]>([
  'tipo_gestion',
  'codigo_cotizacion',
  'fecha_atencion',
  'medico',
  'entidad',
  'nombre_paciente',
  'cups_procedimientos',
  'lateralidad',
  'valor_coc_dc_derecho_clinico',
  'estado_gestion',
])

const resultados = ref<ReporteItem[]>([])
const cargando = ref(false)
const descargando = ref(false)
const errorMsg = ref('')

const medicos = ref<OpcionCatalogo[]>([])
const entidades = ref<OpcionCatalogo[]>([])
const asesores = ref<OpcionCatalogo[]>([])
const estados = ref<OpcionCatalogo[]>([])

const pagina = ref(1)
const porPagina = ref(20)
const total = ref(0)
const { user } = useSanctumAuth()

const { hasPermission, ensureUserPermissions } = useUserPermissions()

const puedeExportar = computed(() => hasPermission('reportes.cotizaciones.exportar'))
const totalPaginas = computed(() => Math.max(1, Math.ceil(total.value / porPagina.value)))
const columnasTabla = computed(() => columnas.filter((c) => columnasVisibles.value.includes(c.key)))

const columnasPorDefecto: ColumnaKey[] = [
  'tipo_gestion',
  'codigo_cotizacion',
  'fecha_atencion',
  'medico',
  'entidad',
  'nombre_paciente',
  'cups_procedimientos',
  'lateralidad',
  'valor_coc_dc_derecho_clinico',
  'estado_gestion',
]

const storageKeyColumnas = computed(() => {
  const userId = (user.value as { id?: number } | null)?.id ?? 'anon'
  return `reporte-cotizaciones-columnas-${userId}`
})

const construirParams = (conPaginacion = true) => {
  const params: Record<string, string | number> = {
    ...(conPaginacion ? { page: pagina.value, per_page: porPagina.value } : {}),
  }

  if (filtros.tipo_gestion) params.tipo_gestion = filtros.tipo_gestion
  if (filtros.codigo) params.codigo = filtros.codigo.trim()
  if (filtros.medico_id) params.medico_id = filtros.medico_id
  if (filtros.entidad_id) params.entidad_id = filtros.entidad_id
  if (filtros.asesor_id) params.asesor_id = filtros.asesor_id
  if (filtros.estado_id) params.estado_id = filtros.estado_id
  if (filtros.fecha_atencion_inicio) params.fecha_atencion_inicio = filtros.fecha_atencion_inicio
  if (filtros.fecha_atencion_fin) params.fecha_atencion_fin = filtros.fecha_atencion_fin
  if (filtros.fecha_elaboracion_inicio) params.fecha_elaboracion_inicio = filtros.fecha_elaboracion_inicio
  if (filtros.fecha_elaboracion_fin) params.fecha_elaboracion_fin = filtros.fecha_elaboracion_fin

  return params
}

const cargarPresetColumnas = () => {
  if (import.meta.server) return

  const raw = localStorage.getItem(storageKeyColumnas.value)
  if (!raw) return

  try {
    const parsed = JSON.parse(raw) as ColumnaKey[]
    const validas = parsed.filter((k) => columnas.some((c) => c.key === k))

    if (validas.length > 0) {
      columnasVisibles.value = validas
    }
  } catch (error) {
    console.error('No fue posible leer preset de columnas:', error)
  }
}

const guardarPresetColumnas = () => {
  if (import.meta.server) return
  localStorage.setItem(storageKeyColumnas.value, JSON.stringify(columnasVisibles.value))
}

watch(columnasVisibles, (actual) => {
  if (!actual.length) {
    columnasVisibles.value = [...columnasPorDefecto]
    errorMsg.value = 'Debe dejar al menos una columna visible. Se restauró configuración por defecto.'
    return
  }

  guardarPresetColumnas()
}, { deep: true })

const cargarCatalogos = async () => {
  const { data, error } = await useSanctumFetch('/api/catalogos', {
    method: 'GET',
  })

  if (error.value) {
    errorMsg.value = 'No fue posible cargar catálogos para filtros.'
    return
  }

  const payload = data.value?.data?.value || data.value
  medicos.value = payload?.medicos || []
  entidades.value = payload?.entidades || []
  asesores.value = payload?.asesores || []
  estados.value = payload?.estados || []
}

const buscar = async () => {
  cargando.value = true
  errorMsg.value = ''

  const { data, error } = await useSanctumFetch('/api/reportes/cotizaciones', {
    method: 'GET',
    query: construirParams(),
  })

  if (error.value) {
    errorMsg.value = 'No fue posible consultar el reporte con los filtros aplicados.'
    resultados.value = []
    total.value = 0
    cargando.value = false
    return
  }

  const payload = (data.value as ReporteResponse) || ({} as ReporteResponse)
  resultados.value = payload.data || []
  total.value = Number(payload.total || 0)
  pagina.value = Number(payload.current_page || 1)
  porPagina.value = Number(payload.per_page || 20)

  cargando.value = false
}

const limpiarFiltros = async () => {
  filtros.tipo_gestion = ''
  filtros.codigo = ''
  filtros.medico_id = ''
  filtros.entidad_id = ''
  filtros.asesor_id = ''
  filtros.estado_id = ''
  filtros.fecha_atencion_inicio = ''
  filtros.fecha_atencion_fin = ''
  filtros.fecha_elaboracion_inicio = ''
  filtros.fecha_elaboracion_fin = ''
  pagina.value = 1
  await buscar()
}

const irPagina = async (nuevaPagina: number) => {
  if (nuevaPagina < 1 || nuevaPagina > totalPaginas.value) return
  pagina.value = nuevaPagina
  await buscar()
}

const descargarExcel = async () => {
  if (!puedeExportar.value) return

  descargando.value = true
  errorMsg.value = ''

  try {
    const { data, error } = await useSanctumFetch('/api/reportes/cotizaciones/exportar-datos', {
      method: 'GET',
      query: {
        ...construirParams(false),
        limit: 20000,
      },
    })

    if (error.value) {
      throw new Error('No fue posible obtener los datos para exportación.')
    }

    const payload = data.value as { data?: ReporteItem[] }
    const registros = payload?.data || []

    const filas = registros.map((item) => {
      const fila: Record<string, string> = {}

      columnas.forEach((columna) => {
        const valor = item[columna.key]
        fila[columna.label] = valor === null || valor === undefined || valor === '' ? 'N/A' : String(valor)
      })

      return fila
    })

    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Reporte Cotizaciones')

    const headers = columnas.map((c) => c.label)
    worksheet.addRow(headers)

    filas.forEach((fila) => {
      worksheet.addRow(headers.map((h) => fila[h] ?? 'N/A'))
    })

    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }

    worksheet.views = [{ state: 'frozen', ySplit: 1 }]

    headers.forEach((header, index) => {
      const values = [header, ...filas.map((f) => f[header] ?? '')]
      const maxLen = Math.min(60, Math.max(...values.map((v) => String(v).length), 12))
      worksheet.getColumn(index + 1).width = maxLen + 2
      worksheet.getColumn(index + 1).alignment = { vertical: 'top', horizontal: 'left', wrapText: true }
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    const fileName = `reporte_cotizaciones_${new Date().toISOString().slice(0, 10)}.xlsx`

    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error(error)
    errorMsg.value = 'No fue posible descargar el archivo del reporte.'
  } finally {
    descargando.value = false
  }
}

onMounted(async () => {
  await ensureUserPermissions()

  if (!hasPermission('reportes.cotizaciones.ver')) {
    await navigateTo('/403')
    return
  }

  cargarPresetColumnas()
  await cargarCatalogos()
  await buscar()
})
</script>

<template>
  <div class="max-w-[1500px] mx-auto px-4 md:px-6 py-6 space-y-5">
    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5 space-y-4">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 class="text-xl md:text-2xl font-semibold text-slate-900">Reportes / Cotizaciones</h1>
        <div class="flex items-center gap-2">
          <details class="relative">
            <summary class="h-10 px-4 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center">
              Columnas visibles ({{ columnasVisibles.length }})
            </summary>
            <div class="absolute right-0 z-20 mt-2 w-80 max-h-80 overflow-auto rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <label v-for="col in columnas" :key="col.key" class="flex items-center gap-2 py-1 text-sm text-slate-700">
                <input
                  v-model="columnasVisibles"
                  type="checkbox"
                  :value="col.key"
                  class="rounded border-slate-300"
                />
                <span>{{ col.label }}</span>
              </label>
            </div>
          </details>

          <button
            class="h-10 px-4 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            @click="limpiarFiltros"
          >
            Limpiar
          </button>
          <button
            class="h-10 px-4 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white disabled:opacity-60"
            :disabled="descargando || !puedeExportar"
            @click="descargarExcel"
          >
            {{ descargando ? 'Descargando...' : 'Descargar Excel (XLSX)' }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Tipo de gestión</label>
          <select v-model="filtros.tipo_gestion" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white">
            <option v-for="tipo in tiposGestion" :key="tipo.value" :value="tipo.value">{{ tipo.label }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Código de cotización</label>
          <input
            v-model="filtros.codigo"
            type="text"
            placeholder="Ej: SAI-0001234"
            class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Médico</label>
          <select v-model="filtros.medico_id" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white">
            <option value="">Todos</option>
            <option v-for="m in medicos" :key="m.id" :value="m.id">{{ m.nombre || m.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Entidad</label>
          <select v-model="filtros.entidad_id" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white">
            <option value="">Todas</option>
            <option v-for="e in entidades" :key="e.id" :value="e.id">{{ e.nombre || e.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Asesor</label>
          <select v-model="filtros.asesor_id" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white">
            <option value="">Todos</option>
            <option v-for="a in asesores" :key="a.id" :value="a.id">{{ a.nombre || a.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Estado de la gestión</label>
          <select v-model="filtros.estado_id" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white">
            <option value="">Todos</option>
            <option v-for="estado in estados" :key="estado.id" :value="estado.id">{{ estado.nombre || estado.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Fecha atención desde</label>
          <input v-model="filtros.fecha_atencion_inicio" type="date" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white" />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Fecha atención hasta</label>
          <input v-model="filtros.fecha_atencion_fin" type="date" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white" />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Fecha elaboración desde</label>
          <input v-model="filtros.fecha_elaboracion_inicio" type="date" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white" />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Fecha elaboración hasta</label>
          <input v-model="filtros.fecha_elaboracion_fin" type="date" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white" />
        </div>
      </div>

      <div class="flex justify-end">
        <button
          class="h-10 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-60"
          :disabled="cargando"
          @click="pagina = 1; buscar()"
        >
          {{ cargando ? 'Consultando...' : 'Aplicar filtros' }}
        </button>
      </div>

      <p v-if="errorMsg" class="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
        {{ errorMsg }}
      </p>
    </section>

    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
      <div class="flex items-center justify-between mb-3">
        <p class="text-sm text-slate-600">{{ total }} registro{{ total === 1 ? '' : 's' }}</p>
        <p class="text-sm text-slate-500">Página {{ pagina }} de {{ totalPaginas }}</p>
      </div>

      <div v-if="cargando" class="py-8 text-center text-slate-500">Cargando reporte...</div>

      <div v-else-if="!resultados.length" class="py-8 text-center text-slate-500">
        No hay resultados con los filtros actuales.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full border border-slate-200 rounded-lg overflow-hidden">
          <thead>
            <tr class="bg-slate-50">
              <th
                v-for="col in columnasTabla"
                :key="`head-${col.key}`"
                class="border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase"
              >
                {{ col.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in resultados" :key="item.id">
              <td
                v-for="col in columnasTabla"
                :key="`${item.id}-${col.key}`"
                class="border border-slate-200 px-3 py-2 text-sm text-slate-700"
              >
                {{ item[col.key] || 'N/A' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between mt-4">
        <button
          class="h-9 px-4 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-50"
          :disabled="pagina <= 1 || cargando"
          @click="irPagina(pagina - 1)"
        >
          Anterior
        </button>

        <span class="text-sm text-slate-600">Página {{ pagina }} de {{ totalPaginas }}</span>

        <button
          class="h-9 px-4 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-50"
          :disabled="pagina >= totalPaginas || cargando"
          @click="irPagina(pagina + 1)"
        >
          Siguiente
        </button>
      </div>
    </section>
  </div>
</template>
