<script setup>
const route = useRoute()
const cotizacion = ref(null)

onMounted(async () => {
  const { data, error } = await useSanctumFetch(`/api/cotizacion/${route.params.id}`)
  if (error.value) {
    console.error('Error fetching cotizacion:', error.value)
  } else {
    cotizacion.value = data.value.cotizacion
  }
  console.log(cotizacion.value);
  
})

// Formatear valores con separador de miles
const formatMoney = (num) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(num)
}
</script>

<template>
  <div class="p-8 bg-white text-black">
    <!-- Encabezado -->
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold">Cotización</h1>
      <p class="text-gray-600">N° {{ cotizacion?.codigo }}</p>
    </div>

    <!-- Información general -->
    <div class="mb-6">
      <p><b>Cliente:</b> {{ cotizacion?.paciente?.nombre_completo }}</p>
      <p><b>Fecha:</b> {{ cotizacion?.fecha_recepcion }}</p>
    </div>

    <!-- Detalles -->
    <table class="w-full border-collapse border border-gray-400 text-sm">
      <thead class="bg-gray-200">
        <tr>
          <th class="border border-gray-400 px-2 py-1">Código</th>
          <th class="border border-gray-400 px-2 py-1">Nombre</th>
          <th class="border border-gray-400 px-2 py-1">Tipo</th>
          <th class="border border-gray-400 px-2 py-1 text-right">Valor</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="detalle in cotizacion?.detalles" :key="detalle.id">
          <td class="border border-gray-400 px-2 py-1">{{ detalle.codigo }}</td>
          <td class="border border-gray-400 px-2 py-1">{{ detalle.nombre }}</td>
          <td class="border border-gray-400 px-2 py-1">
            <span v-if="detalle.tipo === 'L'">(Lente)</span>
            <span v-else-if="detalle.tipo === 'I'">(Insumo)</span>
          </td>
          <td class="border border-gray-400 px-2 py-1 text-right">
            {{ formatMoney(detalle.valor) }}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Total -->
    <div class="mt-6 text-right">
      <p class="text-lg font-bold">
        Total: {{ formatMoney(cotizacion?.total) }}
      </p>
    </div>

    <!-- Botón imprimir -->
    <div class="mt-6 text-center">
      <button class="bg-blue-600 text-white px-4 py-2 rounded" @click="window.print()">
        Imprimir
      </button>
    </div>
  </div>
</template>
