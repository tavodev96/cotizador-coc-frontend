<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
      <h3 class="text-lg font-bold mb-4">Selecciona lentes</h3>

      <!-- Buscador -->
      <input v-model="search" @input="handleSearch" type="text" placeholder="Buscar lente..."
        class="w-full p-2 border rounded mb-4" />

      <!-- Lista paginada -->
      <div v-for="(lente, idx) in items" :key="lente.id" class="flex items-center mb-2">
        <input type="checkbox" :id="'lente-' + lente.id" :value="lente" v-model="lentesSeleccionados" class="mr-2" />
        <label :for="'lente-' + lente.id" class="cursor-pointer">
          {{ lente.codigo }} - {{ lente.nombre }} <br /> (Stock: {{ lente.stock }}) - ${{
            lente.valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) }}
        </label>
      </div>

      <!-- Paginación -->
      <div class="flex justify-between items-center mt-4">
        <button @click="changePage(pagination.page - 1)" :disabled="pagination.page === 1"
          class="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">⬅ Anterior</button>
        <span class="text-sm">Página {{ pagination.page }} de {{ pagination.last_page }}</span>
        <button @click="changePage(pagination.page + 1)" :disabled="pagination.page === pagination.last_page"
          class="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">Siguiente ➡</button>
      </div>

      <!-- Botones -->
      <div class="mt-4 flex justify-between">
        <button @click="deseleccionarTodos" class="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
          Deseleccionar todos
        </button>

        <div class="flex gap-2">
          <button @click="$emit('close')" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
          <button @click="confirmar" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            :disabled="lentesSeleccionados.length === 0">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  show: Boolean,
})
const emit = defineEmits(['close', 'select'])

// composable de lentes
const { items, pagination, search, fetchTarifas } = useTarifas('lentes')

const lentesSeleccionados = ref<any[]>([])

onMounted(() => {
  pagination.value.per_page = 5
  fetchTarifas()
})

const handleSearch = () => {
  pagination.value.page = 1
  fetchTarifas()
}

const changePage = (page: number) => {
  if (page >= 1 && page <= pagination.value.last_page) {
    pagination.value.page = page
    fetchTarifas()
  }
}

const confirmar = () => {
  if (lentesSeleccionados.value.length > 0) {
    emit('select', lentesSeleccionados.value)
    lentesSeleccionados.value = []
    search.value = ''
  }
}

const deseleccionarTodos = () => {
  lentesSeleccionados.value = []
}
</script>
