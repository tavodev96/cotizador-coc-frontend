<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { push } from 'notivue'

definePageMeta({
  middleware: ['sanctum:auth'],
})

const router = useRouter()
const { hasPermission, hasRole, ensureUserPermissions } = useUserPermissions()

const loading = ref(false)
const detailLoading = ref(false)
const logs = ref<any[]>([])
const pagination = ref({ current_page: 1, last_page: 1, per_page: 15, total: 0 })

const selectedLog = ref<any | null>(null)
const showDetail = ref(false)

const filters = ref({
  search: '',
  module: '',
  user_id: '',
  date_from: '',
  date_to: '',
})

const canView = computed(() => hasPermission('configuracion.errores.ver') || hasRole('superadmin') || hasRole('Superadmin'))

const buildParams = (page = 1) => {
  const params: Record<string, string | number> = {
    page,
    per_page: pagination.value.per_page,
  }

  if (filters.value.search) params.search = filters.value.search
  if (filters.value.module) params.module = filters.value.module
  if (filters.value.user_id) params.user_id = filters.value.user_id
  if (filters.value.date_from) params.date_from = filters.value.date_from
  if (filters.value.date_to) params.date_to = filters.value.date_to

  return params
}

const fetchLogs = async (page = 1) => {
  loading.value = true
  try {
    const { data, error } = await useSanctumFetch('/api/system-errors', {
      method: 'GET',
      params: buildParams(page),
    })

    if (error.value) {
      push.error({ title: 'Errores del sistema', message: 'No se pudo cargar el historial de errores.' })
      return
    }

    logs.value = data.value?.data || []
    pagination.value = {
      current_page: data.value?.current_page || 1,
      last_page: data.value?.last_page || 1,
      per_page: data.value?.per_page || 15,
      total: data.value?.total || 0,
    }
  } catch (err) {
    console.error(err)
    push.error({ title: 'Errores del sistema', message: 'Ocurrió un error al consultar los registros.' })
  } finally {
    loading.value = false
  }
}

const openDetail = async (id: number) => {
  detailLoading.value = true
  showDetail.value = true
  selectedLog.value = null

  try {
    const { data, error } = await useSanctumFetch(`/api/system-errors/${id}`, { method: 'GET' })
    if (error.value) {
      push.error({ title: 'Detalle del error', message: 'No se pudo cargar el detalle del error.' })
      showDetail.value = false
      return
    }

    selectedLog.value = data.value?.data || null
  } catch (err) {
    console.error(err)
    push.error({ title: 'Detalle del error', message: 'Ocurrió un error cargando el detalle.' })
    showDetail.value = false
  } finally {
    detailLoading.value = false
  }
}

const closeDetail = () => {
  showDetail.value = false
  selectedLog.value = null
}

const applyFilters = () => fetchLogs(1)

const clearFilters = () => {
  filters.value = {
    search: '',
    module: '',
    user_id: '',
    date_from: '',
    date_to: '',
  }
  fetchLogs(1)
}

const goToPage = (page: number) => {
  if (page < 1 || page > pagination.value.last_page) return
  fetchLogs(page)
}

const formatDate = (value?: string | null) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('es-CO')
}

const shortText = (value?: string | null, max = 120) => {
  if (!value) return '-'
  if (value.length <= max) return value
  return `${value.slice(0, max)}...`
}

onMounted(async () => {
  await ensureUserPermissions()
  if (!canView.value) {
    router.replace('/403')
    return
  }

  await fetchLogs(1)
})
</script>

