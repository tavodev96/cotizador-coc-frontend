export function useCirugias() {
  const cirugias = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchCirugias = async () => {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await useSanctumFetch('/api/cirugias', {
        method: 'GET',
      })

      if (error.value) {
        console.error('Error cargando datos:', error.value)
        loading.value = false
        return
      }

      cirugias.value = (data.value || []).map(item => {
        const startDate = new Date(`${item.fecha_procedimiento}T${item.hora_procedimiento}:00`)
        const duracion = Number(item.duracion || 30)
        const endDate = new Date(startDate.getTime() + duracion * 60000)

        function toLocalISO(date) {
          const offsetMs = date.getTimezoneOffset() * 60000
          const local = new Date(date - offsetMs)
          return local.toISOString().slice(0, 19)
        }

        // ✅ Convertir a string ISO que Vue Cal sí entiende
        const start = toLocalISO(startDate)
        const end = toLocalISO(endDate)

        return {
          start,
          end,
          title: item.nombre_completo,
          content: item.identificacion || '',
          color: '#0e5597',
        }
      })



    } catch (err) {
      console.error('Error al cargar cirugías:', err)
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { cirugias, loading, error, fetchCirugias }
}
