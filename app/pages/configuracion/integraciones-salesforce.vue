<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { push } from 'notivue'

definePageMeta({
  middleware: ['sanctum:auth'],
})

const route = useRoute()
const { hasPermission, ensureUserPermissions } = useUserPermissions()

const loading = ref(true)
const statsLoading = ref(false)
const logsLoading = ref(false)
const detailLoading = ref(false)
const retryLoading = ref(false)
const stats = ref<any>(null)
const recentErrors = ref<any[]>([])
const allLogs = ref<any[]>([])
const pagination = ref({ current_page: 1, last_page: 1, per_page: 25, total: 0 })

// Flags para evitar overlapping de requests
const dashboardRequestInFlight = ref(false)
const logsRequestInFlight = ref(false)

const selectedLog = ref<any | null>(null)
const showDetail = ref(false)

const filters = ref({
  status: '',
  error_code: '',
  date_from: '',
  date_to: '',
  days: 30,
})

const errorCodes = ref<string[]>([])

const canViewLogs = computed(() => hasPermission('integraciones.salesforce.ver_logs'))
const canRetry = computed(() => hasPermission('integraciones.salesforce.reintento'))

const pushNotification = (type: string, message: string, title: string) => {
  push[type as keyof typeof push]({
    title: title,
    message: message,
    ariaRole: 'alert'
  })
}

const fetchDashboard = async () => {
  // Evita overlapping: si ya hay un request, no lanza otro
  if (dashboardRequestInFlight.value) {
    console.debug('Dashboard request already in flight, skipping')
    return
  }

  dashboardRequestInFlight.value = true
  statsLoading.value = true

  try {
    const { data, error } = await useSanctumFetch('/api/salesforce/dashboard', {
      method: 'GET',
      params: { days: filters.value.days },
    })

    if (error.value) {
      console.warn('Dashboard error:', error.value)
      // Si hay error pero ya tenemos datos previos, mantenerlos sin notificar
      if (!stats.value) {
        pushNotification('error', 'No se pudo cargar el dashboard', 'Error')
      }
      return
    }

    // Actualiza con los nuevos datos
    stats.value = data.value?.stats
    recentErrors.value = data.value?.recent_errors || []
    errorCodes.value = data.value?.errors_by_code?.map((e: any) => e.error_code) || []
  } catch (err) {
    console.error('Dashboard fetch error:', err)
    if (!stats.value) {
      pushNotification('error', 'Error al procesar el dashboard', 'Error')
    }
  } finally {
    statsLoading.value = false
    dashboardRequestInFlight.value = false
  }
}

const fetchAllLogs = async (page = 1) => {
  // Evita overlapping: si ya hay un request, no lanza otro
  if (logsRequestInFlight.value) {
    console.debug('Logs request already in flight, skipping')
    return
  }

  logsRequestInFlight.value = true
  logsLoading.value = true

  try {
    const params: any = {
      page,
      per_page: pagination.value.per_page,
    }

    if (filters.value.status) params.status = filters.value.status
    if (filters.value.error_code) params.error_code = filters.value.error_code
    if (filters.value.date_from) params.date_from = filters.value.date_from
    if (filters.value.date_to) params.date_to = filters.value.date_to

    const { data, error } = await useSanctumFetch('/api/salesforce/all-logs', {
      method: 'GET',
      params,
    })

    if (error.value) {
      console.warn('Logs error:', error.value)
      if (allLogs.value.length === 0) {
        pushNotification('error', 'No se pudo cargar los logs', 'Error')
      }
      return
    }

    allLogs.value = data.value?.data || []
    pagination.value = {
      current_page: data.value?.pagination?.current_page || 1,
      last_page: data.value?.pagination?.last_page || 1,
      per_page: data.value?.pagination?.per_page || 25,
      total: data.value?.pagination?.total || 0,
    }
  } catch (err) {
    console.warn('Logs fetch error:', err)
    if (allLogs.value.length === 0) {
      pushNotification('error', 'Error al procesar los logs', 'Error')
    }
  } finally {
    logsLoading.value = false
    logsRequestInFlight.value = false
  }
}

const clearResults = () => {
  // Limpia la tabla en cliente (no elimina logs en servidor)
  allLogs.value = []
  pagination.value = { current_page: 1, last_page: 1, per_page: pagination.value.per_page || 25, total: 0 }
}

const openDetail = (log: any) => {
  selectedLog.value = log
  showDetail.value = true
}

const closeDetail = () => {
  showDetail.value = false
  selectedLog.value = null
}

