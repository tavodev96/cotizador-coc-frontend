<template>
  <section class="space-y-6">
    <div class="bg-white border border-slate-200 rounded-2xl p-6">
      <p class="text-slate-500 text-sm">{{ roleDashboard.etiqueta || 'Panel' }}</p>
      <h1 class="text-2xl md:text-3xl font-semibold text-slate-900">
        {{ esAdmin ? 'Resumen del día' : (roleDashboard.titulo || 'Resumen') }}
      </h1>
      <p class="text-slate-600 mt-1">{{ fechaFormateada }}</p>
      <p v-if="!esAdmin && roleDashboard.descripcion" class="text-slate-500 text-sm mt-2">
        {{ roleDashboard.descripcion }}
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <button
          v-for="opcion in periodos"
          :key="opcion.valor"
          class="px-3 py-1.5 rounded-lg text-sm"
          :class="periodoSeleccionado === opcion.valor ? 'bg-[#162983] text-white' : 'bg-slate-100 text-slate-700'"
          :disabled="cargandoDashboard"
          @click="cambiarPeriodo(opcion.valor)"
        >
          {{ opcion.label }}
        </button>
      </div>

      <p
        v-if="avisoFiltroSinResultados"
        class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
      >
        {{ avisoFiltroSinResultados }}
      </p>
    </div>

    <div v-if="cargandoDashboard" class="space-y-4 animate-pulse">
      <div class="bg-white border border-slate-200 rounded-2xl p-4 text-slate-500 text-sm">
        Actualizando métricas del dashboard...
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div v-for="item in 4" :key="`skeleton-card-${item}`" class="bg-white border border-slate-200 rounded-2xl p-6">
          <div class="h-3 w-24 bg-slate-200 rounded"></div>
          <div class="h-10 w-20 bg-slate-200 rounded mt-3"></div>
          <div class="h-3 w-full bg-slate-200 rounded mt-4"></div>
          <div class="h-3 w-3/4 bg-slate-200 rounded mt-2"></div>
          <div class="h-9 w-32 bg-slate-200 rounded mt-5"></div>
        </div>
      </div>

      <div class="bg-white border border-slate-200 rounded-2xl p-6">
        <div class="h-5 w-40 bg-slate-200 rounded mb-4"></div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div v-for="item in 4" :key="`skeleton-block-${item}`" class="bg-slate-50 rounded-lg p-3">
            <div class="h-4 w-40 bg-slate-200 rounded mb-2"></div>
            <div class="h-3 w-full bg-slate-200 rounded mb-2"></div>
            <div class="h-3 w-5/6 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>

    <template v-else-if="esAdmin">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-white border border-slate-200 rounded-2xl p-6">
        <p class="text-sm text-slate-500">Ordenamientos</p>
        <p class="text-4xl font-bold mt-2" :class="cargandoDashboard ? 'text-slate-400 animate-pulse' : 'text-[#162983]'">{{ cargandoDashboard ? '...' : totalOrdenamientos }}</p>
        <NuxtLink to="/ordenamientos" class="inline-flex mt-5 bg-[#162983] text-white px-4 py-2 rounded-lg">
          Ver listado
        </NuxtLink>
      </div>

      <div class="bg-white border border-slate-200 rounded-2xl p-6">
        <p class="text-sm text-slate-500">Cotizaciones</p>
        <p class="text-4xl font-bold mt-2" :class="cargandoDashboard ? 'text-slate-400 animate-pulse' : 'text-[#162983]'">{{ cargandoDashboard ? '...' : totalCotizacionesAdmin }}</p>
        <NuxtLink to="/gestion/seguimiento" class="inline-flex mt-5 bg-[#162983] text-white px-4 py-2 rounded-lg">
          Ver seguimiento
        </NuxtLink>
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-2xl p-6">
      <h2 class="text-lg font-semibold text-slate-900 mb-3">Métricas de negocio</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
        <div class="bg-slate-50 rounded-lg p-3">
          <p class="font-semibold mb-1">Top 5 médicos por cotizaciones</p>
          <p v-if="cargandoDashboard" class="text-slate-400 animate-pulse">Cargando...</p>
          <p v-else-if="metricasDashboard.top_medicos.length === 0" class="text-slate-500">Sin datos</p>
          <ul v-else class="space-y-1">
            <li v-for="(medico, index) in metricasDashboard.top_medicos" :key="`medico-${index}`">
              {{ medico.nombre }}: {{ medico.total }}
            </li>
          </ul>
        </div>

        <div class="bg-slate-50 rounded-lg p-3">
          <p class="font-semibold mb-1">Tiempo promedio de primera actualización</p>
          <p :class="cargandoDashboard ? 'text-slate-400 animate-pulse' : ''">{{ cargandoDashboard ? 'Cargando...' : `${metricasDashboard.promedio_horas_actualizacion} horas` }}</p>
        </div>

        <div class="bg-slate-50 rounded-lg p-3">
          <p class="font-semibold mb-1">Distribución por tipo de gestión</p>
          <p v-if="cargandoDashboard" class="text-slate-400 animate-pulse">Cargando...</p>
          <p v-else-if="metricasDashboard.distribucion_tipo_gestion.length === 0" class="text-slate-500">Sin datos</p>
          <ul v-else class="space-y-1">
            <li v-for="(tipo, index) in metricasDashboard.distribucion_tipo_gestion" :key="`tipo-${index}`">
              {{ tipo.tipo_gestion }}: {{ tipo.total }} ({{ tipo.porcentaje }}%)
            </li>
          </ul>
        </div>

        <div class="bg-slate-50 rounded-lg p-3">
          <p class="font-semibold mb-1">Tasa de conversión a codificación</p>
          <p :class="cargandoDashboard ? 'text-slate-400 animate-pulse' : ''">
            <template v-if="cargandoDashboard">Cargando...</template>
            <template v-else>
            {{ metricasDashboard.conversion.cotizaciones_con_codificacion }} de
            {{ metricasDashboard.conversion.total_cotizaciones }}
            ({{ metricasDashboard.conversion.porcentaje }}%)
            </template>
          </p>
        </div>

        <div class="bg-slate-50 rounded-lg p-3">
          <p class="font-semibold mb-1">Top 5 entidades por volumen y monto</p>
          <p v-if="cargandoDashboard" class="text-slate-400 animate-pulse">Cargando...</p>
          <p v-else-if="metricasDashboard.top_entidades.length === 0" class="text-slate-500">Sin datos</p>
          <ul v-else class="space-y-1">
            <li v-for="(entidad, index) in metricasDashboard.top_entidades" :key="`entidad-${index}`">
              {{ entidad.nombre }}: {{ entidad.total }} / {{ formatearMoneda(entidad.monto_total) }}
            </li>
          </ul>
        </div>

        <div class="bg-slate-50 rounded-lg p-3">
          <p class="font-semibold mb-1">Alertas por inactividad</p>
          <p :class="cargandoDashboard ? 'text-slate-400 animate-pulse' : ''">
            <template v-if="cargandoDashboard">Cargando...</template>
            <template v-else>
            {{ metricasDashboard.alertas_sin_movimiento_48h }} cotizaciones sin movimiento en más de 48 horas
            </template>
          </p>
        </div>
      </div>
    </div>
    </template>

    <template v-else>
      <div
        v-if="roleDashboard.notice"
        class="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-900"
      >
        <h2 class="text-lg font-semibold">{{ roleDashboard.notice.titulo }}</h2>
        <p class="text-sm mt-2">{{ roleDashboard.notice.descripcion }}</p>
      </div>

      <div v-if="roleDashboard.cards.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div
          v-for="card in roleDashboard.cards"
          :key="card.titulo"
          class="bg-white border border-slate-200 rounded-2xl p-6"
        >
          <p class="text-sm text-slate-500">{{ card.titulo }}</p>
          <p class="text-3xl font-bold mt-2" :class="cargandoDashboard ? 'text-slate-400 animate-pulse' : 'text-[#162983]'">{{ cargandoDashboard ? '...' : card.valor }}</p>
          <p class="text-sm text-slate-600 mt-3">{{ card.descripcion }}</p>
          <NuxtLink
            v-if="card.enlace && card.accion"
            :to="card.enlace"
            class="inline-flex mt-5 bg-[#162983] text-white px-4 py-2 rounded-lg"
          >
            {{ card.accion }}
          </NuxtLink>
        </div>
      </div>

      <div v-if="roleDashboard.blocks.length" class="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 class="text-lg font-semibold text-slate-900 mb-3">Métricas del rol</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
          <div v-for="block in roleDashboard.blocks" :key="block.titulo" class="bg-slate-50 rounded-lg p-3">
            <p class="font-semibold mb-1">{{ block.titulo }}</p>

            <template v-if="block.tipo === 'lista'">
              <p v-if="cargandoDashboard" class="text-slate-400 animate-pulse">Cargando...</p>
              <p v-else-if="block.items.length === 0" class="text-slate-500">Sin datos</p>
              <ul v-else class="space-y-1">
                <li v-for="(item, index) in block.items" :key="`${block.titulo}-${index}`">
                  {{ item.etiqueta }}: {{ item.valor }}<span v-if="item.extra"> ({{ item.extra }})</span>
                </li>
              </ul>
            </template>

            <template v-else>
              <p :class="cargandoDashboard ? 'text-slate-400 animate-pulse' : ''">{{ cargandoDashboard ? 'Cargando...' : block.valor }}</p>
              <p v-if="block.descripcion" class="text-slate-500 mt-1">{{ block.descripcion }}</p>
            </template>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup>
