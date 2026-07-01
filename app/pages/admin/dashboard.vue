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
      <p
        v-if="avisoFiltroSinResultados"
        class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
      >
        {{ avisoFiltroSinResultados }}
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
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <div class="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-slate-900">Top médicos</p>
              <p class="text-xs text-slate-500 mt-1">Cotizaciones registradas en el periodo</p>
            </div>
            <span class="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full">Top 5</span>
          </div>
          <p v-if="metricasDashboard.top_medicos.length === 0" class="text-sm text-slate-500 mt-6">Sin datos para graficar.</p>
          <div v-else class="mt-4 space-y-3">
            <div v-for="(medico, index) in metricasDashboard.top_medicos" :key="`grafico-medico-${index}`" class="space-y-1">
              <div class="flex items-center justify-between gap-3 text-xs">
                <span class="font-medium text-slate-700 truncate">{{ medico.nombre }}</span>
                <span class="font-semibold text-slate-900">{{ medico.total }}</span>
              </div>
              <div class="h-3 rounded-full bg-slate-200 overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-[#162983] to-indigo-400" :style="{ width: barWidth(medico.total, maxTopMedicos) }"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-indigo-50/40 p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-slate-900">Tipo de gestión</p>
              <p class="text-xs text-slate-500 mt-1">Distribución porcentual de registros</p>
            </div>
            <span class="text-xs font-semibold text-indigo-700 bg-white border border-indigo-100 px-2 py-1 rounded-full">{{ totalCotizacionesAdmin }} total</span>
          </div>
          <div class="mt-5 grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-4 items-center">
            <div class="mx-auto h-36 w-36 rounded-full p-4 shadow-inner" :style="donutGestionStyle">
              <div class="h-full w-full rounded-full bg-white flex flex-col items-center justify-center border border-slate-100">
                <span class="text-2xl font-bold text-[#162983]">{{ totalCotizacionesAdmin }}</span>
                <span class="text-xs text-slate-500">cotizaciones</span>
              </div>
            </div>
            <div class="space-y-2">
              <p v-if="distribucionGestionGrafico.length === 0" class="text-sm text-slate-500">Sin datos para graficar.</p>
              <div v-for="item in distribucionGestionGrafico" :key="`gestion-${item.tipo_gestion}`" class="flex items-center justify-between gap-3 text-xs">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="h-3 w-3 rounded-full shrink-0" :style="{ backgroundColor: item.color }"></span>
                  <span class="font-medium text-slate-700 truncate">{{ item.tipo_gestion || 'Sin tipo' }}</span>
                </div>
                <span class="font-semibold text-slate-900">{{ item.porcentaje }}%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-emerald-50/50 p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-slate-900">Conversión a codificación</p>
              <p class="text-xs text-slate-500 mt-1">Cotizaciones que ya tienen codificación</p>
            </div>
            <span class="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">{{ conversionPercent }}%</span>
          </div>
          <div class="mt-5 flex items-center gap-5">
            <svg class="h-28 w-28 shrink-0 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="48" fill="none" stroke="#e2e8f0" stroke-width="14" />
              <circle cx="60" cy="60" r="48" fill="none" stroke="#059669" stroke-linecap="round" stroke-width="14" :stroke-dasharray="conversionCircunferencia" :stroke-dashoffset="conversionOffset" />
            </svg>
            <div>
              <p class="text-3xl font-bold text-emerald-700">{{ metricasDashboard.conversion.cotizaciones_con_codificacion }}</p>
              <p class="text-sm text-slate-600">de {{ metricasDashboard.conversion.total_cotizaciones }} cotizaciones</p>
              <div class="mt-3 h-2.5 rounded-full bg-emerald-100 overflow-hidden">
                <div class="h-full rounded-full bg-emerald-600" :style="{ width: `${conversionPercent}%` }"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-amber-50/50 p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-slate-900">Entidades por volumen</p>
              <p class="text-xs text-slate-500 mt-1">Cantidad y monto total asociado</p>
            </div>
            <span class="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">Top 5</span>
          </div>
          <p v-if="metricasDashboard.top_entidades.length === 0" class="text-sm text-slate-500 mt-6">Sin datos para graficar.</p>
          <div v-else class="mt-4 space-y-3">
            <div v-for="(entidad, index) in metricasDashboard.top_entidades" :key="`grafico-entidad-${index}`" class="space-y-1">
              <div class="grid grid-cols-[1fr_auto] items-start gap-3 text-xs">
                <span class="font-medium text-slate-700 leading-snug break-words">{{ entidad.nombre || 'Sin entidad' }}</span>
                <span class="font-semibold text-slate-900 whitespace-nowrap">{{ entidad.total }} / {{ formatearMoneda(entidad.monto_total) }}</span>
              </div>
              <div class="h-3 rounded-full bg-slate-200 overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-300" :style="{ width: barWidth(entidad.total, maxTopEntidades) }"></div>
              </div>
            </div>
          </div>
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
          <p class="text-3xl font-bold mt-2" :class="cargandoDashboard ? 'text-slate-400 animate-pulse' : 'text-[#162983]'">{{ cargandoDashboard ? '...' : valorCard(card) }}</p>
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

      <div v-if="roleDashboard.blocks.length || esCajero" class="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 class="text-lg font-semibold text-slate-900 mb-3">Métricas del rol</h2>
        <div v-if="esCajero" class="space-y-3 text-sm text-slate-700">
          <div class="flex items-center justify-between gap-3">
            <p class="font-semibold">Últimas búsquedas en consultas</p>
            <NuxtLink to="/consultas/cotizaciones" class="text-sm font-semibold text-indigo-700 hover:underline">Nueva consulta</NuxtLink>
          </div>
          <p v-if="busquedasRecientes.length === 0" class="text-sm text-slate-500">Aún no hay búsquedas recientes.</p>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <NuxtLink
              v-for="item in busquedasRecientes"
              :key="`${item.documento}-${item.fecha}`"
              :to="`/consultas/cotizaciones?documento=${encodeURIComponent(item.documento)}`"
              class="rounded-xl border border-slate-200 bg-slate-50 p-3 hover:border-indigo-200 hover:bg-indigo-50 transition"
            >
              <p class="font-semibold text-slate-900">Documento {{ item.documento }}</p>
              <p class="text-xs text-slate-500 mt-1">{{ formatearFechaHora(item.fecha) }}</p>
              <p class="text-sm text-slate-600 mt-1">{{ item.resultados }} resultado{{ item.resultados === 1 ? '' : 's' }}</p>
            </NuxtLink>
          </div>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
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

