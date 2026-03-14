<template>
    <div class="space-y-4">
        <div>
            <h1 class="text-2xl font-semibold text-slate-900">Editar cotización</h1>
            <p class="text-sm text-slate-600 mt-1">Actualiza la información manteniendo la estructura existente.</p>
        </div>
        <div v-if="loading" class="p-6 text-center flex flex-col items-center gap-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <svg class="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <div class="text-slate-700">Consultando información para editar…</div>
        </div>
        <QuoteForm v-else mode="edit" @submit="guardar" />
    </div>
</template>

<script setup>
definePageMeta({
    middleware: ['sanctum:auth'],
});

import QuoteForm from '../../../components/quoter/QuoteForm.vue'

const route = useRoute()
const router = useRouter()

const { getById, update } = useCotizacionApi()
const { paciente, cotizacion, codificacion } = useCotizacionForm()

const loading = ref(true)

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

    // if (c.codificacion) {
    //     codificacion.value = {
    //         autorizacion: c.codificacion.numero_autorizacion,
    //         copago: c.codificacion.copago,
    //         excedenteTope: c.codificacion.excedente_tope,
    //         lentes: c.codificacion.lente,
    //         preAnestesia: c.codificacion.pre_anestesia,
    //         otros: c.codificacion.otros_costos,
    //         fechaVigencia: c.codificacion.fecha_vigencia,
    //     }
    // }

    loading.value = false
})

const guardar = async () => {
    await update(route.params.id, {
        paciente: paciente.value,
        cotizacion: cotizacion.value,
        codificacion: codificacion.value,
    })
}

</script>