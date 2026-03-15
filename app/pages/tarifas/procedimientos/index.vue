<script setup lang="ts">
definePageMeta({
    middleware: ['sanctum:auth'],
})

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

const formatMoney = (v: number | string) => {
  const n = Number(v) || 0
  return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
</script>

<template>
  <div class="space-y-5">
    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5 space-y-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Tarifas de procedimientos</h1>
        <p class="text-sm text-slate-600 mt-1">Consulta y filtra procedimientos tarifarios.</p>
      </div>

      <div class="flex flex-col xl:flex-row gap-3">
      <input v-model="search" type="text" placeholder="Buscar por código o nombre..."
        class="h-11 border border-slate-300 rounded-lg px-3 w-full xl:w-1/3 bg-white" />
      <select v-model="concepto" @change="fetchTarifas()" class="h-11 border border-slate-300 rounded-lg px-3 bg-white">
        <option value="" disabled selected>-- Seleccione un concepto --</option>
        <option value="DP">Derechos clínicos</option>
        <option value="HM">Honorarios médicos</option>
        <option value="HA">Anestesiología</option>
      </select>
      <button @click="handleSearch" class="h-11 bg-indigo-700 text-white px-4 py-2 rounded-lg">
        Buscar
      </button>
      <button v-if="search || concepto" @click="clearFilters" class="h-11 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg">
        Limpiar filtros
      </button>

      <button @click="fetchTarifas" class="h-11 bg-slate-700 text-white px-4 py-2 rounded-lg">
        Refrescar
      </button>
      </div>
    </section>

    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 overflow-x-auto">
    <table class="table-auto w-full border-collapse border border-slate-200">
      <thead class="bg-gray-100">
        <tr>
          <th class="border border-slate-200 p-2">Código</th>
          <th class="border border-slate-200 p-2">Nombre</th>
          <th class="border border-slate-200 p-2">Tarifa</th>
          <th class="border border-slate-200 p-2">Nombre Tarifa</th>
          <th class="border border-slate-200 p-2">Concepto</th>
          <th class="border border-slate-200 p-2">Nombre Concepto</th>
          <th class="border border-slate-200 p-2">Valor</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td class="border border-slate-200 p-2">{{ item.codigo }}</td>
          <td class="border border-slate-200 p-2">{{ item.nombre }}</td>
          <td class="border border-slate-200 p-2">{{ item.tarifa }}</td>
          <td class="border border-slate-200 p-2">{{ item.nombre_tarifa }}</td>
          <td class="border border-slate-200 p-2">{{ item.concepto }}</td>
          <td class="border border-slate-200 p-2">{{ item.nombre_concepto }}</td>
          <td class="border border-slate-200 p-2">{{ formatMoney(item.valor) }}</td>
        </tr>
        <tr v-if="!loading && (!items || items.length === 0)">
          <td colspan="3" class="text-center p-4">No se encontraron resultados</td>
        </tr>
      </tbody>
    </table>

    <!-- Paginación -->
    <div class="flex justify-between items-center mt-4">
      <button :disabled="pagination.page === 1" @click="changePage(pagination.page - 1)"
        class="px-3 py-2 bg-slate-200 rounded-lg disabled:opacity-50">
        Anterior
      </button>

      <span>
        Página {{ pagination.page }} de {{ pagination.last_page }} ({{ pagination.total }} registros)
      </span>

      <button :disabled="pagination.page === pagination.last_page" @click="changePage(pagination.page + 1)"
        class="px-3 py-2 bg-slate-200 rounded-lg disabled:opacity-50">
        Siguiente
      </button>
    </div>
    </section>
  </div>
</template>
