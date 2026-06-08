<script setup lang="ts">
import { push } from 'notivue'

definePageMeta({
  middleware: ['sanctum:auth'],
})

const router = useRouter()
const { hasRole, ensureUserPermissions } = useUserPermissions()
const { status, history, historyMeta, loading, historyLoading, runningAction, fetchStatus, fetchHistory, runPipeline, abortSync } = useSyncManagement()

const mainPipelines = [
  {
    key: 'all',
    title: 'Sincronización completa',
    description: 'Ejecuta Informix base, procedimientos, insumos, lentes y pacientes en una sola corrida.',
  },
  {
    key: 'sync_informix',
    title: 'Sincronización base Informix',
    description: 'Sincroniza médicos, entidades, consultorios y pacientes.',
  },
  {
    key: 'procedimientos',
    title: 'Actualizar procedimientos',
    description: 'Importa procedimientos desde Informix.',
  },
  {
    key: 'insumos',
    title: 'Actualizar insumos',
    description: 'Importa insumos desde Informix.',
  },
  {
    key: 'lentes',
    title: 'Actualizar lentes',
    description: 'Importa lentes desde Informix.',
  },
  {
    key: 'pacientes_informix',
    title: 'Sincronizar pacientes desde Informix',
    description: 'Importa o actualiza todos los pacientes por número de identificación en lotes grandes.',
  },
] as const

const maintenancePipelines = [
  {
    key: 'medicos_identificacion',
    title: 'Actualizar identificación de médicos',
    description: 'Completa o corrige la identificación de médicos locales usando coincidencia por nombre en Informix.',
  },
  {
    key: 'consultorios_codigos',
    title: 'Actualizar códigos de consultorios',
    description: 'Completa o corrige códigos de consultorios locales usando coincidencia por nombre con Informix.',
  },
  {
    key: 'crear_medicos',
    title: 'Crear médicos faltantes',
    description: 'Crea en la base local los médicos que existen en Informix y aún no están registrados.',
  },
  {
    key: 'recursos_consultorios',
    title: 'Crear recursos como consultorios',
    description: 'Registra recursos de Informix dentro de consultorios cuando todavía no existen localmente.',
  },
  {
    key: 'pacientes_nuevos_informix',
    title: 'Insertar pacientes nuevos desde Informix',
    description: 'Inserta únicamente los pacientes que existen en Informix y aún no están en la base local. No modifica registros existentes.',
  },
  {
    key: 'pacientes_existentes_informix',
    title: 'Actualizar pacientes existentes desde Informix',
    description: 'Actualiza nombres, apellidos, tipo de identificación, correo y teléfono de pacientes locales que ya existan por número de identificación. No inserta pacientes nuevos.',
  },
  {
    key: 'entidades_update_or_create',
    title: 'Actualizar o crear entidades',
    description: 'Sincroniza las entidades desde Informix, actualizando o creando según corresponda en la base local.',
  },
  {
    key: 'codigos_laser_procedimientos',
    title: 'Importar códigos láser a procedimientos',
    description: 'Trae códigos láser desde Informix y los inserta/actualiza en la tabla de procedimientos local.',
  },
] as const

const pipelines = [...mainPipelines, ...maintenancePipelines] as const

// ── Filtros historial ──────────────────────────────────────
const filterStatus   = ref('')
const filterPipeline = ref('')
const filterDateFrom = ref('')
const filterDateTo   = ref('')
const ocultarResultadoEstado = ref(false)
const ocultarResultadoPasos = ref(false)
const historyOpenIds = ref<Set<number>>(new Set())

const activeFilters = computed(() => ({
  status:    filterStatus.value   || undefined,
  pipeline:  filterPipeline.value || undefined,
  date_from: filterDateFrom.value || undefined,
  date_to:   filterDateTo.value   || undefined,
}))

const applyFilters = () => fetchHistory({ ...activeFilters.value, page: 1 })

const clearFilters = () => {
  filterStatus.value   = ''
  filterPipeline.value = ''
  filterDateFrom.value = ''
  filterDateTo.value   = ''
  fetchHistory()
}

const goToPage = (page: number) => fetchHistory({ ...activeFilters.value, page })

// ── Permisos ───────────────────────────────────────────────
const canRun = computed(() => hasRole('superadmin') || hasRole('Superadmin'))

// ── Formateo ───────────────────────────────────────────────
const formatDate = (value: string | null) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('es-CO')
}