const retry = async (logId: number) => {
  if (retryLoading.value) return

  retryLoading.value = true

  try {
    const { data, error } = await useSanctumFetch('/api/salesforce/retry', {
      method: 'POST',
      body: { log_id: logId },
    })

    if (error.value) {
      pushNotification('error', 'No se pudo encolar el reintento', 'Reintento')
      return
    }

    pushNotification('success', 'Sincronización encolada correctamente', 'Reintento')
    closeDetail()
    await Promise.all([fetchDashboard(), fetchAllLogs()])
  } catch (err) {
    console.error(err)
    pushNotification('error', 'Error al procesar el reintento', 'Reintento')
  } finally {
    retryLoading.value = false
  }
}

const applyFilters = () => {
  fetchAllLogs(1)
}

const clearFilters = () => {
  filters.value = {
    status: '',
    error_code: '',
    date_from: '',
    date_to: '',
    days: 30,
  }
  fetchDashboard()
  fetchAllLogs(1)
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const getStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    queued: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
  }
  return classes[status] || 'bg-slate-100 text-slate-800'
}

const getStatusIcon = (status: string) => {
  const icons: Record<string, string> = {
    success: '✓',
    error: '✗',
    queued: '⏳',
    failed: '✗',
  }
  return icons[status] || '•'
}

let dashboardPollInterval: number | null = null
let logsPollInterval: number | null = null

