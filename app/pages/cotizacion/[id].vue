<script setup>
definePageMeta({
  middleware: ['sanctum:auth'],
});

import { Notivue, Notification, filledIcons } from 'notivue'
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()

const apiBase = config.public.apiBase?.replace('/api', '') || 'http://localhost:8000'
const fileUrl = (path) => `${apiBase}/storage/${path}`

const cotizacion = ref(null)
const estadosAdministrativos = ref([]);
const estadosGestion = ref([])
const estadoSeleccionado = ref(null)
const estadoGestionSeleccionado = ref(null)
const comentarioEstadoGestion = ref('')
const nuevoComentario = ref('')
const archivos = ref([])
const historico_estados = ref([])
const mostrarModalHistorico = ref(false)
const mostrarModalVigencia = ref(false)
const savingComentario = ref(false)
const loading = ref(true)
const loadingEstados = ref(false)
const loadingEstadoGestion = ref(false)
const savingPriority = ref(false)
const syncingSalesforce = ref(false)
const lastSalesforceLog = ref(null)
const canSyncSalesforce = ref(false)
const auditoriaLogs = ref([])
const loadingAuditoriaLogs = ref(false)

const checkSalesforcePermission = () => {
  const user = useUserStore?.()
  if (user && user.permissions) {
    canSyncSalesforce.value = user.permissions.includes('integraciones.salesforce.sincronizar')
  }
}

const intendedEstado = ref(null)
const mostrarModalComentario = ref(false)
const estadoSeleccionadoTemp = ref(null)
const fechaProgramadaTemp = ref('')

const normalizarFechaInput = (value) => {
  if (!value) return ''
  return String(value).slice(0, 10)
}

