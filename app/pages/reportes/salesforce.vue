<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { push } from 'notivue'

definePageMeta({ middleware: ['sanctum:auth'] })

const cargando = ref(false)
const cotizaciones = ref<any[]>([])
const totales = ref({ cotizaciones_no_enviadas: 0, valor_total: 0 })
const porUsuario = ref<any[]>([])
const porEntidad = ref<any[]>([])
const porMedico = ref<any[]>([])
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

const paginas = computed(() => {
  const start = Math.max(1, paginacion.value.current_page - 2)
  const end = Math.min(paginacion.value.last_page, start + 4)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})

const chartRows = computed(() => porEntidad.value.length ? porEntidad.value : porUsuario.value)
const chartMax = computed(() => Math.max(...chartRows.value.map((item) => Number(item.total || 0)), 0))

const construirQuery = (page = 1) => {
  const query: any = { page, per_page: paginacion.value.per_page }
  Object.entries(filtros.value).forEach(([key, value]) => {
    if (value) query[key] = value
  })
  return query
}

const cargarCatalogos = async () => {
  const { data } = await useSanctumFetch('/api/catalogos', { method: 'GET' })
  medicos.value = data.value?.medicos || []
  entidades.value = data.value?.entidades || []
  asesores.value = data.value?.asesores || []
}

const buscar = async (page = 1) => {
  cargando.value = true
  try {
    const { data, error } = await useSanctumFetch('/api/reportes/salesforce', {
      method: 'GET',
      query: construirQuery(page),
    })

    if (error.value) {
      push.error({ title: 'Reporte Salesforce', message: 'No fue posible cargar el reporte', ariaRole: 'alert' })
      return
    }

    cotizaciones.value = data.value?.data || []
    totales.value = data.value?.totales || { cotizaciones_no_enviadas: 0, valor_total: 0 }
    porUsuario.value = data.value?.por_usuario || []
    porEntidad.value = data.value?.por_entidad || []
    porMedico.value = data.value?.por_medico || []
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
  buscar(1)
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const formatMoney = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0))
const barWidth = (total: number) => chartMax.value ? `${Math.max((Number(total || 0) / chartMax.value) * 100, 6)}%` : '0%'

onMounted(async () => {
  await cargarCatalogos()
  await buscar(1)
})
</script>