const esAdmin = computed(() => roleDashboard.value.rol === 'administrador')
const esCajero = computed(() => roleDashboard.value.rol === 'cajero')
const busquedasRecientes = ref([])
const periodos = [
  { label: 'Hoy', valor: 'hoy' },
  { label: 'Últimos 7 días', valor: '7d' },
  { label: 'Últimos 30 días', valor: '30d' },
]

const periodoSeleccionado = ref('30d')

const totalCotizacionesAdmin = computed(() => {
  return Number(metricasDashboard.value?.conversion?.total_cotizaciones ?? 0)
})

const ultimaCotizacionTexto = computed(() => formatearFechaHora(metricasDashboard.value?.ultima_cotizacion))
const chartColors = ['#162983', '#4f46e5', '#059669', '#f59e0b', '#dc2626', '#64748b']
const conversionCircunferencia = 2 * Math.PI * 48

const maxTopMedicos = computed(() => {
  return Math.max(...metricasDashboard.value.top_medicos.map((item) => Number(item.total || 0)), 0)
})

const maxTopEntidades = computed(() => {
  return Math.max(...metricasDashboard.value.top_entidades.map((item) => Number(item.total || 0)), 0)
})

const conversionPercent = computed(() => {
  const porcentaje = Number(metricasDashboard.value?.conversion?.porcentaje || 0)
  return Math.min(Math.max(porcentaje, 0), 100)
})

const conversionOffset = computed(() => {
  return conversionCircunferencia - (conversionCircunferencia * conversionPercent.value / 100)
})

const distribucionGestionGrafico = computed(() => {
  return metricasDashboard.value.distribucion_tipo_gestion.map((item, index) => ({
    ...item,
    porcentaje: Math.min(Math.max(Number(item.porcentaje || 0), 0), 100),
    color: chartColors[index % chartColors.length],
  }))
})

const donutGestionStyle = computed(() => {
  if (distribucionGestionGrafico.value.length === 0) {
    return { background: '#e2e8f0' }
  }

  let acumulado = 0
  const segmentos = distribucionGestionGrafico.value.map((item) => {
    const inicio = acumulado
    acumulado += item.porcentaje
    return `${item.color} ${inicio}% ${acumulado}%`
  })

  if (acumulado < 100) segmentos.push(`#e2e8f0 ${acumulado}% 100%`)

  return { background: `conic-gradient(${segmentos.join(', ')})` }
})

const barWidth = (valor, maximo) => {
  const max = Number(maximo?.value ?? maximo ?? 0)
  if (!max) return '0%'
  return `${Math.max(8, Math.round((Number(valor || 0) / max) * 100))}%`
}

const valorCard = (card) => {
  if (card.titulo === 'Última cotización guardada') return formatearFechaHora(card.valor)
  return card.valor
}

const formatearMoneda = (valor) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(valor || 0))
}

const formatearFechaHora = (valor) => {
  if (!valor) return 'Sin registros'
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return String(valor)
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(fecha)
}

const cargarBusquedasRecientes = () => {
  if (import.meta.server) return
  try {
    busquedasRecientes.value = JSON.parse(localStorage.getItem('consultas-cotizaciones-recientes') || '[]')
  } catch {
    busquedasRecientes.value = []
  }
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
  cargarBusquedasRecientes()
  actualizarDashboard(periodoSeleccionado.value)
  console.log('Dashboard montado', {
    roleDashboard: roleDashboard.value,
    metricasDashboard: metricasDashboard.value,
    totalOrdenamientos: totalOrdenamientos.value,
  })
})
</script>
