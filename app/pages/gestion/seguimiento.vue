<script setup>
definePageMeta({
  middleware: ['sanctum:auth'],
});

const router = useRouter()
const route = useRoute()

const cotizaciones = ref([])
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

const hayFiltrosDashboard = computed(() => {
  return Boolean(
    route.query.asesor_id ||
    route.query.estado_id ||
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
  resetBuscador.value = !resetBuscador.value
  busquedaRealizada.value = false
  actualizarPagination({ current_page: 1, last_page: 1, per_page: 10, total: 0 })
  router.replace({ path: route.path, query: {} })
};
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-5">
    <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
      <QuoterBuscador ref="buscadorRef" @resultados="actualizarResultados" @pagination="actualizarPagination" @loading="actualizarLoading" :reset="resetBuscador" />
    </div>

    <div
      v-if="cargandoBusqueda && hayFiltrosDashboard"
      class="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-700 animate-pulse"
    >
      Aplicando filtros del dashboard y cargando resultados...
    </div>

    <div class="flex items-center justify-between gap-3">
      <div class="text-sm text-slate-600">
        <span v-if="busquedaRealizada">{{ cotizaciones.length }} resultado{{ cotizaciones.length === 1 ? '' : 's' }}</span>
        <span v-else>Aplica filtros para consultar cotizaciones</span>
      </div>

      <button
        v-if="cotizaciones.length > 0 || busquedaRealizada"
        @click="borrarFiltros"
        class="h-10 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
      >
        Borrar filtros
      </button>
    </div>

    <div v-if="cotizaciones.length" class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-sm font-semibold text-slate-900">Resultados de seguimiento</p>
          <p class="text-xs text-slate-500">Revisa, imprime o edita cada cotización desde la misma tabla.</p>
        </div>
        <span class="w-fit rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
          {{ pagination.total }} registro{{ pagination.total === 1 ? '' : 's' }}
        </span>
      </div>

      <div class="overflow-x-auto">
      <table class="min-w-[1180px] w-full text-sm border-collapse">
        <thead class="bg-[#172a83] text-white">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Fecha de<br>creación</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Consecutivo</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Nombre del<br>paciente</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Identificación</th>
            <th class="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide">Estado<br>base</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Médico</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Estado de<br>gestión</th>
            <th class="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide">Días</th>
            <th class="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="c in cotizaciones" :key="c.id" class="hover:bg-indigo-50/40 transition-colors">
            <td class="px-4 py-3 whitespace-nowrap text-slate-700">{{ fechaCorta(c.created_at) }}</td>
            <td class="px-4 py-3 whitespace-nowrap font-bold text-slate-950">{{ c.codigo }}</td>
            <td class="px-4 py-3 font-semibold text-slate-950">{{ nombrePaciente(c) }}</td>
            <td class="px-4 py-3 whitespace-nowrap text-slate-700">{{ c.paciente?.numero_identificacion || 'N/A' }}</td>
            <td class="px-4 py-3 text-center">
              <span class="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase text-indigo-700 ring-1 ring-indigo-200">
                {{ c.estado?.nombre || 'Sin estado' }}
              </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-slate-700">{{ c.medico?.nombre || 'N/A' }}</td>
            <td class="px-4 py-3 text-slate-700">{{ c.estado_gestion?.nombre || 'Sin gestión' }}</td>
            <td class="px-4 py-3 text-center">
              <span
                v-if="c.vigencia?.mostrar !== false"
                class="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-bold ring-2 ring-white shadow-sm"
                :class="claseDiasObservacion(c)"
                :title="c.vigencia?.label || ''"
              >
                {{ diasObservacion(c) }}
              </span>
              <span v-else>-</span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-2 whitespace-nowrap">
                <NuxtLink :to="`/cotizacion/${c.id}`" title="Ver detalle" class="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-white hover:border-indigo-300">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5c5.5 0 9 5.3 9 7s-3.5 7-9 7s-9-5.3-9-7s3.5-7 9-7m0 2c-4 0-6.8 3.8-7 5c.2 1.2 3 5 7 5s6.8-3.8 7-5c-.2-1.2-3-5-7-5m0 2.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 0 1 0-5"/></svg>
                </NuxtLink>
                <NuxtLink :to="`/cotizacion/imprimir/${c.id}`" title="Imprimir cotización" class="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 9V3h12v6h1a3 3 0 0 1 3 3v5h-4v4H6v-4H2v-5a3 3 0 0 1 3-3zm2 0h8V5H8zm0 10h8v-5H8zm11-4v-3a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v3h1v-3h12v3z"/></svg>
                </NuxtLink>
                <NuxtLink :to="`/cotizacion/editar/${c.id}`" title="Editar" class="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-indigo-700 text-white hover:bg-indigo-800">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="m5 16.2l9.9-9.9l2.8 2.8L7.8 19H5zm11.3-11.3l1.1-1.1a1.5 1.5 0 0 1 2.1 0l.7.7a1.5 1.5 0 0 1 0 2.1l-1.1 1.1z"/></svg>
                </NuxtLink>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
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
  </div>
</template>