<template>
  <div class="space-y-6 pb-10">
    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <p class="text-sm font-semibold uppercase tracking-wide text-indigo-700">Reportes</p>
      <h1 class="mt-1 text-3xl font-bold text-slate-900">Reporte Salesforce</h1>
      <p class="mt-2 text-slate-600">Cotizaciones que no han viajado a Salesforce. No incluye codificaciones.</p>
    </section>

    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <h2 class="text-lg font-bold text-slate-900 mb-4">Filtros</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <input v-model="filtros.codigo" class="rounded-lg border border-slate-300 px-3 py-2" placeholder="Nro. cotización" @keyup.enter="buscar(1)" />
        <select v-model="filtros.asesor_id" class="rounded-lg border border-slate-300 px-3 py-2 bg-white">
          <option value="">Todos los usuarios</option>
          <option v-for="asesor in asesores" :key="asesor.id" :value="asesor.id">{{ asesor.name }}</option>
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

    <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p class="text-sm font-semibold text-amber-800">Cotizaciones no enviadas</p>
        <p class="mt-2 text-3xl font-bold text-amber-950">{{ totales.cotizaciones_no_enviadas }}</p>
      </div>
      <div class="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
        <p class="text-sm font-semibold text-indigo-800">Valor total</p>
        <p class="mt-2 text-3xl font-bold text-indigo-950">{{ formatMoney(totales.valor_total) }}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p class="text-sm font-semibold text-slate-700">Registros filtrados</p>
        <p class="mt-2 text-3xl font-bold text-slate-950">{{ paginacion.total }}</p>
      </div>
    </section>

    <section class="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div class="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-bold text-slate-900 mb-4">Gráfica por entidad</h2>
        <div v-if="chartRows.length" class="space-y-4">
          <div v-for="item in chartRows" :key="item.nombre">
            <div class="mb-1 flex items-center justify-between gap-3 text-sm">
              <span class="font-semibold text-slate-800">{{ item.nombre }}</span>
              <span class="text-slate-600">{{ item.total }}</span>
            </div>
            <div class="h-3 overflow-hidden rounded-full bg-slate-100">
              <div class="h-full rounded-full bg-indigo-700" :style="{ width: barWidth(item.total) }"></div>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-slate-500">No hay datos para graficar.</p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-bold text-slate-900 mb-4">Resumen</h2>
        <div class="space-y-5">
          <div>
            <p class="text-sm font-semibold text-slate-500 mb-2">Por usuario</p>
            <p v-for="item in porUsuario.slice(0, 5)" :key="`u-${item.nombre}`" class="flex justify-between border-b border-slate-100 py-1 text-sm"><span>{{ item.nombre }}</span><strong>{{ item.total }}</strong></p>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-500 mb-2">Por médico</p>
            <p v-for="item in porMedico.slice(0, 5)" :key="`m-${item.nombre}`" class="flex justify-between border-b border-slate-100 py-1 text-sm"><span>{{ item.nombre }}</span><strong>{{ item.total }}</strong></p>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <h2 class="text-lg font-bold text-slate-900 mb-4">Detalle de cotizaciones</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-700">
            <tr>
              <th class="px-3 py-3 text-left">Cotización</th>
              <th class="px-3 py-3 text-left">Fecha</th>
              <th class="px-3 py-3 text-left">Usuario</th>
              <th class="px-3 py-3 text-left">Entidad</th>
              <th class="px-3 py-3 text-left">Médico</th>
              <th class="px-3 py-3 text-left">Paciente</th>
              <th class="px-3 py-3 text-left">Último Salesforce</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cargando"><td colspan="7" class="px-3 py-8 text-center text-slate-500">Cargando reporte...</td></tr>
            <tr v-for="item in cotizaciones" :key="item.id" class="border-t border-slate-100 hover:bg-slate-50">
              <td class="px-3 py-3 font-semibold text-slate-900">#{{ item.codigo }}</td>
              <td class="px-3 py-3 text-slate-600">{{ formatDate(item.created_at) }}</td>
              <td class="px-3 py-3 text-slate-700">{{ item.asesor?.name || '-' }}</td>
              <td class="px-3 py-3 text-slate-700">{{ item.entidad?.nombre || '-' }}</td>
              <td class="px-3 py-3 text-slate-700">{{ item.medico?.nombre || '-' }}</td>
              <td class="px-3 py-3 text-slate-700">{{ item.paciente?.nombre_completo || '-' }}</td>
              <td class="px-3 py-3 text-slate-700">
                <span v-if="item.last_salesforce_log">{{ item.last_salesforce_log.status }} - {{ formatDate(item.last_salesforce_log.created_at) }}</span>
                <span v-else class="text-slate-400">Sin intentos</span>
              </td>
            </tr>
            <tr v-if="!cargando && cotizaciones.length === 0"><td colspan="7" class="px-3 py-8 text-center text-slate-500">No hay cotizaciones pendientes para los filtros seleccionados.</td></tr>
          </tbody>
        </table>
      </div>

      <div v-if="paginacion.last_page > 1" class="mt-5 flex items-center justify-center gap-2">
        <button v-if="paginacion.current_page > 1" class="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-100" @click="buscar(paginacion.current_page - 1)">Anterior</button>
        <button v-for="page in paginas" :key="page" :class="['rounded-lg border px-3 py-2', paginacion.current_page === page ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-300 hover:bg-slate-100']" @click="buscar(page)">{{ page }}</button>
        <button v-if="paginacion.current_page < paginacion.last_page" class="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-100" @click="buscar(paginacion.current_page + 1)">Siguiente</button>
      </div>
    </section>
  </div>
</template>
