<script setup lang="ts">
const { items, pagination, search, concepto, loading, fetchTarifas } = useTarifas('procedimientos')

onMounted(() => {
  fetchTarifas()
})

const handleSearch = () => {
  pagination.value.page = 1
  fetchTarifas()
}
const clearFilters = () => {
  search.value = ''
  concepto.value = ''
  pagination.value.page = 1
  fetchTarifas()
}
const changePage = (page: number) => {
  pagination.value.page = page
  fetchTarifas()
}
</script>

<template>
  <div class="p-6">
    <!-- Buscador y botón refrescar -->
    <div class="flex gap-2 mb-4">
      <input v-model="search" type="text" placeholder="Buscar por código o nombre..."
        class="border rounded p-2 w-1/3" />
      <select v-model="concepto" @change="fetchData()" class="border p-2 rounded">
        <option value="" disabled selected>-- Seleccione un concepto --</option>
        <option value="DP">Derechos clínicos</option>
        <option value="HM">Honorarios médicos</option>
        <option value="HA">Anestesiología</option>
        <!-- ... puedes poblarlos dinámicamente desde backend -->
      </select>
      <button @click="handleSearch" class="bg-blue-500 text-white px-4 py-2 rounded">
        Buscar
      </button>
      <button v-if="search || concepto" @click="clearFilters" class="bg-red-500 text-white px-4 py-2 rounded">
        Limpiar filtros
      </button>

      <button @click="fetchTarifas" class="bg-gray-500 text-white px-4 py-2 rounded">
        Refrescar
      </button>
    </div>

    <!-- Tabla -->
    <table class="table-auto w-full border-collapse border border-gray-300">
      <thead class="bg-gray-100">
        <tr>
          <!-- <th class="border p-2">ID</th> -->
          <th class="border p-2">Código</th>
          <th class="border p-2">Nombre</th>
          <th class="border p-2">Tarifa</th>
          <th class="border p-2">Nombre Tarifa</th>
          <th class="border p-2">Concepto</th>
          <th class="border p-2">Nombre Concepto</th>
          <th class="border p-2">Valor</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <!-- <td class="border p-2">{{ item.id }}</td> -->
          <td class="border p-2">{{ item.codigo }}</td>
          <td class="border p-2">{{ item.nombre }}</td>
          <td class="border p-2">{{ item.tarifa }}</td>
          <td class="border p-2">{{ item.nombre_tarifa }}</td>
          <td class="border p-2">{{ item.concepto }}</td>
          <td class="border p-2">{{ item.nombre_concepto }}</td>
          <td class="border p-2">{{ item.valor }}</td>
        </tr>
        <tr v-if="!loading && (!items || items.length === 0)">
          <td colspan="3" class="text-center p-4">No se encontraron resultados</td>
        </tr>
      </tbody>
    </table>

    <!-- Paginación -->
    <div class="flex justify-between items-center mt-4">
      <button :disabled="pagination.page === 1" @click="changePage(pagination.page - 1)"
        class="px-3 py-1 bg-gray-300 rounded disabled:opacity-50">
        Anterior
      </button>

      <span>
        Página {{ pagination.page }} de {{ pagination.last_page }} ({{ pagination.total }} registros)
      </span>

      <button :disabled="pagination.page === pagination.last_page" @click="changePage(pagination.page + 1)"
        class="px-3 py-1 bg-gray-300 rounded disabled:opacity-50">
        Siguiente
      </button>
    </div>
  </div>
</template>
