<script setup>
definePageMeta({
  middleware: ['sanctum:auth'],
});

const cotizaciones = ref([])
const resetBuscador = ref(false)
const busquedaRealizada = ref(false)

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

const nombrePaciente = (cotizacion) => {
  const paciente = cotizacion?.paciente || {}
  return paciente.nombre_completo || `${paciente.nombres || ''} ${paciente.apellidos || ''}`.trim() || 'Sin nombre'
}

const borrarFiltros = () => {
  cotizaciones.value = []
  resetBuscador.value = !resetBuscador.value
  busquedaRealizada.value = false
};
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-5">
    <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
      <QuoterBuscador @resultados="actualizarResultados" :reset="resetBuscador" />
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

    <div v-if="cotizaciones.length" class="grid grid-cols-1 gap-3">
      <article
        v-for="c in cotizaciones"
        :key="c.id"
        class="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow"
      >
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div class="space-y-1">
            <p class="text-slate-900 font-semibold">{{ c.codigo }}</p>
            <p class="text-sm text-slate-600">{{ formatoFecha(c.created_at) }}</p>
            <p class="text-sm text-slate-700">
              Paciente: <span class="font-medium text-slate-900">{{ nombrePaciente(c) }}</span>
            </p>
            <p class="text-sm text-slate-700">Identificación: {{ c.paciente?.numero_identificacion || 'N/A' }}</p>
          </div>

          <div class="flex items-center gap-2 flex-wrap md:justify-end">
            <span class="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wide">
              {{ c.estado?.nombre || 'Sin estado' }}
            </span>
            <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-wide">
              {{ c.tipo_gestion || 'Sin tipo' }}
            </span>
          </div>
        </div>

        <div class="mt-4">
          <NuxtLink
            :to="`/cotizacion/${c.id}`"
            class="inline-flex items-center h-9 px-3 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Ver detalle
          </NuxtLink>
        </div>
      </article>
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
