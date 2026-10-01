<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { push } from 'notivue'

definePageMeta({ middleware: ['sanctum:auth'] })

const { hasPermission, hasRole, ensureUserPermissions } = useUserPermissions()

const cargando = ref(false)
const reprocesando = ref<Record<number, boolean>>({})
const cotizaciones = ref<any[]>([])
const totales = ref({ total_cotizaciones: 0, enviadas: 0, con_error: 0, pendientes: 0 })
const porAsesor = ref<any[]>([])
const medicos = ref<any[]>([])
const entidades = ref<any[]>([])
const asesores = ref<any[]>([])

const filtros = ref({
  codigo: '',
  asesor_id: '',
  entidad_id: '',
  medico_id: '',
  date_from: '',
  date_to: '',
})

const paginacion = ref({ current_page: 1, last_page: 1, per_page: 25, total: 0 })

const canRetrySalesforce = computed(() => {
  return hasPermission('integraciones.salesforce.reintento')
    || hasRole('admin')
    || hasRole('Admin')
    || hasRole('administrador')
    || hasRole('Administrador')
    || hasRole('superadmin')
    || hasRole('Superadmin')
})

const canViewSalesforceReport = computed(() => hasPermission('reportes.salesforce.ver'))

const canViewAllSalesforceReport = computed(() => {
  return hasRole('admin')
    || hasRole('Admin')
    || hasRole('administrador')
    || hasRole('Administrador')
    || hasRole('superadmin')
    || hasRole('Superadmin')
})

const paginas = computed(() => {
  const start = Math.max(1, paginacion.value.current_page - 2)
  const end = Math.min(paginacion.value.last_page, start + 4)
  return Array.from({ length: Math.max(end - start + 1, 0) }, (_, index) => start + index)
})

const chartMax = computed(() => Math.max(...porAsesor.value.map((item) => Number(item.total_cotizaciones || 0)), 0))

const construirQuery = (page = 1) => {
  const query: any = { page, per_page: paginacion.value.per_page }
  Object.entries(filtros.value).forEach(([key, value]) => {
    if (value) query[key] = value
  })
  return query
}

const cargarCatalogos = async () => {
  if (!canViewSalesforceReport.value) return

  const { data } = await useSanctumFetch('/api/catalogos', { method: 'GET' })
  medicos.value = data.value?.medicos || []
  entidades.value = data.value?.entidades || []
  asesores.value = data.value?.asesores || []
}

const buscar = async (page = 1) => {
  if (!canViewSalesforceReport.value) {
    cotizaciones.value = []
    porAsesor.value = []
    totales.value = { total_cotizaciones: 0, enviadas: 0, con_error: 0, pendientes: 0 }
    return
  }

  cargando.value = true
  try {
    const { data, error } = await useSanctumFetch('/api/reportes/salesforce-asesores', {
      method: 'GET',
      query: construirQuery(page),
    })

    if (error.value) {
      push.error({ title: 'Reporte Salesforce', message: 'No fue posible cargar el reporte', ariaRole: 'alert' })
      return
    }

    cotizaciones.value = data.value?.data || []
    totales.value = data.value?.totales || { total_cotizaciones: 0, enviadas: 0, con_error: 0, pendientes: 0 }
    porAsesor.value = data.value?.por_asesor || []
    paginacion.value = {
      current_page: data.value?.pagination?.current_page || 1,
      last_page: data.value?.pagination?.last_page || 1,
      per_page: data.value?.pagination?.per_page || 25,
      total: data.value?.pagination?.total || 0,
    }
  } finally {
    cargando.value = false
  }
}

const limpiarFiltros = () => {
  filtros.value = { codigo: '', asesor_id: '', entidad_id: '', medico_id: '', date_from: '', date_to: '' }
  if (canViewSalesforceReport.value) buscar(1)
}

const reprocesar = async (cotizacion: any) => {
  if (!cotizacion?.id) return
  reprocesando.value[cotizacion.id] = true

  const { error } = await useSanctumFetch(`/api/salesforce/retry-cotizacion/${cotizacion.id}`, { method: 'POST' })

  if (error.value) {
    push.error({ title: 'Salesforce', message: error.value?.data?.message || 'No fue posible encolar el reproceso.', ariaRole: 'alert' })
  } else {
    push.success({ title: 'Salesforce', message: 'Cotización encolada para reproceso.', ariaRole: 'status' })
    await buscar(paginacion.value.current_page)
  }

  reprocesando.value[cotizacion.id] = false
}