onMounted(async () => {
  await ensureUserPermissions()

  if (!canViewLogs.value) {
    console.warn('No permission to view Salesforce logs')
    loading.value = false
    return
  }

  try {
    // Primero cargar estadísticas rápidas para mostrar las tarjetas inmediatamente
    await fetchDashboard()

    // Cargar el historial en segundo plano (lazy-load) sin bloquear el render inicial
    await fetchAllLogs(1)

    // Polling ligero para mantener las tarjetas actualizadas (cada 8s)
    dashboardPollInterval = window.setInterval(() => {
      if (!dashboardRequestInFlight.value) {
        fetchDashboard()
      }
    }, 8000)

    // Polling para historial solo si no hay filtros aplicados (cada 12s)
    logsPollInterval = window.setInterval(() => {
      const hasFilters = !!(filters.value.status || filters.value.error_code || filters.value.date_from || filters.value.date_to)
      if (!logsRequestInFlight.value && !hasFilters) {
        fetchAllLogs(pagination.value.current_page)
      }
    }, 12000)
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (dashboardPollInterval) clearInterval(dashboardPollInterval)
  if (logsPollInterval) clearInterval(logsPollInterval)
})
</script>

<template>
  <div class="space-y-6 pb-10">
    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-3xl font-bold text-slate-900">Integración Salesforce</h1>
        <div class="flex items-center gap-2">
          <select v-model.number="filters.days" @change="fetchDashboard" class="px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm" :disabled="statsLoading">
            <option :value="1">Últimas 24 horas</option>
            <option :value="7">Últimos 7 días</option>
            <option :value="30">Últimos 30 días</option>
            <option :value="90">Últimos 90 días</option>
          </select>
        </div>
      </div>

      <!-- Estadísticas con Skeleton Loading -->
      <div v-if="statsLoading" class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div v-for="i in 5" :key="i" class="bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 rounded-xl p-4 animate-pulse">
          <div class="h-4 bg-slate-300 rounded w-2/3 mb-3"></div>
          <div class="h-8 bg-slate-300 rounded w-1/2"></div>
        </div>
      </div>

      <div v-else-if="stats" class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div class="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 hover:shadow-md transition">
          <p class="text-slate-700 text-sm font-semibold">Total de Sincronizaciones</p>
          <p class="text-3xl font-bold text-blue-900 mt-2">{{ stats.total_syncs }}</p>
        </div>

        <div class="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4 hover:shadow-md transition">
          <p class="text-slate-700 text-sm font-semibold">Exitosas</p>
          <p class="text-3xl font-bold text-green-900 mt-2">{{ stats.successful }}</p>
        </div>

        <div class="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-4 hover:shadow-md transition">
          <p class="text-slate-700 text-sm font-semibold">Fallidas</p>
          <p class="text-3xl font-bold text-red-900 mt-2">{{ stats.failed }}</p>
        </div>

        <div class="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-4 hover:shadow-md transition">
          <p class="text-slate-700 text-sm font-semibold">En Cola</p>
          <p class="text-3xl font-bold text-yellow-900 mt-2">{{ stats.queued }}</p>
        </div>

        <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-4 hover:shadow-md transition">
          <p class="text-slate-700 text-sm font-semibold">Tasa de Éxito</p>
          <p class="text-3xl font-bold text-indigo-900 mt-2">{{ stats.success_rate }}%</p>
        </div>
      </div>
    </section>

    <!-- Errores Recientes -->
    <section v-if="!statsLoading && recentErrors.length > 0" class="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <h2 class="text-xl font-bold text-slate-900 mb-4">Últimos Errores</h2>
      <div class="space-y-3">
        <div v-for="error in recentErrors" :key="error.id" class="flex items-start justify-between p-4 bg-red-50 border border-red-200 rounded-lg hover:shadow-md transition cursor-pointer" @click="openDetail(error)">
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <span class="inline-block px-2.5 py-1.5 bg-red-200 text-red-800 text-xs font-bold rounded">{{ error.error_code }}</span>
              <span class="text-slate-900 font-semibold">Cotización #{{ error.cotizacion?.codigo }}</span>
            </div>
            <p class="text-slate-700 text-sm mt-2">{{ error.error_message }}</p>
            <p class="text-slate-500 text-xs mt-2">{{ formatDate(error.created_at) }}</p>
          </div>
          <div class="ml-4">
            <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>
      </div>
    </section>

    <!-- Tabla de Logs -->
    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <h2 class="text-xl font-bold text-slate-900 mb-4">Historial de Sincronizaciones</h2>

      <!-- Filtros -->
      <div class="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Estado</label>
            <select v-model="filters.status" class="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" :disabled="logsLoading">
              <option value="">Todos</option>
              <option value="success">Exitoso</option>
              <option value="error">Error</option>
              <option value="queued">En cola</option>
              <option value="failed">Fallido</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Código de Error</label>
            <select v-model="filters.error_code" class="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" :disabled="logsLoading">
              <option value="">Todos</option>
              <option v-for="code in errorCodes" :key="code" :value="code">{{ code }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Desde</label>
            <input v-model="filters.date_from" type="date" class="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" :disabled="logsLoading" />
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Hasta</label>
            <input v-model="filters.date_to" type="date" class="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" :disabled="logsLoading" />
          </div>
        </div>

        <div class="flex gap-2 justify-end">
          <button @click="clearFilters" :disabled="logsLoading" class="px-4 py-2 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
            Limpiar Filtros
          </button>
          <button @click="clearResults" :disabled="logsLoading" class="px-4 py-2 bg-rose-100 text-rose-800 rounded-lg hover:bg-rose-200 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
            Limpiar Resultados
          </button>
          <button @click="applyFilters" :disabled="logsLoading" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
            Aplicar Filtros
          </button>
        </div>
      </div>

      <!-- Tabla -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50">
              <th class="px-4 py-3 text-left font-semibold text-slate-700">Estado</th>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">Cotización</th>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">Código Error</th>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">Intento</th>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">Usuario</th>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
              <th class="px-4 py-3 text-center font-semibold text-slate-700">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <!-- Skeleton Loaders -->
            <tr v-if="logsLoading" v-for="i in 5" :key="`skeleton-${i}`" class="border-b border-slate-200 animate-pulse">
              <td class="px-4 py-3"><div class="h-6 bg-slate-200 rounded w-16"></div></td>
              <td class="px-4 py-3"><div class="h-6 bg-slate-200 rounded w-32"></div></td>
              <td class="px-4 py-3"><div class="h-6 bg-slate-200 rounded w-24"></div></td>
              <td class="px-4 py-3"><div class="h-6 bg-slate-200 rounded w-8"></div></td>
              <td class="px-4 py-3"><div class="h-6 bg-slate-200 rounded w-40"></div></td>
              <td class="px-4 py-3"><div class="h-6 bg-slate-200 rounded w-48"></div></td>
              <td class="px-4 py-3"><div class="h-6 bg-slate-200 rounded w-20"></div></td>
            </tr>

            <!-- Datos reales -->
            <tr v-for="log in allLogs" :key="log.id" class="border-b border-slate-200 hover:bg-slate-50 transition">
              <td class="px-4 py-3">
                <span :class="['inline-block px-2.5 py-1 rounded-full text-xs font-bold', getStatusBadgeClass(log.status)]">
                  {{ getStatusIcon(log.status) }} {{ log.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-slate-900 font-semibold">#{{ log.cotizacion?.codigo }}</td>
              <td class="px-4 py-3">
                <span v-if="log.error_code" class="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded font-mono">
                  {{ log.error_code }}
                </span>
                <span v-else class="text-slate-400">-</span>
              </td>
              <td class="px-4 py-3 text-slate-700">{{ log.attempt || 1 }}</td>
              <td class="px-4 py-3 text-slate-700">{{ log.user?.name || '-' }}</td>
              <td class="px-4 py-3 text-slate-600 text-xs">{{ formatDate(log.created_at) }}</td>
              <td class="px-4 py-3 text-center">
                <button @click="openDetail(log)" class="text-indigo-600 hover:text-indigo-800 font-semibold">
                  Ver Detalles
                </button>
              </td>
            </tr>

            <!-- Sin resultados -->
            <tr v-if="!logsLoading && allLogs.length === 0">
              <td colspan="7" class="px-4 py-8 text-center text-slate-500">
                <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                No hay registros que mostrar
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div class="flex justify-center items-center gap-2 mt-6">
        <button v-if="pagination.current_page > 1" @click="fetchAllLogs(pagination.current_page - 1)" :disabled="logsLoading" class="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed">
          Anterior
        </button>

        <div class="flex items-center gap-1">
          <span v-for="page in Math.min(5, pagination.last_page)" :key="page" :class="['px-3 py-2 rounded-lg border cursor-pointer', pagination.current_page === page ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 hover:bg-slate-100']" @click="fetchAllLogs(page)">
            {{ page }}
          </span>
        </div>

        <button v-if="pagination.current_page < pagination.last_page" @click="fetchAllLogs(pagination.current_page + 1)" :disabled="logsLoading" class="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed">
          Siguiente
        </button>
      </div>
    </section>

    <!-- Modal de Detalles -->
    <div v-if="showDetail && selectedLog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-lg p-6 w-full max-w-2xl max-h-96 overflow-y-auto relative border border-slate-200">
        <button @click="closeDetail" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          ✕
        </button>

        <h3 class="text-2xl font-bold text-slate-900 mb-6">Detalles del Log</h3>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-slate-700 font-semibold text-sm">Estado</p>
              <p :class="['text-lg font-bold mt-1', selectedLog.status === 'success' ? 'text-green-600' : 'text-red-600']">
                {{ selectedLog.status }}
              </p>
            </div>
            <div>
              <p class="text-slate-700 font-semibold text-sm">Código de Error</p>
              <p class="text-lg font-mono mt-1">{{ selectedLog.error_code || '-' }}</p>
            </div>
            <div>
              <p class="text-slate-700 font-semibold text-sm">Cotización</p>
              <p class="text-lg font-bold mt-1">#{{ selectedLog.cotizacion?.codigo }}</p>
            </div>
            <div>
              <p class="text-slate-700 font-semibold text-sm">Intento</p>
              <p class="text-lg font-bold mt-1">{{ selectedLog.attempt || 1 }}</p>
            </div>
            <div>
              <p class="text-slate-700 font-semibold text-sm">Usuario</p>
              <p class="text-lg mt-1">{{ selectedLog.user?.name || '-' }}</p>
            </div>
            <div>
              <p class="text-slate-700 font-semibold text-sm">HTTP Status</p>
              <p class="text-lg font-mono mt-1">{{ selectedLog.http_status || '-' }}</p>
            </div>
          </div>

          <div v-if="selectedLog.error_message" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-slate-700 font-semibold text-sm mb-2">Mensaje de Error</p>
            <p class="text-slate-800 font-mono text-sm whitespace-pre-wrap break-words">{{ selectedLog.error_message }}</p>
          </div>

          <div v-if="selectedLog.request" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p class="text-slate-700 font-semibold text-sm mb-2">Request</p>
            <pre class="text-slate-800 font-mono text-xs overflow-auto max-h-48">{{ JSON.stringify(JSON.parse(selectedLog.request), null, 2) }}</pre>
          </div>

          <div v-if="selectedLog.response" class="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p class="text-slate-700 font-semibold text-sm mb-2">Response</p>
            <pre class="text-slate-800 font-mono text-xs overflow-auto max-h-48">{{ selectedLog.response }}</pre>
          </div>

          <div v-if="selectedLog.metadata" class="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <p class="text-slate-700 font-semibold text-sm mb-2">Metadata</p>
            <pre class="text-slate-800 font-mono text-xs overflow-auto max-h-48">{{ JSON.stringify(selectedLog.metadata, null, 2) }}</pre>
          </div>

          <p class="text-slate-500 text-xs">
            <strong>Creado:</strong> {{ formatDate(selectedLog.created_at) }}
          </p>

          <!-- Botones de Acción -->
          <div v-if="canRetry && selectedLog.status === 'error'" class="flex gap-2 mt-6">
            <button @click="retry(selectedLog.id)" :disabled="retryLoading" class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold flex items-center justify-center gap-2">
              <template v-if="!retryLoading">🔄 Reintentar Sincronización</template>
              <template v-else>
                <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Procesando...
              </template>
            </button>
            <button @click="closeDetail" class="px-4 py-2 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 transition font-semibold">
              Cerrar
            </button>
          </div>
          <div v-else class="flex justify-end">
            <button @click="closeDetail" class="px-4 py-2 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 transition font-semibold">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
