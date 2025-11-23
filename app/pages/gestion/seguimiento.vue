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

const borrarFiltros = () => {
  cotizaciones.value = []
  resetBuscador.value = !resetBuscador.value
  busquedaRealizada.value = false
};
</script>

<template>
  <div>
    <!-- Pasamos resetBuscador como prop -->
    <QuoterBuscador @resultados="actualizarResultados" :reset="resetBuscador" />

    <div v-for="c in cotizaciones" :key="c.id" class="border p-4 mb-2">
      <p><b>{{ c.codigo }}</b> - {{ formatoFecha(c.created_at) }}</p>
      <p>Paciente: {{ c.paciente.nombre_completo }}- Identificación: {{ c.paciente.numero_identificacion }}</p>
      <p class="bg-blue-900 w-fit text-white py-1 px-2 rounded-full uppercase text-xs font-bold">{{ c.estado.nombre }}
      </p>
      <NuxtLink :to="`/cotizacion/${c.id}`" class="text-blue-500">Ver detalle</NuxtLink>
    </div>

    <div>
      <div v-if="busquedaRealizada && cotizaciones.length === 0" class="flex justify-center items-center mt-10">
        <div
          class="flex flex-col justify-center items-center bg-red-700 p-5 max-w-[400px] rounded-md shadow-md text-center font-semibold">
          <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"
            viewBox="0 0 24 24"><!-- Icon from TDesign Icons by TDesign - https://github.com/Tencent/tdesign-icons/blob/main/LICENSE -->
            <path fill="none" stroke="#ffffff" stroke-linecap="square" stroke-width="2"
              d="M15.803 15.803A7.5 7.5 0 1 0 3 10.503m12.803 5.3l5.304 5.304m-5.304-5.304A7.48 7.48 0 0 1 10.5 18m-8.828-3.328L4.5 17.5m0 0l2.829 2.828M4.5 17.5l-2.828 2.828M4.5 17.5l2.829-2.828" />
          </svg>
          <span class="text-white">No se encontraron cotizaciones con los filtros aplicados.</span>
        </div>
      </div>
    </div>
    <div v-show="!busquedaRealizada" v-if="cotizaciones.length === 0" class="flex justify-center items-center mt-10">
      <div
        class="flex flex-col justify-center items-center bg-[#162983] p-5 max-w-[400px] rounded-md shadow-md text-center font-semibold">
        <svg xmlns="http://www.w3.org/2000/svg" width="70" height="70"
          viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE -->
          <path fill="#ffffff"
            d="M3 19q-.425 0-.712-.288T2 18t.288-.712T3 17h8q.425 0 .713.288T12 18t-.288.713T11 19zm0-5q-.425 0-.712-.288T2 13t.288-.712T3 12h3q.425 0 .713.288T7 13t-.288.713T6 14zm0-5q-.425 0-.712-.288T2 8t.288-.712T3 7h3q.425 0 .713.288T7 8t-.288.713T6 9zm11 7q-2.075 0-3.537-1.463T9 11t1.463-3.537T14 6t3.538 1.463T19 11q0 .725-.213 1.438t-.637 1.312l3.15 3.15q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-3.15-3.15q-.6.425-1.312.638T14 16m0-2q1.25 0 2.125-.875T17 11t-.875-2.125T14 8t-2.125.875T11 11t.875 2.125T14 14" />
        </svg>
        <span class="text-white">Buscar cotizaciones por el código de cotización, documento del paciente o rango de
          fechas.</span>
      </div>
    </div>

    <div v-if="cotizaciones.length > 0 || busquedaRealizada" class="mt-4 flex justify-center items-center">
      <button @click="borrarFiltros" class="bg-red-500 text-white px-3 py-1">
        Borrar Filtros
      </button>
    </div>
  </div>
</template>
