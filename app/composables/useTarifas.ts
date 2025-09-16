// composables/useTarifas.ts
export const useTarifas = (type: string) => {
  const items = ref<any[]>([])
  const loading = ref(false)
  const pagination = ref({
    page: 1,
    per_page: 10,
    last_page: 1,
    total: 0,
  })
  const search = ref('')
  const concepto = ref('')

  const fetchTarifas = async () => {
    loading.value = true
    try {
      const { data } = await useSanctumFetch(`/api/tarifas/${type}`, {
        method: 'GET',
        query: {
          page: pagination.value.page,
          per_page: pagination.value.per_page,
          search: search.value,
          concepto: concepto.value,
        }
      })

      if (data.value) {
        items.value = data.value.data ?? []   // <- si no existe, vacío
        pagination.value = {
          page: data.value.current_page ?? 1,
          per_page: data.value.per_page ?? 10,
          last_page: data.value.last_page ?? 1,
          total: data.value.total ?? 0,
        }
      }

    } finally {
      loading.value = false
    }
  }

  return { items, pagination, search, concepto, loading, fetchTarifas }
}
