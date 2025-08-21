<script setup>
definePageMeta({
    middleware: ['sanctum:auth'],
});
import { ref } from 'vue'

const cotizaciones = ref([])
const resetBuscador = ref(false)

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
}

const borrarFiltros = () => {
  cotizaciones.value = []
  resetBuscador.value = !resetBuscador.value // alterna para que el hijo detecte el cambio
}
</script>

<template>
  <div>
    <!-- Pasamos resetBuscador como prop -->
    <QuoterBuscador @resultados="actualizarResultados" :reset="resetBuscador" />

    <div v-for="c in cotizaciones" :key="c.id" class="border p-4 mb-2">
      <p><b>{{ c.codigo }}</b> - {{ formatoFecha(c.created_at) }}</p>
      <NuxtLink :to="`/cotizacion/${c.id}`" class="text-blue-500">Ver detalle</NuxtLink>
    </div>

    <div v-if="cotizaciones.length === 0" class="flex justify-center items-center mt-10">
      <div class="bg-blue-200 p-5 max-w-96 rounded-md shadow-md text-center font-semibold">
        Buscar cotizaciones por el código, documento del paciente o rango de fechas.
      </div>
    </div>

    <div v-if="cotizaciones.length > 0" class="mt-4 flex justify-center items-center">
      <button @click="borrarFiltros" class="bg-red-500 text-white px-3 py-1">
        Borrar Filtros
      </button>
    </div>
  </div>
</template>
