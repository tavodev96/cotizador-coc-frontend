type SyncPipeline =
  | 'all'
  | 'sync_informix'
  | 'procedimientos'
  | 'insumos'
  | 'lentes'
  | 'medicos_identificacion'
  | 'consultorios_codigos'
  | 'crear_medicos'
  | 'recursos_consultorios'
  | 'pacientes_informix'
  | 'pacientes_nuevos_informix'

type SyncStatus = {
  running: boolean
  pipeline: SyncPipeline | null
  started_at: string | null
  finished_at: string | null
  started_by: { id: number; name: string } | null
  progress: {
    current: number
    total: number
    percent: number
    current_step: string | null
  }
  message: string | null
  steps: Array<{
    key: string
    label: string
    status: 'pending' | 'running' | 'done' | 'failed'
    output: string | null
  }>
  last_error: string | null
}

type SyncHistoryItem = {
  id: number
  pipeline: SyncPipeline | string
  status: 'running' | 'success' | 'failed' | 'aborted' | string
  started_at: string | null
  finished_at: string | null
  started_by: { id: number | null; name: string } | null
  progress: {
    current: number
    total: number
    percent: number
    current_step: string | null
  }
  message: string | null
  last_error: string | null
  duration_seconds: number | null
  steps: Array<{
    key: string
    label: string
    status: 'pending' | 'running' | 'done' | 'failed' | string
    output: string | null
  }>
  created_at: string | null
}

type SyncHistoryFilters = {
  status?: string
  pipeline?: string
  date_from?: string
  date_to?: string
  per_page?: number
  page?: number
}

type SyncHistoryMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

const defaultStatus = (): SyncStatus => ({
  running: false,
  pipeline: null,
  started_at: null,
  finished_at: null,
  started_by: null,
  progress: {
    current: 0,
    total: 0,
    percent: 0,
    current_step: null,
  },
  message: null,
  steps: [],
  last_error: null,
})

export const useSyncManagement = () => {
  const status = useState<SyncStatus>('sync-management-status', defaultStatus)
  const history = useState<SyncHistoryItem[]>('sync-management-history', () => [])
  const historyMeta = useState<SyncHistoryMeta | null>('sync-management-history-meta', () => null)
  const loading = ref(false)
  const historyLoading = ref(false)
  const runningAction = ref(false)
  const lastCompletedAt = useState<string | null>('sync-management-last-completed', () => null)

  const client = useSanctumClient()

  const fetchStatus = async () => {
    loading.value = true
    try {
      const data = await client('/api/sync/status', {
        method: 'GET',
      })

      status.value = {
        ...defaultStatus(),
        ...(data || {}),
      }
    } catch (error) {
      console.error('Error consultando estado de sincronización:', error)
    } finally {
      loading.value = false
    }
  }

  const fetchHistory = async (filters: SyncHistoryFilters = {}) => {
    historyLoading.value = true
    try {
      const params = new URLSearchParams()
      if (filters.status)    params.set('status', filters.status)
      if (filters.pipeline)  params.set('pipeline', filters.pipeline)
      if (filters.date_from) params.set('date_from', filters.date_from)
      if (filters.date_to)   params.set('date_to', filters.date_to)
      if (filters.per_page)  params.set('per_page', String(filters.per_page))
      if (filters.page)      params.set('page', String(filters.page))

      const qs = params.toString()
      const data = await client(`/api/sync/history${qs ? '?' + qs : ''}`, {
        method: 'GET',
      }) as { data?: SyncHistoryItem[]; meta?: SyncHistoryMeta }

      history.value = Array.isArray(data?.data) ? data.data : []
      historyMeta.value = data?.meta ?? null
    } catch (error) {
      console.error('Error consultando historial de sincronizacion:', error)
    } finally {
      historyLoading.value = false
    }
  }

  const runPipeline = async (pipeline: SyncPipeline) => {
    runningAction.value = true
    try {
      const data = await client('/api/sync/run', {
        method: 'POST',
        body: { pipeline },
      }) as { status?: Partial<SyncStatus> }

      status.value = {
        ...defaultStatus(),
        ...(data?.status || {}),
      }

      return { ok: true, data }
    } catch (error: any) {
      const message = error?.data?.message || 'No se pudo iniciar la sincronización.'
      return { ok: false, message }
    } finally {
      runningAction.value = false
    }
  }

  const abortSync = async () => {
    runningAction.value = true
    try {
      const data = await client('/api/sync/abort', {
        method: 'POST',
      }) as { message?: string; status?: SyncStatus }

      if (data?.status) {
        status.value = { ...defaultStatus(), ...data.status }
      }

      return { ok: true, message: data?.message || 'Proceso abortado.' }
    } catch (error: any) {
      return { ok: false, message: error?.data?.message || 'No se pudo abortar el proceso.' }
    } finally {
      runningAction.value = false
    }
  }

  return {
    status,
    history,
    historyMeta,
    loading,
    historyLoading,
    runningAction,
    lastCompletedAt,
    fetchStatus,
    fetchHistory,
    runPipeline,
    abortSync,
  }
}