definePageMeta({
  layout: 'default',
  middleware: ['sanctum:auth']
})

const {
  totalOrdenamientos,
  metricasDashboard,
  roleDashboard,
  cargandoDashboard,
  avisoFiltroSinResultados,
  fetchTotalOrdenamientos,
  fetchDashboard,
} = useDashboardData()

const periodos = [
  { label: 'Hoy', valor: 'hoy' },
  { label: 'Últimos 7 días', valor: '7d' },
  { label: 'Últimos 30 días', valor: '30d' },
]

const periodoSeleccionado = ref('30d')

const esAdmin = computed(() => roleDashboard.value.rol === 'administrador')

const totalCotizacionesAdmin = computed(() => {
  return Number(metricasDashboard.value?.conversion?.total_cotizaciones ?? 0)
})

const formatearMoneda = (valor) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(valor || 0))
}

const cambiarPeriodo = async (periodo) => {
  periodoSeleccionado.value = periodo
  await actualizarDashboard(periodo)
}

const actualizarDashboard = async (periodo) => {
  await fetchDashboard(periodo)

  if (esAdmin.value) {
    if (!avisoFiltroSinResultados.value) {
      fetchTotalOrdenamientos(periodo)
    }
    return
  }

  totalOrdenamientos.value = 0
}

const fechaFormateada = computed(() => {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: '2-digit'
  }).format(new Date())
})

onMounted(() => {
  actualizarDashboard(periodoSeleccionado.value)
  console.log('Dashboard montado', {
    roleDashboard: roleDashboard.value,
    metricasDashboard: metricasDashboard.value,
    totalOrdenamientos: totalOrdenamientos.value,
  })
})
</script>