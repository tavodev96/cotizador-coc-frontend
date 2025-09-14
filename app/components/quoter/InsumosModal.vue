<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
      <h3 class="text-lg font-bold mb-4">Selecciona insumo</h3>

      <!-- Buscador -->
      <input v-model="query" @input="buscarInsumos"
             type="text" placeholder="Buscar insumo..."
             class="w-full p-2 border rounded mb-4" />

      <!-- Lista paginada -->
      <div v-for="(insumo, idx) in resultadosPaginados" :key="idx" class="flex items-center mb-2">
        <input type="radio" :id="'insumo-' + idx + '-page-' + paginaActual"
               name="insumoSeleccionado"
               :value="insumo"
               v-model="insumoSeleccionado"
               class="mr-2" />
        <label :for="'insumo-' + idx + '-page-' + paginaActual" class="cursor-pointer">
          {{ insumo.codigo }} - {{ insumo.nombre }} <br/> (Stock: {{ insumo.stock }})
        </label>
      </div>

      <!-- Paginación -->
      <div class="flex justify-between items-center mt-4">
        <button @click="paginaAnterior" :disabled="paginaActual === 1"
                class="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">⬅ Anterior</button>
        <span class="text-sm">Página {{ paginaActual }} de {{ totalPaginas }}</span>
        <button @click="paginaSiguiente" :disabled="paginaActual === totalPaginas"
                class="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">Siguiente ➡</button>
      </div>

      <!-- Botones -->
      <div class="mt-4 flex justify-end gap-2">
        <button @click="$emit('close')" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
        <button @click="confirmar" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                :disabled="!insumoSeleccionado">
          Confirmar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  show: Boolean
})
const emit = defineEmits(['close','select'])

const query = ref('')
const resultados = ref([])
const insumoSeleccionado = ref(null)

const paginaActual = ref(1)
const porPagina = 5

const resultadosPaginados = computed(() => {
  const start = (paginaActual.value - 1) * porPagina
  return resultados.value.slice(start, start + porPagina)
})

const totalPaginas = computed(() =>
  Math.ceil(resultados.value.length / porPagina)
)

const buscarInsumos = async () => {
  try {
    const { data } = await useSanctumFetch(`/api/tarifas/insumos?search=${query.value}`)
    resultados.value = data.value || []
    paginaActual.value = 1
  } catch (err) {
    console.error('❌ Error buscando insumos:', err)
  }
}

const paginaAnterior = () => { if (paginaActual.value > 1) paginaActual.value-- }
const paginaSiguiente = () => { if (paginaActual.value < totalPaginas.value) paginaActual.value++ }

const confirmar = () => {
  if (insumoSeleccionado.value) {
    emit('select', insumoSeleccionado.value)
    insumoSeleccionado.value = null
    query.value = ''
  }
}
</script>
