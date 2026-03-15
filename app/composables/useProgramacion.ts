type ProgramacionQuery = {
  fechaInicial?: string
  fechaFinal?: string
  codigoMedico?: string
  estado?: string
}

type ProgramacionItem = {
  id?: number | string
  nombre_completo?: string
  identificacion?: string
  direccion?: string
  telefono?: string
  hora_procedimiento?: string
  duracion?: number | string
  fecha_procedimiento?: string
  codigo_medico?: string
  medico?: string
  nombre_medico?: string
  medico_nombre?: string
  estado?: string
}

export function useProgramacion() {
  const cirugias = ref<any[]>([])
  const loading = ref(false)
  const error = ref<unknown>(null)
  const total = ref(0)

  const fetchProgramacion = async ({ fechaInicial, fechaFinal, codigoMedico, estado }: ProgramacionQuery = {}) => {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      if (fechaInicial) params.set('fecha_inicial', fechaInicial)
      if (fechaFinal) params.set('fecha_final', fechaFinal)
      if (codigoMedico) params.set('codigo_medico', codigoMedico)
      if (estado) params.set('estado', estado)

      const { data, error: fetchError } = await useSanctumFetch(`/api/cirugias?${params.toString()}`, {
        method: 'GET',
      })

      if (fetchError.value) {
        console.error('Error cargando programación:', fetchError.value)
        loading.value = false
        return
      }

      const meta = (data.value as { total?: number } | null) || {}
      total.value = Number(meta.total || 0)

      const items = (data.value as { items?: ProgramacionItem[] } | null)?.items || []

      cirugias.value = items.map((item: ProgramacionItem) => {
        const hora = String(item.hora_procedimiento || '00:00').slice(0, 5)
        const startDate = new Date(`${item.fecha_procedimiento}T${hora}:00`)
        const duracion = Number(item.duracion || 30)
        const endDate = new Date(startDate.getTime() + duracion * 60000)

        function toLocalISO(date: Date) {
          const offsetMs = date.getTimezoneOffset() * 60000
          const local = new Date(date.getTime() - offsetMs)
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
          codigoMedico: item.codigo_medico || '',
          medico: item.nombre_medico || item.medico || item.medico_nombre || '',
          direccion: item.direccion || '',
          telefono: item.telefono || '',
          duracion,
          estado: item.estado || '',
          raw: item,
        }
      })



    } catch (err) {
      console.error('Error al cargar cirugías:', err)
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { cirugias, loading, error, total, fetchProgramacion }
}