const fechaHoyInput = () => {
  const hoy = new Date()
  const yyyy = hoy.getFullYear()
  const mm = String(hoy.getMonth() + 1).padStart(2, '0')
  const dd = String(hoy.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const horaActualInput = () => {
  const ahora = new Date()
  ahora.setMinutes(ahora.getMinutes() + 1)
  return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
}

const horaProgramadaParaFecha = (fecha) => {
  if (!fecha) return null
  return fecha === fechaHoyInput() ? horaActualInput() : '00:00'
}

const fetchDetalle = async () => {
  try {
    const { data, error } = await useSanctumFetch(`/api/cotizacion/${route.params.id}`)

    if (error.value) {
      console.error('Error en fetchDetalle:', error.value)
      return
    }

    // Asignar los datos con un pequeño delay para asegurar reactividad
    cotizacion.value = { ...data.value.cotizacion }
    lastSalesforceLog.value = data.value.cotizacion.salesforce_last_log || null
    historico_estados.value = [...data.value.estados]
    estadosGestion.value = Array.isArray(data.value.estados_gestion) ? data.value.estados_gestion : []
    estadoSeleccionado.value = cotizacion.value.estado_id
    estadoSeleccionadoTemp.value = cotizacion.value.estado_id
    estadoGestionSeleccionado.value = cotizacion.value.estado_gestion_id || ''
    fechaProgramadaTemp.value = normalizarFechaInput(cotizacion.value.fecha_programada)

  } catch (err) {
    console.error('Error capturado en fetchDetalle:', err)
  }
}

const fetchAuditoriaLogs = async () => {
  loadingAuditoriaLogs.value = true
  const { data, error } = await useSanctumFetch(`/api/auditoria/cotizacion/${route.params.id}`)

  if (!error.value && data.value) {
    auditoriaLogs.value = Array.isArray(data.value) ? data.value : []
  }

  loadingAuditoriaLogs.value = false
}

const fetchEstados = async () => {
  const { data } = await useSanctumFetch('/api/estados/cotizacion', { method: 'GET' })
  const lista = Array.isArray(data.value) ? data.value : []
  estadosAdministrativos.value = lista
    .filter((estado) => String(estado?.nombre || '').toUpperCase().trim() !== 'ANULADA')
    .sort((a, b) => a.orden - b.orden)
}

const togglePrioridad = async () => {
  if (!cotizacion.value || savingPriority.value) return

  savingPriority.value = true

  try {
    const { data, error } = await useSanctumFetch(`/api/cotizacion/${route.params.id}/prioridad`, {
      method: 'PUT',
      body: {
        es_prioritaria: !cotizacion.value.es_prioritaria,
      }
    })

    if (error.value || !data.value?.success) {
      pushNotification('error', 'No se pudo actualizar la prioridad', 'Error')
      return
    }

    cotizacion.value = {
      ...cotizacion.value,
      es_prioritaria: data.value.cotizacion?.es_prioritaria ?? !cotizacion.value.es_prioritaria,
    }

    pushNotification('success', data.value?.message || 'Prioridad actualizada correctamente', 'Exito')
  } catch (error) {
    console.error('Error al actualizar prioridad:', error)
    pushNotification('error', 'No se pudo actualizar la prioridad', 'Error')
  } finally {
    savingPriority.value = false
  }
}


const pushNotification = (type, message, title) => {
  push[type]({
    title: title,
    message: message,
    ariaRole: 'alert'
  })
}

const syncSalesforce = async () => {
  if (syncingSalesforce.value) return
  syncingSalesforce.value = true

  try {
    const { data, error } = await useSanctumFetch(`/api/salesforce/sync/${route.params.id}`, { method: 'POST' })

    if (error.value) {
      pushNotification('error', 'No se pudo encolar la sincronización con Salesforce', 'Error')
    } else {
      pushNotification('success', 'Sincronización encolada correctamente', 'Éxito')
      // Cargar el log más reciente
      await fetchLastSalesforceLog()
    }
  } catch (e) {
    console.error('Error al sincronizar con Salesforce:', e)
    pushNotification('error', 'Excepción al sincronizar con Salesforce', 'Error')
  } finally {
    syncingSalesforce.value = false
  }
}

const fetchLastSalesforceLog = async () => {
  try {
    const { data } = await useSanctumFetch(`/api/salesforce/logs/${route.params.id}/last`)
    if (data.value?.data) {
      lastSalesforceLog.value = data.value.data
    }
  } catch (e) {
    console.error('Error al cargar último log de Salesforce:', e)
  }
}

const onFileChange = (e) => {
  archivos.value = Array.from(e.target.files)
}


const agregarComentario = async () => {
  if (savingComentario.value) return false
  savingComentario.value = true

  const formData = new FormData()
  formData.append('comentario', nuevoComentario.value)

  for (let i = 0; i < archivos.value.length; i++) {
    formData.append('archivos[]', archivos.value[i])
  }

  try {
    const { data, error } = await useSanctumFetch(`/api/cotizaciones/${route.params.id}/comentarios`, {
      method: 'POST',
      body: formData,
      headers: {}
    })

    if (error.value) {
      pushNotification('error', 'No se pudo agregar el comentario', 'Error')
      return false
    }

    if (data.value?.success) {
      nuevoComentario.value = ''
      archivos.value = []

      const comentarioCreado = data.value?.comentario || data.value?.data || null

      if (comentarioCreado) {
        cotizacion.value.comentarios = cotizacion.value.comentarios || []
        cotizacion.value.comentarios.push(comentarioCreado)
      } else {
        await fetchDetalle()
      }

      pushNotification('success', 'Comentario agregado con éxito', 'Éxito')
      return true
    }

    return false
  } finally {
    savingComentario.value = false
  }
}

const cambiarEstadoGestion = async () => {
  if (!estadoGestionSeleccionado.value || loadingEstadoGestion.value) return

  loadingEstadoGestion.value = true

  try {
    const { data, error } = await useSanctumFetch(`/api/cotizacion/${route.params.id}/estado-gestion`, {
      method: 'PUT',
      body: {
        estado_gestion_id: estadoGestionSeleccionado.value,
        comentario: comentarioEstadoGestion.value?.trim() || null,
      }
    })

    if (error.value || !data.value?.success) {
      pushNotification('error', 'No se pudo actualizar el estado de gestión', 'Error')
      return
    }

    cotizacion.value = {
      ...cotizacion.value,
      estado_gestion_id: data.value.cotizacion?.estado_gestion_id ?? estadoGestionSeleccionado.value,
      estado_gestion: data.value.cotizacion?.estado_gestion ?? cotizacion.value.estado_gestion,
      historial_estado_gestion: data.value.historial_estado_gestion ?? cotizacion.value.historial_estado_gestion,
    }
    comentarioEstadoGestion.value = ''
    pushNotification('success', 'Estado de gestión actualizado', 'Éxito')
  } catch (error) {
    console.error('Error al actualizar estado de gestión:', error)
    pushNotification('error', 'No se pudo actualizar el estado de gestión', 'Error')
  } finally {
    loadingEstadoGestion.value = false
  }
}

const realizarCambioEstado = async (estadoId, options = {}) => {
  try {
    loadingEstados.value = true

    const payload = {
      estado: estadoId,
      comentario_cambio_estado: options.comentario || null,
      fecha_programada: Number(estadoId) === 5 ? (options.fechaProgramada || null) : null,
      hora_programada: Number(estadoId) === 5 ? (options.horaProgramada || horaProgramadaParaFecha(options.fechaProgramada)) : null,
    }

    const { data, error } = await useSanctumFetch(`/api/cotizacion/${route.params.id}/estado`, {
      method: 'PUT',
      body: payload
    })

    if (error.value || !data.value?.success) {
      pushNotification('error', error.value?.data?.message || data.value?.message || 'No se pudo cambiar el estado', 'Error')
      return false
    }

    // Actualizar el histórico directamente si viene en la respuesta
    if (data.value.historial) {
      historico_estados.value = [...data.value.historial]
    }

    pushNotification('success', 'Estado actualizado con éxito', 'Éxito')

    // Pequeño delay antes de refrescar
    await new Promise(resolve => setTimeout(resolve, 1000))

    await router.replace({ path: route.path, query: { _t: Date.now() } })

    // return true

  } catch (e) {
    console.error('Error en realizarCambioEstado:', e)
    pushNotification('error', 'No se pudo cambiar el estado', 'Error')
    return false
  } finally {
    loadingEstados.value = false
  }
}

const cambiarEstado = async () => {
  const nueva = estadoSeleccionadoTemp.value
  const requiereComentario = [4, 6]

  const estadoActual = cotizacion.value?.estado_id
  const fechaProgramadaActual = normalizarFechaInput(cotizacion.value?.fecha_programada)
  const fechaProgramadaNueva = normalizarFechaInput(fechaProgramadaTemp.value)

  intendedEstado.value = nueva

  const requiereComentarioNuevo = requiereComentario.includes(Number(nueva))
  const requiereComentarioSalida = requiereComentario.includes(Number(estadoActual)) && Number(nueva) !== Number(estadoActual)
  const saleDeProgramada = Number(estadoActual) === 5 && Number(nueva) !== 5
  const cambiaFechaProgramada = Number(estadoActual) === 5 && Number(nueva) === 5 && fechaProgramadaActual !== fechaProgramadaNueva

  if (Number(nueva) === Number(estadoActual) && fechaProgramadaActual === fechaProgramadaNueva) {
    pushNotification('info', 'No hay cambios para guardar en estado/fecha programada.', 'Sin cambios')
    return
  }

  if (Number(nueva) === 5 && !fechaProgramadaNueva) {
    pushNotification('error', 'Debes seleccionar la fecha programada para el estado PROGRAMADA.', 'Error')
    return
  }

  if ((requiereComentarioNuevo || requiereComentarioSalida || saleDeProgramada || cambiaFechaProgramada) && (!nuevoComentario.value || !nuevoComentario.value.trim())) {
    mostrarModalComentario.value = true
    estadoSeleccionadoTemp.value = cotizacion.value?.estado_id || null
    return
  }

  await realizarCambioEstado(nueva, {
    comentario: nuevoComentario.value?.trim() || null,
    fechaProgramada: fechaProgramadaNueva || null,
  })
}

const enviarComentarioYEstado = async () => {
  if (intendedEstado.value) {
    await realizarCambioEstado(intendedEstado.value, {
      comentario: nuevoComentario.value?.trim() || null,
      fechaProgramada: normalizarFechaInput(fechaProgramadaTemp.value) || null,
    })
    estadoSeleccionadoTemp.value = intendedEstado.value
  }

  // Cerrar modal y limpiar
  mostrarModalComentario.value = false
  intendedEstado.value = null
  nuevoComentario.value = ''
}

const cancelarModalComentario = () => {
  mostrarModalComentario.value = false
  estadoSeleccionado.value = cotizacion.value?.estado_id || null
  estadoSeleccionadoTemp.value = cotizacion.value?.estado_id || null
  fechaProgramadaTemp.value = normalizarFechaInput(cotizacion.value?.fecha_programada)
  intendedEstado.value = null
}

onMounted(async () => {
  try {
    // checkSalesforcePermission()
    await Promise.all([
      fetchDetalle(),
      fetchEstados(),
      fetchAuditoriaLogs(),
      // fetchLastSalesforceLog()
    ]);
  } catch (e) {
    pushNotification('error', 'No se pudo cargar la cotización', 'Error')
  } finally {
    loading.value = false;
  }
})

const formatoFecha = (fechaISO) => {
  if (!fechaISO) return '';

  const fechaTexto = String(fechaISO);
  const fechaSimple = fechaTexto.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);

  if (fechaSimple && cotizacion.value?.codificacion) {
    return `${fechaSimple[3]}/${fechaSimple[2]}/${fechaSimple[1]}`;
  }

  const fecha = new Date(fechaISO);
  if (Number.isNaN(fecha.getTime())) return '';

  const opciones = {
    timeZone: 'America/Bogota'
  };

  const fechaFormateada = new Intl.DateTimeFormat('es-CO', {
    ...opciones,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(fecha);

  if (!cotizacion.value?.codificacion) {
    const horaFormateada = new Intl.DateTimeFormat('es-CO', {
      ...opciones,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(fecha);

    return `${fechaFormateada} ${horaFormateada}`;
  }

  return fechaFormateada;
}

const formatearNumero = (valor, decimals = 2) => {
  if (valor === null || valor === undefined) return '0,00';

  let str = String(valor).trim();

  const numero = Number(str);
  if (isNaN(numero)) return '0,00';

  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
    style: 'decimal'
  }).format(numero);
};

const formatearNumeroSinDecimales = (valor) => formatearNumero(valor, 0);

const lenteBaseCodificacion = computed(() => Number(cotizacion.value?.codificacion?.lente ?? 0))
const auxilioLenteCodificacion = computed(() => Number(cotizacion.value?.codificacion?.auxilio_lente ?? 0))
const lenteNetoCodificacion = computed(() => Math.max(lenteBaseCodificacion.value - auxilioLenteCodificacion.value, 0))
const insumosCodificacion = computed(() => Number(cotizacion.value?.codificacion?.insumos ?? 0))

const totalProcedimientosAgrupados = computed(() => {
  if (!Array.isArray(cotizacion.value?.items) || !cotizacion.value.items.length) return 0

  const grupos = new Map()

  cotizacion.value.items.forEach((item) => {
    const codigo = String(item?.codigo || '').trim()
    const cantidad = Number(item?.cantidad || 1) || 1
    const valorUnitario = Number(item?.valor || item?.valor_unitario || 0) || 0

    if (!codigo) {
      return
    }

    if (!grupos.has(codigo)) {
      grupos.set(codigo, { codigo, total: 0 })
    }

    grupos.get(codigo).total += valorUnitario * cantidad
  })

  return Array.from(grupos.values()).reduce((acc, grupo) => acc + (Number(grupo.total) || 0), 0)
})

const totalDetallesAgrupados = computed(() => {
  if (!Array.isArray(cotizacion.value?.detalles) || !cotizacion.value.detalles.length) return 0

  return cotizacion.value.detalles.reduce((acc, detalle) => {
    const cantidad = Number(detalle?.cantidad || 1) || 1
    const valorUnitario = Number(detalle?.valor || detalle?.valor_unitario || 0) || 0

    return acc + (valorUnitario * cantidad)
  }, 0)
})

const polizaValor = computed(() => Number(cotizacion.value?.poliza?.valor_poliza ?? cotizacion.value?.valor_poliza ?? 0))
const polizaVisible = computed(() => {
  const poliza = cotizacion.value?.poliza || null
  const valorPoliza = Number(poliza?.valor_poliza ?? cotizacion.value?.valor_poliza ?? 0)

  if (!poliza && !cotizacion.value?.poliza_id && valorPoliza <= 0) return null

  return {
    nombre: poliza?.nombre || cotizacion.value?.poliza_nombre || `Póliza #${cotizacion.value?.poliza_id || ''}`.trim(),
    valor_asegurado: Number(poliza?.valor_asegurado ?? cotizacion.value?.valor_asegurado ?? 0),
    valor_poliza: valorPoliza,
  }
})

const totalMostrado = computed(() => {
  return totalProcedimientosAgrupados.value + totalDetallesAgrupados.value + polizaValor.value
})

const vigenciaLogs = computed(() =>
  auditoriaLogs.value.filter((log) =>
    log?.campo === 'codificacion.fecha_vigencia' ||
    log?.campo === 'fecha_vigencia' ||
    String(log?.descripcion || '').toLowerCase().includes('vigencia')
  )
)

const vigenciaChipClass = computed(() => {
  const estado = cotizacion.value?.vigencia?.estado || ''

  if (estado === 'vencida') {
    return 'bg-rose-100 text-rose-700'
  }

  if (estado === 'por_vencer') {
    return 'bg-amber-100 text-amber-700'
  }

  if (estado === 'vigente') {
    return 'bg-emerald-100 text-emerald-700'
  }

  return 'bg-slate-100 text-slate-700'
})

const mostrarChipVigencia = computed(() => {
  return Boolean(cotizacion.value?.vigencia?.mostrar !== false && cotizacion.value?.vigencia?.label)
})

const fechaAutorizacionFormateada = computed(() => {
  const valor = cotizacion.value?.codificacion?.fecha_autorizacion
  if (!valor) return ''
  return formatoFecha(valor)
})

const estadoActualEsProgramada = computed(() => Number(cotizacion.value?.estado_id) === 5)
</script>

<template>
  <div v-show="loading" class="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
    <div class="flex justify-center items-center gap-2 text-slate-700">
      <span class="flex items-center gap-2">
        <svg class="w-10" fill="hsl(228, 97%, 42%)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="4" cy="12" r="3">
            <animate id="spinner_qFRN" begin="0;spinner_OcgL.end+0.25s" attributeName="cy" calcMode="spline" dur="0.6s"
              values="12;6;12" keySplines=".33,.66,.66,1;.33,0,.66,.33" />
          </circle>
          <circle cx="12" cy="12" r="3">
            <animate begin="spinner_qFRN.begin+0.1s" attributeName="cy" calcMode="spline" dur="0.6s" values="12;6;12"
              keySplines=".33,.66,.66,1;.33,0,.66,.33" />
          </circle>
          <circle cx="20" cy="12" r="3">
            <animate id="spinner_OcgL" begin="spinner_qFRN.begin+0.2s" attributeName="cy" calcMode="spline" dur="0.6s"
              values="12;6;12" keySplines=".33,.66,.66,1;.33,0,.66,.33" />
          </circle>
        </svg>
      </span>
      <span class="text-lg font-semibold">
        Cargando información...
      </span>
    </div>
  </div>
  <div v-show="!loading" class="space-y-5">
    <Notivue v-slot="item">
      <Notification :item="item" :icons="filledIcons" />
    </Notivue>
    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
    <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
      <div class="flex flex-col gap-2">
        <h2 class="text-2xl font-semibold text-slate-900"> {{ cotizacion?.tipo_gestion == 'cotización' ? 'Cotización' : 'Codificación' }} {{
          cotizacion?.codigo }}</h2>
        <p class="text-slate-700"><span class="font-bold">Cliente:</span> {{ cotizacion?.paciente.nombre_completo }}</p>
        <p class="text-slate-700"><span class="font-bold">Entidad:</span> {{ cotizacion?.entidad?.nombre || cotizacion?.paciente?.entidad?.nombre || 'N/A' }}</p>
        <p class="text-slate-700"><span class="font-bold">Asesor:</span> {{ cotizacion?.asesor.name }}</p>
        <p class="text-slate-700"><span class="font-bold">Salesforce:</span>
          <span :class="{
            'text-emerald-700': cotizacion?.salesforce_status === 'success',
            'text-amber-700': cotizacion?.salesforce_status === 'queued',
            'text-rose-700': cotizacion?.salesforce_status === 'error',
            'text-slate-700': !cotizacion?.salesforce_status || cotizacion?.salesforce_status === 'not_sent'
          }">
            {{ cotizacion?.salesforce_status === 'success' ? 'Enviada' : cotizacion?.salesforce_status === 'queued' ? 'Encolada' : cotizacion?.salesforce_status === 'error' ? 'Error' : 'No enviada' }}
          </span>
        </p>
        <p class="text-slate-700"><span class="font-bold">Estado:</span> <span
            class="bg-indigo-100 text-indigo-700 rounded-full px-2.5 py-1 text-sm font-semibold">{{ cotizacion?.estado.nombre }}</span></p>
        <p class="text-slate-700"><span class="font-bold">Estado de gestión:</span> <span
            class="bg-sky-100 text-sky-700 rounded-full px-2.5 py-1 text-sm font-semibold">{{ cotizacion?.estado_gestion?.nombre || 'Sin gestión' }}</span></p>
        <p v-if="cotizacion?.es_prioritaria" class="text-slate-700">
          <span class="font-bold">Prioridad:</span>
          <span class="bg-rose-100 text-rose-700 rounded-full px-2.5 py-1 text-sm font-semibold">Prioritaria</span>
        </p>
        <p v-if="cotizacion?.fecha_programada" class="text-slate-700">
          <span class="font-bold">Fecha programada:</span>
          <span class="bg-amber-100 text-amber-700 rounded-full px-2.5 py-1 text-sm font-semibold">{{ cotizacion?.fecha_programada }}</span>
        </p>
        <p v-if="cotizacion?.codificacion" class="text-slate-700"><span class="font-bold">Codificación:</span> <span
            class="bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-1 text-sm font-semibold">{{
              cotizacion?.codificacion?.numero_autorizacion }}</span></p>
        <p v-if="mostrarChipVigencia" class="text-slate-700">
          <span class="font-bold">Vigencia:</span>
          <span class="rounded-full px-2.5 py-1 text-sm font-semibold" :class="vigenciaChipClass">
            {{ cotizacion?.vigencia?.label }}
          </span>
        </p>
      </div>
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div class="flex flex-wrap items-center gap-2">
          <label for="estado" class="font-semibold">Cambiar estado:</label>
          <select v-model="estadoSeleccionadoTemp" id="estado" class="border border-slate-300 p-2 rounded-lg w-40 bg-white">
            <option disabled value="" selected>Estados</option>
            <option v-for="estado in estadosAdministrativos" :value="estado.id" :key="estado.id">
              {{ estado.nombre }}
            </option>
          </select>
          <input
            v-if="Number(estadoSeleccionadoTemp) === 5 && !estadoActualEsProgramada"
            v-model="fechaProgramadaTemp"
            type="date"
            class="border border-slate-300 p-2 rounded-lg bg-white"
          />
          <span v-else-if="Number(estadoSeleccionadoTemp) === 5 && estadoActualEsProgramada" class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Fecha programada: {{ cotizacion?.fecha_programada || 'Sin fecha' }}. Modificar solo desde Programación.
          </span>
          <button @click="cambiarEstado"
            class="flex justify-center items-center gap-2 bg-indigo-700 text-white px-4 py-2 rounded-lg"
            :disabled="loadingEstados">
            <template v-if="!loadingEstados">Actualizar</template>
            <template v-else>
              <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Actualizando...
            </template>
          </button>
        </div>

        <div class="flex justify-between items-center gap-2 mt-4">
          <h3 class="font-semibold">Historial de Estados:</h3>
          <div class="flex justify-end gap-2">
            <button
              @click="togglePrioridad"
              :disabled="savingPriority"
              class="px-4 py-2 rounded-lg transition text-white"
              :class="cotizacion?.es_prioritaria ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'"
            >
              {{ savingPriority ? 'Guardando...' : (cotizacion?.es_prioritaria ? 'Quitar prioridad' : 'Marcar como prioritaria') }}
            </button>
            <button @click="mostrarModalHistorico = true"
              class="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition">
              Ver histórico
            </button>
            <button @click="mostrarModalVigencia = true"
              class="bg-emerald-700 text-white px-4 py-2 rounded-lg hover:bg-emerald-800 transition">
              Ver historial de vigencia
            </button>
          </div>
        </div>
      </div>
    </div>
    </section>

    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5 w-full">
      <h3 class="text-lg font-semibold text-slate-900">Items</h3>
      <ul>
        <li v-for="(item, index) in (cotizacion?.codificacion ?
          cotizacion.items.filter((item, i, arr) =>
            arr.findIndex(t => t.codigo === item.codigo) === i
          ) :
          cotizacion?.items)" :key="item.id" class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
            <path fill="#1E9C07"
              d="m10.6 16.2l7.05-7.05l-1.4-1.4l-5.65 5.65l-2.85-2.85l-1.4 1.4zM5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14V5H5zM5 5v14z" />
          </svg>
          {{ item.codigo }} - {{ item.nombre }}
          <span v-show="!cotizacion?.codificacion?.numero_autorizacion" class="flex  justify-center items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
              <path fill="#888888"
                d="M12 6.5a9.77 9.77 0 0 1 8.82 5.5c-1.65 3.37-5.02 5.5-8.82 5.5S4.83 15.37 3.18 12A9.77 9.77 0 0 1 12 6.5m0-2C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5m0 5a2.5 2.5 0 0 1 0 5a2.5 2.5 0 0 1 0-5m0-2c-2.48 0-4.5 2.02-4.5 4.5s2.02 4.5 4.5 4.5s4.5-2.02 4.5-4.5s-2.02-4.5-4.5-4.5" />
            </svg>
            {{ item.lateralidad }} - ${{ item.valor }}
          </span>
        </li>
      </ul>
      <h3 class="mt-6 font-semibold text-slate-900">Insumos</h3>
      <ul>
        <li v-for="detalle in cotizacion?.detalles" :key="detalle.id" class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
            viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE -->
            <path fill="#1E9C07"
              d="m10.6 16.2l7.05-7.05l-1.4-1.4l-5.65 5.65l-2.85-2.85l-1.4 1.4zM5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14V5H5zM5 5v14z" />
          </svg>
          {{ detalle.codigo }} - {{ detalle.nombre }} <span v-show="!cotizacion?.codificacion?.numero_autorizacion">${{
            detalle.valor }}</span>
          <span v-if="detalle.tipo == 'L'" class="text-blue-600 font-bold">- (LENTE)
          </span>
        </li>
      </ul>

      <div v-if="polizaVisible" class="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <h3 class="text-sm font-semibold text-emerald-900">Póliza seleccionada</h3>
        <p class="text-sm text-emerald-800 mt-1">{{ polizaVisible.nombre }}</p>
        <p class="text-sm text-emerald-800">Valor asegurado: {{ formatearNumero(polizaVisible.valor_asegurado, 0) }}</p>
        <p class="text-sm text-emerald-800 font-semibold">Valor de la póliza: {{ formatearNumero(polizaVisible.valor_poliza, 0) }}</p>
      </div>

      <div v-if="cotizacion?.codificacion?.numero_autorizacion">
        <h3 class="mt-6 font-semibold text-slate-900">Autorización</h3>
        <ul>
          <li class="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24"><!-- Icon from BoxIcons by Atisa - https://creativecommons.org/licenses/by/4.0/ -->
              <path fill="#1E9C07" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8" />
              <path fill="#1E9C07"
                d="M12 11c-2 0-2-.63-2-1s.7-1 2-1s1.39.64 1.4 1h2A3 3 0 0 0 13 7.12V6h-2v1.09C9 7.42 8 8.71 8 10c0 1.12.52 3 4 3c2 0 2 .68 2 1s-.62 1-2 1c-1.84 0-2-.86-2-1H8c0 .92.66 2.55 3 2.92V18h2v-1.08c2-.34 3-1.63 3-2.92c0-1.12-.52-3-4-3" />
            </svg> Copago: {{ formatearNumeroSinDecimales(cotizacion?.codificacion.copago) }}</li>
          <li class="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24"><!-- Icon from BoxIcons by Atisa - https://creativecommons.org/licenses/by/4.0/ -->
              <path fill="#1E9C07" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8" />
              <path fill="#1E9C07"
                d="M12 11c-2 0-2-.63-2-1s.7-1 2-1s1.39.64 1.4 1h2A3 3 0 0 0 13 7.12V6h-2v1.09C9 7.42 8 8.71 8 10c0 1.12.52 3 4 3c2 0 2 .68 2 1s-.62 1-2 1c-1.84 0-2-.86-2-1H8c0 .92.66 2.55 3 2.92V18h2v-1.08c2-.34 3-1.63 3-2.92c0-1.12-.52-3-4-3" />
            </svg>excedente tope: {{ formatearNumeroSinDecimales(cotizacion?.codificacion.excedente_tope) }}</li>
          <li class="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24"><!-- Icon from BoxIcons by Atisa - https://creativecommons.org/licenses/by/4.0/ -->
              <path fill="#1E9C07" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8" />
              <path fill="#1E9C07"
                d="M12 11c-2 0-2-.63-2-1s.7-1 2-1s1.39.64 1.4 1h2A3 3 0 0 0 13 7.12V6h-2v1.09C9 7.42 8 8.71 8 10c0 1.12.52 3 4 3c2 0 2 .68 2 1s-.62 1-2 1c-1.84 0-2-.86-2-1H8c0 .92.66 2.55 3 2.92V18h2v-1.08c2-.34 3-1.63 3-2.92c0-1.12-.52-3-4-3" />
            </svg>Lente: {{ formatearNumeroSinDecimales(lenteNetoCodificacion) }}</li>
          <li class="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24"><!-- Icon from BoxIcons by Atisa - https://creativecommons.org/licenses/by/4.0/ -->
              <path fill="#1E9C07" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8" />
              <path fill="#1E9C07"
                d="M12 11c-2 0-2-.63-2-1s.7-1 2-1s1.39.64 1.4 1h2A3 3 0 0 0 13 7.12V6h-2v1.09C9 7.42 8 8.71 8 10c0 1.12.52 3 4 3c2 0 2 .68 2 1s-.62 1-2 1c-1.84 0-2-.86-2-1H8c0 .92.66 2.55 3 2.92V18h2v-1.08c2-.34 3-1.63 3-2.92c0-1.12-.52-3-4-3" />
            </svg>Auxilio de lente: {{ formatearNumeroSinDecimales(auxilioLenteCodificacion) }}</li>
          <li class="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24"><!-- Icon from BoxIcons by Atisa - https://creativecommons.org/licenses/by/4.0/ -->
              <path fill="#1E9C07" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8" />
              <path fill="#1E9C07"
                d="M12 11c-2 0-2-.63-2-1s.7-1 2-1s1.39.64 1.4 1h2A3 3 0 0 0 13 7.12V6h-2v1.09C9 7.42 8 8.71 8 10c0 1.12.52 3 4 3c2 0 2 .68 2 1s-.62 1-2 1c-1.84 0-2-.86-2-1H8c0 .92.66 2.55 3 2.92V18h2v-1.08c2-.34 3-1.63 3-2.92c0-1.12-.52-3-4-3" />
            </svg>Pre-Anestesia: {{ formatearNumeroSinDecimales(cotizacion?.codificacion.pre_anestesia) }}</li>
          <li class="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24"><!-- Icon from BoxIcons by Atisa - https://creativecommons.org/licenses/by/4.0/ -->
              <path fill="#1E9C07" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8" />
              <path fill="#1E9C07"
                d="M12 11c-2 0-2-.63-2-1s.7-1 2-1s1.39.64 1.4 1h2A3 3 0 0 0 13 7.12V6h-2v1.09C9 7.42 8 8.71 8 10c0 1.12.52 3 4 3c2 0 2 .68 2 1s-.62 1-2 1c-1.84 0-2-.86-2-1H8c0 .92.66 2.55 3 2.92V18h2v-1.08c2-.34 3-1.63 3-2.92c0-1.12-.52-3-4-3" />
            </svg>Otros costos: {{ formatearNumeroSinDecimales(cotizacion?.codificacion.otros_costos) }}</li>
          <li class="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24"><!-- Icon from BoxIcons by Atisa - https://creativecommons.org/licenses/by/4.0/ -->
              <path fill="#1E9C07" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8" />
              <path fill="#1E9C07"
                d="M12 11c-2 0-2-.63-2-1s.7-1 2-1s1.39.64 1.4 1h2A3 3 0 0 0 13 7.12V6h-2v1.09C9 7.42 8 8.71 8 10c0 1.12.52 3 4 3c2 0 2 .68 2 1s-.62 1-2 1c-1.84 0-2-.86-2-1H8c0 .92.66 2.55 3 2.92V18h2v-1.08c2-.34 3-1.63 3-2.92c0-1.12-.52-3-4-3" />
            </svg>Insumos: {{ formatearNumeroSinDecimales(insumosCodificacion) }}</li>
          <li class="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE -->
              <path fill="#172983"
                d="M5 8h14V6H5zm0 0V6zm0 14q-.825 0-1.412-.587T3 20V6q0-.825.588-1.412T5 4h1V3q0-.425.288-.712T7 2t.713.288T8 3v1h8V3q0-.425.288-.712T17 2t.713.288T18 3v1h1q.825 0 1.413.588T21 6v4.675q0 .425-.288.713t-.712.287t-.712-.288t-.288-.712V10H5v10h5.8q.425 0 .713.288T11.8 21t-.288.713T10.8 22zm13 1q-2.075 0-3.537-1.463T13 18t1.463-3.537T18 13t3.538 1.463T23 18t-1.463 3.538T18 23m.5-5.2v-2.3q0-.2-.15-.35T18 15t-.35.15t-.15.35v2.275q0 .2.075.388t.225.337l1.525 1.525q.15.15.35.15t.35-.15t.15-.35t-.15-.35z" />
            </svg>
            Fecha de vigencia: <span class="text-red-700 font-bold">
              {{
                formatoFecha(cotizacion?.codificacion.fecha_vigencia) }}
            </span>
          </li>
          <li class="flex items-center gap-1" v-if="fechaAutorizacionFormateada">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
              <path fill="#172983" d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2zm12 6H5v11h14z"/>
            </svg>
            Fecha de autorización:
            <span class="text-indigo-700 font-bold">{{ fechaAutorizacionFormateada }}</span>
          </li>
        </ul>
      </div>
      <div class="mt-6">
        <h3 class="my-2 font-semibold text-slate-900">Observaciones:</h3>
        <textarea class="w-full min-h-28 border border-slate-300 rounded-xl p-3 resize-none font-medium bg-slate-50"
          :disabled="cotizacion?.observaciones">{{
            cotizacion?.observaciones }}</textarea>
      </div>
      <p v-show="!cotizacion?.codificacion?.numero_autorizacion" class="mt-6">
        <span>
          <b>Total:</b> <span class="text-indigo-700 font-bold text-2xl">
            ${{ totalMostrado }}
          </span>
        </span>
      </p>
      <div class="mt-6 flex justify-end items-center">
        <div v-if="cotizacion" class="flex justify-end items-center gap-2">
          <NuxtLink :to="{
            path: `/cotizacion/imprimir/${cotizacion.id}`,
            query: cotizacion?.tipo_gestion === 'codificación' ? { paciente: '1', origen: 'codificacion' } : {}
          }"
            class="bg-emerald-600 text-white px-4 py-2 rounded-lg">
            Imprimir {{ cotizacion?.tipo_gestion == 'cotización' ? 'Cotización' : 'Codificación' }}</NuxtLink>
          
          <NuxtLink :to="`/cotizacion/editar/${cotizacion.id}`"
            class="bg-indigo-700 text-white px-4 py-2 rounded-lg"> Editar</NuxtLink>
          <button v-if="canSyncSalesforce" @click="syncSalesforce" :disabled="syncingSalesforce"
            class="bg-sky-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-sky-700 transition">
            <template v-if="!syncingSalesforce">Sincronizar</template>
            <template v-else>
              <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Sincronizando...
            </template>
          </button>
          <div v-if="canSyncSalesforce && lastSalesforceLog" class="flex flex-col gap-1 text-xs p-2 bg-slate-100 rounded-lg">
            <span class="font-semibold">Última sincronización:</span>
            <span :class="{
              'text-green-600': lastSalesforceLog.status === 'success',
              'text-red-600': lastSalesforceLog.status === 'error',
              'text-yellow-600': lastSalesforceLog.status === 'queued'
            }">
              Estado: {{ lastSalesforceLog.status }}
            </span>
            <span class="text-slate-600">{{ formatoFecha(lastSalesforceLog.created_at) }}</span>
            <span v-if="lastSalesforceLog.error_message" class="text-red-600">Error: {{ lastSalesforceLog.error_message }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
    <h3 class="text-xl font-semibold text-slate-900 mb-4">Comentarios</h3>
    <div class="mb-5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
      <div class="flex flex-col lg:flex-row lg:items-end gap-3">
        <div class="flex-1">
          <label class="block text-sm font-semibold text-slate-700 mb-1">Estado de gestión</label>
          <select v-model="estadoGestionSeleccionado" class="w-full h-11 rounded-lg border border-slate-300 bg-white px-3">
            <option value="">Sin estado de gestión</option>
            <option v-for="estado in estadosGestion" :key="estado.id" :value="estado.id">
              {{ estado.nombre }}
            </option>
          </select>
        </div>
        <div class="flex-[1.4]">
          <label class="block text-sm font-semibold text-slate-700 mb-1">Comentario de trazabilidad</label>
          <input v-model="comentarioEstadoGestion" class="w-full h-11 rounded-lg border border-slate-300 bg-white px-3" placeholder="Opcional" />
        </div>
        <button
          class="h-11 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
          :disabled="loadingEstadoGestion || !estadoGestionSeleccionado"
          @click="cambiarEstadoGestion"
        >
          {{ loadingEstadoGestion ? 'Guardando...' : 'Actualizar gestión' }}
        </button>
      </div>
      <div v-if="cotizacion?.historial_estado_gestion?.length" class="mt-4 border-t border-indigo-100 pt-3 text-sm">
        <p class="font-semibold text-slate-700">Trazabilidad de gestión</p>
        <div v-for="log in cotizacion.historial_estado_gestion.slice(0, 5)" :key="log.id" class="mt-2 text-slate-700">
          <b>{{ log.estado_anterior?.nombre || 'Sin estado' }}</b>
          a
          <b>{{ log.estado_nuevo?.nombre || 'Sin estado' }}</b>
          por {{ log.usuario?.name || 'Sistema' }} - {{ formatoFecha(log.created_at) }}
          <span v-if="log.comentario">: {{ log.comentario }}</span>
        </div>
      </div>
    </div>
    <div v-for="com in cotizacion?.comentarios" :key="com.id" class="border border-slate-200 rounded-xl p-3 mb-3 bg-slate-50/60">
      <p><b>{{ com.usuario.name }} - {{ formatoFecha(com.created_at) }}</b>: {{ com.comentario }}</p>
      <div v-if="com.adjuntos.length > 0" class="mt-2">
        <p>Archivos adjuntos:</p>
        <ul>
          <li v-for="adjunto in com.adjuntos" :key="adjunto.id" class=" w-fit flex justify-center items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE -->
              <path fill="#07459C"
                d="M18 15.75q0 2.6-1.825 4.425T11.75 22t-4.425-1.825T5.5 15.75V6.5q0-1.875 1.313-3.187T10 2t3.188 1.313T14.5 6.5v8.75q0 1.15-.8 1.95t-1.95.8t-1.95-.8t-.8-1.95V6h2v9.25q0 .325.213.538t.537.212t.538-.213t.212-.537V6.5q-.025-1.05-.737-1.775T10 4t-1.775.725T7.5 6.5v9.25q-.025 1.775 1.225 3.013T11.75 20q1.75 0 2.975-1.237T16 15.75V6h2z" />
            </svg>
            <a :href="fileUrl(adjunto.archivo_path)" target="_blank">{{ adjunto.archivo_nombre }}</a>
          </li>
        </ul>
      </div>
    </div>

    <div class="mt-4 border-t border-slate-200 pt-4">
      <div class="flex flex-col">
        <textarea v-model="nuevoComentario" placeholder="Escribe un comentario" class="border border-slate-300 rounded-xl p-3 w-full"
          :disabled="savingComentario"></textarea>
        <input type="file" multiple @change="onFileChange" class="mt-2" />
        <button @click="agregarComentario" :disabled="savingComentario"
          class="w-fit bg-emerald-600 text-white px-4 py-2 mt-4 rounded-lg flex items-center gap-2">
          <template v-if="!savingComentario">Agregar comentario</template>
          <template v-else>
            <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            Guardando información...
          </template>
        </button>
      </div>
    </div>
    </section>
  </div>

  <!-- Modal -->
  <div v-if="mostrarModalHistorico" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-lg p-6 w-full max-w-lg relative border border-slate-200">

      <!-- Botón cerrar -->
      <button @click="mostrarModalHistorico = false"
        class="absolute top-3 right-3 text-gray-600 hover:text-black text-xl">
        ✕
      </button>

      <h3 class="text-lg font-bold mb-4">Historial de Estados</h3>
      <ul class="space-y-4 max-h-80 overflow-y-auto">
        <li v-for="estado in historico_estados" :key="estado.id" class="border-b pb-2">
          <p><b>Estado anterior:</b> {{ estado.estado_anterior?.nombre || 'Desconocido' }}</p>
          <p><b>Estado nuevo:</b> {{ estado.estado_nuevo?.nombre || 'Desconocido' }}</p>
          <p><b>Usuario:</b> {{ estado.usuario?.name || 'Desconocido' }}</p>
          <p><b>Fecha:</b> {{ formatoFecha(estado.created_at) }}</p>
        </li>
      </ul>

    </div>
  </div>

  <div v-if="mostrarModalVigencia" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-lg p-6 w-full max-w-lg relative border border-slate-200">
      <button @click="mostrarModalVigencia = false" class="absolute top-3 right-3 text-gray-600 hover:text-black text-xl">✕</button>
      <h3 class="text-lg font-bold mb-4">Historial de vigencia</h3>
      <div v-if="loadingAuditoriaLogs" class="text-sm text-slate-500">Cargando historial...</div>
      <ul v-else-if="vigenciaLogs.length" class="space-y-3 max-h-80 overflow-y-auto">
        <li v-for="(log, index) in vigenciaLogs" :key="index" class="border-b pb-2 text-sm text-slate-700">
          <p class="font-semibold">{{ log.fecha || formatoFecha(log.created_at) }}</p>
          <p>{{ log.descripcion || log.detalle || 'Cambio de vigencia' }}</p>
          <p class="text-xs text-slate-500">{{ log.usuario || 'Sistema' }}</p>
        </li>
      </ul>
      <p v-else class="text-sm text-slate-500">No hay cambios de vigencia registrados.</p>
    </div>
  </div>

  <div v-if="mostrarModalComentario" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-lg p-6 w-full max-w-lg relative border border-slate-200">
      <button @click="cancelarModalComentario"
        class="absolute top-3 right-3 text-gray-600 hover:text-black text-xl">✕</button>
      <h3 class="text-lg font-bold mb-4">Comentario requerido</h3>
      <p class="mb-4">Este cambio requiere que ingreses un comentario (estado o fecha programada). Por favor escribe el comentario antes
        de
        continuar.</p>
      <textarea v-model="nuevoComentario" placeholder="Escribe un comentario"
        class="w-full border border-slate-300 rounded-xl p-3 h-28 mb-4"></textarea>
      <div class="flex justify-end gap-2">
        <button @click="cancelarModalComentario" class="px-4 py-2 bg-slate-200 rounded-lg">Cancelar</button>
        <button @click="enviarComentarioYEstado" :disabled="savingComentario"
          class="px-4 py-2 bg-indigo-700 text-white rounded-lg">
          <template v-if="!savingComentario">Confirmar cambio</template>
          <template v-else>Enviando...</template>
        </button>
      </div>
    </div>
  </div>
</template>
