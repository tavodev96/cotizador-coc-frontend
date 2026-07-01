<template>
    <div class="space-y-4">
        <div>
            <h1 class="text-2xl font-semibold text-slate-900">Editar cotización</h1>
            <p class="text-sm text-slate-600 mt-1">Actualiza la información manteniendo la estructura existente.</p>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p class="text-sm font-semibold text-slate-700 mb-2">Historial de vigencia</p>
                <div v-if="loadingAuditoriaLogs" class="text-sm text-slate-500">Cargando historial...</div>
                <div v-else>
                    <template v-if="vigenciaLogs.length">
                        <ul class="space-y-3">
                            <li v-for="(log, index) in vigenciaLogs" :key="index" class="rounded-lg border border-slate-200 p-3 bg-white">
                                <div class="text-xs text-slate-500">{{ log.fecha }} · {{ log.usuario }}</div>
                                <div class="text-sm text-slate-700 mt-1">{{ log.descripcion }}</div>
                            </li>
                        </ul>
                    </template>
                    <div v-else class="text-sm text-slate-500">No hay cambios de vigencia registrados.</div>
                </div>
            </div>
        </div>
        <div v-if="redirecting" class="p-6 text-center flex flex-col items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm text-emerald-800">
            <svg class="animate-spin h-8 w-8 text-emerald-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <div class="font-semibold">Información actualizada. Redirigiendo a impresión…</div>
        </div>
        <div v-else-if="loading" class="p-6 text-center flex flex-col items-center gap-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <svg class="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <div class="text-slate-700">Consultando información para editar…</div>
        </div>
        <QuoteForm v-else mode="edit" @saved="handleSaved" />
    </div>
</template>

<script setup>
definePageMeta({
    middleware: ['sanctum:auth'],
});

import QuoteForm from '../../../components/quoter/QuoteForm.vue'

const route = useRoute()
const router = useRouter()

const { getById } = useCotizacionApi()
const { paciente, cotizacion, codificacion } = useCotizacionForm()

const loading = ref(true)
const redirecting = ref(false)
const auditoriaLogs = ref([])
const loadingAuditoriaLogs = ref(false)

const vigenciaLogs = computed(() =>
    auditoriaLogs.value.filter(
        (log) =>
            log.campo === 'codificacion.fecha_vigencia' ||
            log.campo === 'fecha_vigencia' ||
            String(log.descripcion || '').toLowerCase().includes('vigencia')
    )
)

const normalizarFecha = (value) => String(value || '').slice(0, 10)

const calcularDiasVigencia = (fechaAutorizacion, fechaVigencia) => {
    const inicio = normalizarFecha(fechaAutorizacion)
    const fin = normalizarFecha(fechaVigencia)
    if (!inicio || !fin) return ''

    const inicioDate = new Date(`${inicio}T00:00:00`)
    const finDate = new Date(`${fin}T00:00:00`)
    if (Number.isNaN(inicioDate.getTime()) || Number.isNaN(finDate.getTime())) return ''

    return String(Math.max(0, Math.round((finDate.getTime() - inicioDate.getTime()) / 86400000)))
}

const fetchAuditoriaLogs = async () => {
    loadingAuditoriaLogs.value = true
    const { data, error } = await useSanctumFetch(`/api/auditoria/cotizacion/${route.params.id}`)

    if (!error.value && data.value) {
        auditoriaLogs.value = data.value
    }

    loadingAuditoriaLogs.value = false
}

const handleSaved = async () => {
    redirecting.value = true
    await nextTick()

    if (process.client) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    await fetchAuditoriaLogs()

    setTimeout(() => {
        router.push(`/cotizacion/imprimir/${route.params.id}`)
    }, 2000)
}

onMounted(async () => {
    const { data, error } = await getById(route.params.id)

    if (error.value) {
        console.log(error.value);
        
        // router.push('/cotizacion')
        // return
    }

    const c = data.value
    console.log('Cotización cargada para edición:', c)

    paciente.value = {
        id: c.cotizacion.paciente.id,
        tipo_identificacion: c.cotizacion.paciente.tipo_identificacion,
        numero_identificacion: c.cotizacion.paciente.numero_identificacion,
        nombres: c.cotizacion.paciente.nombres,
        apellidos: c.cotizacion.paciente.apellidos,
        correo: c.cotizacion.paciente.correo,
        telefono: c.cotizacion.paciente.telefono,
        entidad_id: c.cotizacion.entidad_id,
    }

    cotizacion.value = {
        origen: c.cotizacion.origen,
        tipo_gestion: c.cotizacion.tipo_gestion,
        medico_id: c.cotizacion.medico_id,
        consultorio_id: c.cotizacion.consultorio_id,
        observaciones: c.cotizacion.observaciones,
        poliza_id: c.cotizacion.poliza_id || '',
        poliza: c.cotizacion.poliza || null,
        valor_poliza: Number(c.cotizacion.poliza?.valor_poliza ?? c.cotizacion.valor_poliza ?? 0),
        fecha_vigencia: '',
        items: c.cotizacion.items.map(i => ({
            ...i,
            valor: Number(i.valor) || 0,
            valor_con_descuento: Number(i.valor_con_descuento ?? i.valor) || Number(i.valor) || 0,
            cantidad: i.cantidad ?? 1,
        })),
        // Los insumos y lentes pueden llegar dentro de `detalles` (tipo 'I' = insumo, 'L' = lente)
        insumos: (function() {
            const detalles = c.detalles ?? c.cotizacion?.detalles ?? []
            const insumosFromDetalles = detalles.filter(d => d.tipo === 'I').map(d => ({
                ...d,
                cantidad: d.cantidad ?? 1,
                valor: Number(d.valor) || 0,
            }))
            return c.cotizacion.insumos ?? insumosFromDetalles
        })(),
        lentes: (function() {
            const detalles = c.detalles ?? c.cotizacion?.detalles ?? []
            const lentesFromDetalles = detalles.filter(d => d.tipo === 'L').map(d => ({
                ...d,
                cantidad: d.cantidad ?? 1,
                valor: Number(d.valor) || 0,
            }))
            return c.cotizacion.lentes ?? lentesFromDetalles
        })(),
    }

    const codificacionData = c.codificacion || c.cotizacion?.codificacion || null

    if (codificacionData) {
        codificacion.value = {
            autorizacion: codificacionData.numero_autorizacion ?? '',
            copago: codificacionData.copago ?? '0',
            excedenteTope: codificacionData.excedente_tope ?? '0',
            lentes: codificacionData.lente ?? '0',
            auxilioLente: codificacionData.auxilio_lente ?? '0',
            preAnestesia: codificacionData.pre_anestesia ?? '0',
            otros: codificacionData.otros_costos ?? '0',
            fechaVigencia: normalizarFecha(codificacionData.fecha_vigencia),
            fechaAutorizacion: normalizarFecha(codificacionData.fecha_autorizacion),
            diasVigencia: calcularDiasVigencia(codificacionData.fecha_autorizacion, codificacionData.fecha_vigencia),
        }
    }

    loading.value = false
    await fetchAuditoriaLogs()
})

</script>