<template>
  <section class="space-y-5">
    <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
      <h1 class="text-2xl font-semibold text-slate-900 mb-2">Errores del sistema</h1>
      <p class="text-sm text-slate-600">
        Vista de soporte técnico con trazabilidad por módulo, función, usuario y detalle de excepción.
      </p>
    </div>

    <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5 space-y-3">
      <h2 class="text-base font-semibold text-slate-900">Filtros</h2>
      <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          v-model="filters.search"
          type="text"
          placeholder="Buscar error, clase o función"
          class="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        <input
          v-model="filters.module"
          type="text"
          placeholder="Módulo"
          class="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        <input
          v-model="filters.user_id"
          type="number"
          min="1"
          placeholder="ID Usuario"
          class="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        <input
          v-model="filters.date_from"
          type="date"
          class="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        <input
          v-model="filters.date_to"
          type="date"
          class="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div class="flex gap-2">
        <button @click="applyFilters" class="px-4 py-2 rounded-lg bg-indigo-700 text-white text-sm hover:bg-indigo-800">Aplicar</button>
        <button @click="clearFilters" class="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm hover:bg-slate-300">Limpiar</button>
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 overflow-x-auto">
      <div v-if="loading" class="text-sm text-slate-600 py-6 text-center">Cargando errores...</div>

      <template v-else>
        <table class="min-w-full border border-slate-200 text-sm">
          <thead>
            <tr class="bg-slate-50">
              <th class="border border-slate-200 p-2 text-left">Fecha</th>
              <th class="border border-slate-200 p-2 text-left">Módulo</th>
              <th class="border border-slate-200 p-2 text-left">Función</th>
              <th class="border border-slate-200 p-2 text-left">Usuario</th>
              <th class="border border-slate-200 p-2 text-left">Error</th>
              <th class="border border-slate-200 p-2 text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id" class="hover:bg-slate-50">
              <td class="border border-slate-200 p-2 whitespace-nowrap">{{ formatDate(log.created_at) }}</td>
              <td class="border border-slate-200 p-2">{{ log.module || '-' }}</td>
              <td class="border border-slate-200 p-2">{{ log.function_name || '-' }}</td>
              <td class="border border-slate-200 p-2">
                <div>{{ log.user?.name || 'Sistema' }}</div>
                <div class="text-xs text-slate-500">{{ log.user?.email || '-' }}</div>
              </td>
              <td class="border border-slate-200 p-2">
                <div class="font-medium text-slate-800">{{ log.error_class }}</div>
                <div class="text-xs text-slate-600">{{ shortText(log.message, 140) }}</div>
              </td>
              <td class="border border-slate-200 p-2 text-center">
                <button @click="openDetail(log.id)" class="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs hover:bg-slate-800">
                  Ver detalle
                </button>
              </td>
            </tr>
            <tr v-if="logs.length === 0">
              <td colspan="6" class="border border-slate-200 p-4 text-center text-slate-500">
                No hay errores registrados con los filtros aplicados.
              </td>
            </tr>
          </tbody>
        </table>

        <div class="flex items-center justify-between mt-4 text-sm">
          <p class="text-slate-600">Total registros: {{ pagination.total }}</p>
          <div class="flex items-center gap-2">
            <button
              @click="goToPage(pagination.current_page - 1)"
              :disabled="pagination.current_page <= 1"
              class="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 disabled:opacity-50"
            >
              Anterior
            </button>
            <span class="text-slate-700">Página {{ pagination.current_page }} / {{ pagination.last_page }}</span>
            <button
              @click="goToPage(pagination.current_page + 1)"
              :disabled="pagination.current_page >= pagination.last_page"
              class="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </template>
    </div>

    <div v-if="showDetail" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="closeDetail">
      <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-slate-900">Detalle del error</h3>
          <button @click="closeDetail" class="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-sm">Cerrar</button>
        </div>

        <div v-if="detailLoading" class="text-slate-600 text-sm">Cargando detalle...</div>

        <div v-else-if="selectedLog" class="space-y-4 text-sm">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><span class="font-semibold">Fecha:</span> {{ formatDate(selectedLog.created_at) }}</div>
            <div><span class="font-semibold">Usuario:</span> {{ selectedLog.user?.name || 'Sistema' }} ({{ selectedLog.user?.email || '-' }})</div>
            <div><span class="font-semibold">Módulo:</span> {{ selectedLog.module || '-' }}</div>
            <div><span class="font-semibold">Función:</span> {{ selectedLog.function_name || '-' }}</div>
            <div><span class="font-semibold">Clase:</span> {{ selectedLog.error_class }}</div>
            <div><span class="font-semibold">HTTP:</span> {{ selectedLog.http_method || '-' }} {{ selectedLog.status_code || '' }}</div>
            <div class="md:col-span-2"><span class="font-semibold">URL:</span> {{ selectedLog.url || '-' }}</div>
            <div class="md:col-span-2"><span class="font-semibold">Archivo:</span> {{ selectedLog.file || '-' }}:{{ selectedLog.line || '-' }}</div>
          </div>

          <div>
            <p class="font-semibold mb-1">Mensaje</p>
            <pre class="bg-slate-900 text-slate-100 rounded-lg p-3 whitespace-pre-wrap break-words">{{ selectedLog.message || '-' }}</pre>
          </div>

          <div>
            <p class="font-semibold mb-1">Payload request (sin contraseñas)</p>
            <pre class="bg-slate-900 text-slate-100 rounded-lg p-3 whitespace-pre-wrap break-words">{{ selectedLog.request_payload || '-' }}</pre>
          </div>

          <div>
            <p class="font-semibold mb-1">Stack trace</p>
            <pre class="bg-slate-900 text-slate-100 rounded-lg p-3 whitespace-pre-wrap break-words">{{ selectedLog.trace || '-' }}</pre>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