const estadoSalesforce = (item: any) => {
  const status = String(item?.last_salesforce_log?.status || '').toLowerCase()
  if (status === 'error') return { texto: 'Error', clase: 'bg-rose-100 text-rose-700' }
  if (status === 'queued') return { texto: 'Pendiente', clase: 'bg-amber-100 text-amber-700' }
  return { texto: 'Sin envío exitoso', clase: 'bg-slate-100 text-slate-700' }
}

const formatDate = (date: string) => {
  if (!date) return '-'
  const fecha = new Date(date)
  if (Number.isNaN(fecha.getTime())) return String(date)
  return fecha.toLocaleString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const barWidth = (total: number) => chartMax.value ? `${Math.max((Number(total || 0) / chartMax.value) * 100, 6)}%` : '0%'

onMounted(async () => {
  await ensureUserPermissions()

  if (!canViewSalesforceReport.value) return

  await cargarCatalogos()
  await buscar(1)
})
</script>

<template>
  <div class="space-y-6 pb-10">
    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <p class="text-sm font-semibold uppercase tracking-wide text-indigo-700">Reportes</p>
      <h1 class="mt-1 text-3xl font-bold text-slate-900">{{ canViewAllSalesforceReport ? 'Reporte Salesforce' : 'Mi reporte Salesforce' }}</h1>
      <p class="mt-2 text-slate-600">
        {{ canViewAllSalesforceReport
          ? 'Cotizaciones de todos los asesores, enviadas correctamente, con error o pendientes. No incluye codificaciones.'
          : 'Cotizaciones del usuario logueado, enviadas correctamente, con error o pendientes. No incluye codificaciones.' }}
      </p>
    </section>

    <section v-if="!canViewSalesforceReport" class="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
      <h2 class="text-lg font-bold">No tienes permiso para ver este reporte</h2>
      <p class="mt-2 text-sm">
        Para acceder al reporte Salesforce debes tener asignado el permiso
        <span class="font-semibold">reportes.salesforce.ver</span>. Solicita la asignación desde el módulo de roles y permisos.
      </p>
    </section>

    <template v-else>

    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <h2 class="text-lg font-bold text-slate-900 mb-4">Filtros</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
        <input v-model="filtros.codigo" class="rounded-lg border border-slate-300 px-3 py-2" placeholder="Nro. cotización" @keyup.enter="buscar(1)" />
        <select v-if="canViewAllSalesforceReport" v-model="filtros.asesor_id" class="rounded-lg border border-slate-300 px-3 py-2 bg-white">
          <option value="">Todos los asesores</option>
          <option v-for="asesor in asesores" :key="asesor.id" :value="asesor.id">{{ asesor.name || asesor.nombre }}</option>
        </select>
        <select v-model="filtros.entidad_id" class="rounded-lg border border-slate-300 px-3 py-2 bg-white">
          <option value="">Todas las entidades</option>
          <option v-for="entidad in entidades" :key="entidad.id" :value="entidad.id">{{ entidad.nombre }}</option>
        </select>
        <select v-model="filtros.medico_id" class="rounded-lg border border-slate-300 px-3 py-2 bg-white">
          <option value="">Todos los médicos</option>
          <option v-for="medico in medicos" :key="medico.id" :value="medico.id">{{ medico.nombre }}</option>
        </select>
        <input v-model="filtros.date_from" type="date" class="rounded-lg border border-slate-300 px-3 py-2" />
        <input v-model="filtros.date_to" type="date" class="rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded-lg bg-slate-200 px-4 py-2 font-semibold text-slate-900 hover:bg-slate-300" @click="limpiarFiltros">Limpiar</button>
        <button class="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white hover:bg-indigo-800 disabled:opacity-60" :disabled="cargando" @click="buscar(1)">
          {{ cargando ? 'Consultando...' : 'Buscar' }}
        </button>
      </div>
    </section>

    <section class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-5">
        <p class="text-sm font-semibold text-slate-600">Cotizaciones</p>
        <p class="mt-2 text-3xl font-bold text-slate-950">{{ totales.total_cotizaciones }}</p>
      </div>
      <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p class="text-sm font-semibold text-emerald-800">Enviadas</p>
        <p class="mt-2 text-3xl font-bold text-emerald-950">{{ totales.enviadas }}</p>
      </div>
      <div class="rounded-2xl border border-rose-200 bg-rose-50 p-5">
        <p class="text-sm font-semibold text-rose-800">Con error</p>
        <p class="mt-2 text-3xl font-bold text-rose-950">{{ totales.con_error }}</p>
      </div>
      <div class="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p class="text-sm font-semibold text-amber-800">Pendientes</p>
        <p class="mt-2 text-3xl font-bold text-amber-950">{{ totales.pendientes }}</p>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-bold text-slate-900 mb-4">Resumen por asesor</h2>
      <div v-if="porAsesor.length" class="space-y-4">
        <div v-for="item in porAsesor" :key="item.nombre" class="rounded-xl border border-slate-100 p-4">
          <div class="mb-2 flex items-center justify-between gap-3 text-sm">
            <span class="font-semibold text-slate-900">{{ item.nombre }}</span>
            <span class="text-slate-600">{{ item.total_cotizaciones }} cotizaciones</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-slate-100 mb-3">
            <div class="h-full rounded-full bg-indigo-700" :style="{ width: barWidth(item.total_cotizaciones) }"></div>
          </div>
          <div class="grid grid-cols-3 gap-2 text-xs text-slate-600">
            <span class="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700">Enviadas: {{ item.enviadas }}</span>
            <span class="rounded-lg bg-rose-50 px-2 py-1 text-rose-700">Errores: {{ item.con_error }}</span>
            <span class="rounded-lg bg-amber-50 px-2 py-1 text-amber-700">Pendientes: {{ item.pendientes }}</span>
          </div>
        </div>
      </div>
      <p v-else class="text-sm text-slate-500">No hay datos para mostrar.</p>
    </section>

    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <h2 class="text-lg font-bold text-slate-900 mb-4">Cotizaciones pendientes o con error</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-700">
            <tr>
              <th class="px-3 py-3 text-left">Cotización</th>
              <th class="px-3 py-3 text-left">Fecha</th>
              <th class="px-3 py-3 text-left">Asesor</th>
              <th class="px-3 py-3 text-left">Entidad</th>
              <th class="px-3 py-3 text-left">Médico</th>
              <th class="px-3 py-3 text-left">Paciente</th>
              <th class="px-3 py-3 text-left">Estado SF</th>
              <th class="px-3 py-3 text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cargando"><td colspan="8" class="px-3 py-8 text-center text-slate-500">Cargando reporte...</td></tr>
            <tr v-for="item in cotizaciones" :key="item.id" class="border-t border-slate-100 hover:bg-slate-50">
              <td class="px-3 py-3 font-semibold text-slate-900">#{{ item.codigo }}</td>
              <td class="px-3 py-3 text-slate-600">{{ formatDate(item.created_at) }}</td>
              <td class="px-3 py-3 text-slate-700">{{ item.asesor?.name || '-' }}</td>
              <td class="px-3 py-3 text-slate-700">{{ item.entidad?.nombre || '-' }}</td>
              <td class="px-3 py-3 text-slate-700">{{ item.medico?.nombre || '-' }}</td>
              <td class="px-3 py-3 text-slate-700">{{ item.paciente?.nombre_completo || `${item.paciente?.nombres || ''} ${item.paciente?.apellidos || ''}`.trim() || '-' }}</td>
              <td class="px-3 py-3">
                <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="estadoSalesforce(item).clase">{{ estadoSalesforce(item).texto }}</span>
                <p v-if="item.last_salesforce_log" class="mt-1 text-xs text-slate-500">{{ formatDate(item.last_salesforce_log.created_at) }}</p>
              </td>
              <td class="px-3 py-3 text-center">
                <button
                  v-if="canRetrySalesforce"
                  class="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
                  :disabled="reprocesando[item.id]"
                  @click="reprocesar(item)"
                >
                  {{ reprocesando[item.id] ? 'Encolando...' : 'Reprocesar' }}
                </button>
                <span v-else class="text-xs text-slate-400">Sin permiso</span>
              </td>
            </tr>
            <tr v-if="!cargando && cotizaciones.length === 0"><td colspan="8" class="px-3 py-8 text-center text-slate-500">No hay cotizaciones pendientes o con error para los filtros seleccionados.</td></tr>
          </tbody>
        </table>
      </div>

      <div v-if="paginacion.last_page > 1" class="mt-5 flex items-center justify-center gap-2">
        <button v-if="paginacion.current_page > 1" class="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-100" @click="buscar(paginacion.current_page - 1)">Anterior</button>
        <button v-for="page in paginas" :key="page" :class="['rounded-lg border px-3 py-2', paginacion.current_page === page ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-300 hover:bg-slate-100']" @click="buscar(page)">{{ page }}</button>
        <button v-if="paginacion.current_page < paginacion.last_page" class="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-100" @click="buscar(paginacion.current_page + 1)">Siguiente</button>
      </div>
    </section>
    </template>
  </div>
</template>