const formatDuration = (seconds: number | null) => {
  if (seconds === null || Number.isNaN(seconds)) return '-'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

// ── Acciones ───────────────────────────────────────────────
const updateState = async () => {
  await Promise.all([fetchStatus(), fetchHistory({ ...activeFilters.value })])
  ocultarResultadoEstado.value = false
  ocultarResultadoPasos.value = false
}

const limpiarResultadoEstado = () => {
  ocultarResultadoEstado.value = true
}

const limpiarResultadoPasos = () => {
  ocultarResultadoPasos.value = true
}

const toggleHistory = (id: number) => {
  const next = new Set(historyOpenIds.value)
  next.has(id) ? next.delete(id) : next.add(id)
  historyOpenIds.value = next
}

const isHistoryOpen = (id: number) => historyOpenIds.value.has(id)

const ejecutar = async (pipeline: typeof pipelines[number]['key']) => {
  const response = await runPipeline(pipeline)

  if (!response.ok) {
    push.error({ title: 'Sincronización', message: response.message })
    return
  }

  push.success({ title: 'Sincronización', message: 'La sincronización inició correctamente.' })
  ocultarResultadoEstado.value = false
  ocultarResultadoPasos.value = false
  await updateState()
}

const abortar = async () => {
  const response = await abortSync()

  if (!response.ok) {
    push.error({ title: 'Abortar proceso', message: response.message })
    return
  }

  push.warning({ title: 'Proceso abortado', message: response.message })
  await updateState()
}

onMounted(async () => {
  await ensureUserPermissions()

  if (!canRun.value) {
    router.replace('/403')
    return
  }

  await updateState()
})
</script>

<template>
  <section class="space-y-5">
    <div class="bg-white border border-slate-200 rounded-2xl p-6">
      <h1 class="text-2xl font-semibold text-slate-900">Sincronización de datos</h1>
      <p class="text-sm text-slate-600 mt-2">
        Módulo exclusivo para superadmin. Ejecuta importaciones desde Informix sin intervenir la experiencia del usuario final.
      </p>
    </div>

    <!-- Estado actual -->
    <div class="bg-white border border-slate-200 rounded-2xl p-6">
      <div class="flex items-start justify-between gap-4">
        <h2 class="text-lg font-semibold text-slate-900">Estado actual</h2>
        <div class="flex flex-wrap justify-end gap-2">
          <button
            class="h-9 px-4 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="loading || (!status.message && !status.last_error) || ocultarResultadoEstado"
            @click="limpiarResultadoEstado"
          >
            Borrar resultado
          </button>
          <button
            v-if="status.running"
            class="h-9 px-4 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="runningAction"
            @click="abortar"
          >
            Forzar detención
          </button>
        </div>
      </div>
      <div v-if="loading" class="text-slate-500 mt-3">Consultando estado...</div>
      <div v-else class="mt-3 space-y-2 text-sm text-slate-700">
        <p>
          <span class="font-semibold">En ejecución:</span>
          <span
            class="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
            :class="status.running ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'"
          >
            {{ status.running ? 'Sí' : 'No' }}
          </span>
        </p>
        <p><span class="font-semibold">Proceso:</span> {{ status.pipeline || '-' }}</p>
        <p><span class="font-semibold">Inicio:</span> {{ formatDate(status.started_at) }}</p>
        <p><span class="font-semibold">Fin:</span> {{ formatDate(status.finished_at) }}</p>
        <p><span class="font-semibold">Paso actual:</span> {{ status.progress.current_step || '-' }}</p>
        <p><span class="font-semibold">Avance:</span> {{ status.progress.percent }}%</p>
        <div v-if="!ocultarResultadoEstado && (status.message || status.last_error)" class="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p v-if="status.message" class="text-slate-700"><span class="font-semibold">Resultado:</span> {{ status.message }}</p>
          <p v-if="status.last_error" class="text-red-600 mt-1"><span class="font-semibold">Error:</span> {{ status.last_error }}</p>
        </div>
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-2xl p-6">
      <h2 class="text-lg font-semibold text-slate-900">Sincronizaciones principales</h2>
      <p class="text-sm text-slate-600 mt-1 mb-4">
        Procesos operativos frecuentes para refrescar información base y catálogos del sistema.
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="item in mainPipelines"
          :key="item.key"
          class="bg-white border border-slate-200 rounded-2xl p-5"
        >
          <h3 class="text-base font-semibold text-slate-900">{{ item.title }}</h3>
          <p class="text-sm text-slate-600 mt-2">{{ item.description }}</p>
          <button
            class="mt-4 h-10 px-4 rounded-lg bg-[#162983] text-white disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="status.running || runningAction"
            @click="ejecutar(item.key)"
          >
            Ejecutar
          </button>
        </div>
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-2xl p-6">
      <h2 class="text-lg font-semibold text-slate-900">Rutinas auxiliares Informix</h2>
      <p class="text-sm text-slate-600 mt-1 mb-4">
        Tareas independientes que antes vivían dentro del seeder. Úsalas para mantenimiento o corrección puntual de datos.
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="item in maintenancePipelines"
          :key="item.key"
          class="bg-white border border-slate-200 rounded-2xl p-5"
        >
          <h3 class="text-base font-semibold text-slate-900">{{ item.title }}</h3>
          <p class="text-sm text-slate-600 mt-2">{{ item.description }}</p>
          <button
            class="mt-4 h-10 px-4 rounded-lg bg-slate-800 text-white disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="status.running || runningAction"
            @click="ejecutar(item.key)"
          >
            Ejecutar
          </button>
        </div>
      </div>
    </div>

    <!-- Detalle de pasos -->
    <div class="bg-white border border-slate-200 rounded-2xl p-6">
      <div class="flex items-center justify-between gap-3 mb-3">
        <h2 class="text-lg font-semibold text-slate-900">Detalle de pasos</h2>
        <div class="flex flex-wrap justify-end gap-2">
          <button class="h-9 px-3 rounded-lg border border-slate-300 text-slate-700" @click="updateState">
            Actualizar estado
          </button>
          <button
            class="h-9 px-3 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="ocultarResultadoPasos || !status.steps.some(step => step.output)"
            @click="limpiarResultadoPasos"
          >
            Borrar resultado
          </button>
        </div>
      </div>
      <p v-if="status.steps.length === 0" class="text-sm text-slate-500">Aún no se ha ejecutado ningún proceso.</p>
      <ul v-else class="space-y-2 text-sm text-slate-700">
        <li v-for="step in status.steps" :key="step.key" class="bg-slate-50 rounded-lg p-3">
          <p class="font-semibold">{{ step.label }} - {{ step.status }}</p>
          <p v-if="step.output && !ocultarResultadoPasos" class="text-slate-600 mt-1 whitespace-pre-wrap">{{ step.output }}</p>
        </li>
      </ul>
    </div>

    <!-- Historial -->
    <div class="bg-white border border-slate-200 rounded-2xl p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-slate-900">Historial de ejecuciones</h2>
        <button class="h-9 px-3 rounded-lg border border-slate-300 text-slate-700" @click="applyFilters">
          Actualizar historial
        </button>
      </div>

      <!-- Filtros -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Estado</label>
          <select v-model="filterStatus" class="w-full h-9 rounded-lg border border-slate-300 text-sm px-2">
            <option value="">Todos</option>
            <option value="running">En ejecución</option>
            <option value="success">Exitoso</option>
            <option value="failed">Fallido</option>
            <option value="aborted">Abortado</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Pipeline</label>
          <select v-model="filterPipeline" class="w-full h-9 rounded-lg border border-slate-300 text-sm px-2">
            <option value="">Todos</option>
            <option value="all">Completa</option>
            <option value="sync_informix">Informix base</option>
            <option value="procedimientos">Procedimientos</option>
            <option value="insumos">Insumos</option>
            <option value="lentes">Lentes</option>
            <option value="medicos_identificacion">Identificación médicos</option>
            <option value="consultorios_codigos">Códigos consultorios</option>
            <option value="crear_medicos">Crear médicos</option>
            <option value="recursos_consultorios">Recursos a consultorios</option>
            <option value="pacientes_informix">Pacientes Informix (sync completa)</option>
            <option value="pacientes_nuevos_informix">Pacientes nuevos Informix</option>
            <option value="pacientes_existentes_informix">Pacientes existentes Informix</option>
            <option value="codigos_laser_procedimientos">Códigos láser a procedimientos</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Desde</label>
          <input
            v-model="filterDateFrom"
            type="date"
            class="w-full h-9 rounded-lg border border-slate-300 text-sm px-2"
          >
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Hasta</label>
          <input
            v-model="filterDateTo"
            type="date"
            class="w-full h-9 rounded-lg border border-slate-300 text-sm px-2"
          >
        </div>
      </div>
      <div class="flex gap-2 mb-4">
        <button
          class="h-9 px-4 rounded-lg bg-[#162983] text-white text-sm"
          @click="applyFilters"
        >
          Filtrar
        </button>
        <button
          class="h-9 px-4 rounded-lg border border-slate-300 text-slate-700 text-sm"
          @click="clearFilters"
        >
          Limpiar
        </button>
      </div>

      <p v-if="historyLoading" class="text-sm text-slate-500">Cargando historial...</p>
      <p v-else-if="history.length === 0" class="text-sm text-slate-500">No hay ejecuciones registradas para los filtros aplicados.</p>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full border border-slate-200 text-sm">
          <thead>
            <tr class="bg-slate-50 text-slate-700">
              <th class="border border-slate-200 p-2 text-left">Fecha inicio</th>
              <th class="border border-slate-200 p-2 text-left">Pipeline</th>
              <th class="border border-slate-200 p-2 text-left">Estado</th>
              <th class="border border-slate-200 p-2 text-left">Ejecutado por</th>
              <th class="border border-slate-200 p-2 text-left">Duración</th>
              <th class="border border-slate-200 p-2 text-left">Detalle</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="item in history" :key="item.id">
              <tr class="align-top cursor-pointer hover:bg-slate-50" @click="toggleHistory(item.id)">
                <td class="border border-slate-200 p-2">
                  <span class="mr-2 text-slate-500">{{ isHistoryOpen(item.id) ? '▼' : '▶' }}</span>
                  {{ formatDate(item.started_at) }}
                </td>
                <td class="border border-slate-200 p-2">{{ item.pipeline }}</td>
                <td class="border border-slate-200 p-2">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                    :class="{
                      'bg-amber-100 text-amber-800':  item.status === 'running',
                      'bg-emerald-100 text-emerald-800': item.status === 'success',
                      'bg-rose-100 text-rose-800':    item.status === 'failed',
                      'bg-orange-100 text-orange-700': item.status === 'aborted',
                      'bg-slate-100 text-slate-700':  !['running','success','failed','aborted'].includes(item.status),
                    }"
                  >
                    {{ item.status }}
                  </span>
                </td>
                <td class="border border-slate-200 p-2">{{ item.started_by?.name || '-' }}</td>
                <td class="border border-slate-200 p-2">{{ formatDuration(item.duration_seconds) }}</td>
                <td class="border border-slate-200 p-2 text-slate-600">
                  {{ item.message || item.last_error || 'Ver detalle' }}
                </td>
              </tr>
              <tr v-if="isHistoryOpen(item.id)" class="bg-slate-50">
                <td colspan="6" class="border border-slate-200 p-4">
                  <div class="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                    <p><span class="font-semibold">Fecha fin:</span> {{ formatDate(item.finished_at) }}</p>
                    <p><span class="font-semibold">Paso actual:</span> {{ item.progress.current_step || '-' }}</p>
                    <p><span class="font-semibold">Avance:</span> {{ item.progress.percent }}%</p>
                    <p><span class="font-semibold">Duración:</span> {{ formatDuration(item.duration_seconds) }}</p>
                  </div>
                  <div class="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                    <p class="font-semibold text-slate-800">Resultado</p>
                    <p class="mt-1 whitespace-pre-wrap text-slate-700">{{ item.message || '-' }}</p>
                    <p v-if="item.last_error" class="mt-2 whitespace-pre-wrap text-rose-600">{{ item.last_error }}</p>
                  </div>
                  <div v-if="item.steps?.length" class="mt-3 space-y-2">
                    <p class="font-semibold text-slate-800">Pasos ejecutados</p>
                    <div v-for="step in item.steps" :key="`${item.id}-${step.key}`" class="rounded-lg border border-slate-200 bg-white p-3">
                      <p class="font-semibold">{{ step.label }} - {{ step.status }}</p>
                      <p v-if="step.output" class="mt-1 whitespace-pre-wrap text-slate-600">{{ step.output }}</p>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div v-if="historyMeta && historyMeta.last_page > 1" class="flex items-center justify-between mt-4 text-sm text-slate-600">
        <span>
          Página {{ historyMeta.current_page }} de {{ historyMeta.last_page }}
          ({{ historyMeta.total }} registros)
        </span>
        <div class="flex gap-2">
          <button
            class="h-8 px-3 rounded-lg border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="historyMeta.current_page <= 1"
            @click="goToPage(historyMeta.current_page - 1)"
          >
            ← Anterior
          </button>
          <button
            class="h-8 px-3 rounded-lg border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="historyMeta.current_page >= historyMeta.last_page"
            @click="goToPage(historyMeta.current_page + 1)"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
