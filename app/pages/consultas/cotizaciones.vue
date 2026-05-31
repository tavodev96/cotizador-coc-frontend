<template>
    <div class="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-5">
        <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5 space-y-4">
            <h1 class="text-xl md:text-2xl font-semibold text-slate-900">Consultar cotizaciones</h1>
            <p class="text-sm text-slate-600">
                Busca con número de identificación del paciente en
                <span class="uppercase text-indigo-700 font-semibold">Servinte</span>.
            </p>

            <div class="flex flex-col md:flex-row md:items-center gap-3">
                <input
                    v-model="search"
                    type="text"
                    placeholder="Número de identificación del paciente"
                    class="w-full md:max-w-sm h-11 border border-slate-300 rounded-lg px-3 bg-white"
                    @keyup.enter="fetchCotizaciones"
                    :disabled="cargando"
                >
                <button
                    @click="fetchCotizaciones"
                    class="h-11 px-5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="cargando"
                >
                    {{ cargando ? "Buscando..." : "Buscar" }}
                </button>
                <button
                    v-if="cotizaciones.length > 0 || search"
                    @click="limpiarResultados"
                    class="h-11 px-5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium"
                    :disabled="cargando"
                >
                    Limpiar
                </button>
            </div>
        </section>

        <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
            <div class="flex items-center justify-between mb-4">
                <p class="text-sm text-slate-600">{{ cotizaciones.length }} resultado{{ cotizaciones.length === 1 ? '' : 's' }}</p>
            </div>

            <div v-if="cargando" class="py-10 text-center text-slate-500">
                Cargando...
            </div>

            <div v-else-if="cotizaciones.length === 0" class="py-10 text-center text-slate-500">
                No hay cotizaciones para mostrar. Realiza una búsqueda.
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <article
                    v-for="cotizacion in cotizaciones"
                    :key="cotizacion.id"
                    class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition h-fit"
                >
                    <h3 class="text-base font-semibold text-slate-900">
                        {{ obtenerPrimerProcedimiento(cotizacion) }}
                    </h3>

                    <p class="text-sm text-slate-600 mt-2">
                        <span class="font-medium">Código:</span>
                        {{ cotizacion.codigo }}
                    </p>

                    <p class="text-sm text-slate-600 mt-1">
                        <span class="font-medium">Fecha:</span>
                        {{ formatearFecha(cotizacion.fecha_recepcion) }}
                    </p>

                    <p class="text-sm text-slate-600 mt-1">
                        <span class="font-medium">Médico:</span>
                        {{ obtenerNombreMedico(cotizacion) }}
                    </p>

                    <p class="text-sm text-slate-600 mt-1">
                        <span class="font-medium">Estado:</span>
                        <span class="font-semibold" :class="{
                            'text-green-600': cotizacion.estado?.nombre === 'Aprobada',
                            'text-yellow-600': cotizacion.estado?.nombre === 'Pendiente',
                            'text-red-600': cotizacion.estado?.nombre === 'Rechazada'
                        }">
                            {{ cotizacion.estado?.nombre || 'Sin estado' }}
                        </span>
                    </p>

                    <div class="mt-3 flex justify-between items-center gap-2">
                        <button
                            @click="abrirDetalle(cotizacion)"
                            class="inline-flex items-center h-9 px-3 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-sm font-medium"
                        >
                            Ver {{ tipoVista(cotizacion) }}
                        </button>
                        <span class="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-full">
                            {{ cotizacion.paciente?.numero_identificacion || 'Sin historia' }}
                        </span>
                    </div>
                </article>
            </div>
        </section>

        <div
            v-if="mostrarModalDetalle"
            class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6"
            @click.self="cerrarModalDetalle"
        >
            <div class="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200">
                <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                        <p class="text-sm font-semibold text-indigo-700 uppercase">Vista previa</p>
                        <h2 class="text-xl font-semibold text-slate-900 mt-1">{{ tipoVista(cotizacionSeleccionada) }} {{ cotizacionSeleccionada?.codigo || '' }}</h2>
                    </div>
                    <button
                        @click="cerrarModalDetalle"
                        class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>
                </div>

                <div v-if="cargandoDetalle" class="px-5 py-10 text-center text-slate-500">
                    Cargando detalle...
                </div>

                <div v-else-if="!cotizacionSeleccionada" class="px-5 py-10 text-center text-slate-500">
                    No se pudo cargar la información.
                </div>

                <div v-else class="px-5 py-5 space-y-6 text-sm text-slate-700">
                    <section class="grid gap-3 md:grid-cols-2">
                        <div class="rounded-xl border border-slate-200 p-4 bg-slate-50">
                            <p class="text-xs uppercase tracking-wide text-slate-500">Paciente</p>
                            <p class="mt-2 font-semibold text-slate-900">{{ cotizacionSeleccionada.paciente?.nombre_completo || 'Paciente no registrado' }}</p>
                            <p class="mt-1">Historia: {{ cotizacionSeleccionada.paciente?.numero_identificacion || 'N/A' }}</p>
                        </div>
                        <div class="rounded-xl border border-slate-200 p-4 bg-slate-50">
                            <p class="text-xs uppercase tracking-wide text-slate-500">Resumen</p>
                            <p class="mt-2"><span class="font-semibold">Fecha:</span> {{ formatearFechaHora(cotizacionSeleccionada.created_at || cotizacionSeleccionada.fecha_recepcion) }}</p>
                            <p class="mt-1"><span class="font-semibold">Médico:</span> {{ cotizacionSeleccionada.medico?.nombre || 'No especificado' }}</p>
                            <p class="mt-1"><span class="font-semibold">Entidad:</span> {{ cotizacionSeleccionada.entidad?.nombre || cotizacionSeleccionada.paciente?.entidad?.nombre || 'No especificada' }}</p>
                            <p v-if="cotizacionSeleccionada.codificacion?.numero_autorizacion" class="mt-1"><span class="font-semibold">Autorización:</span> {{ cotizacionSeleccionada.codificacion.numero_autorizacion }}</p>
                            <p class="mt-1"><span class="font-semibold">Estado:</span> {{ cotizacionSeleccionada.estado?.nombre || 'Sin estado' }}</p>
                        </div>
                    </section>

                    <section v-if="procedimientosModal.length > 0" class="rounded-xl border border-slate-200 overflow-hidden">
                        <div class="bg-[#172a83] px-4 py-2 text-white font-semibold">PROCEDIMIENTO</div>
                        <table class="min-w-full text-left text-xs">
                            <thead class="bg-slate-100 text-slate-700">
                                <tr>
                                    <th class="px-3 py-2">CUPS</th>
                                    <th class="px-3 py-2">Nombre</th>
                                    <th class="px-3 py-2">Lateralidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(item, index) in procedimientosModal" :key="`modal-proc-${index}`" class="border-t border-slate-200">
                                    <td class="px-3 py-2">{{ item.codigo }}</td>
                                    <td class="px-3 py-2">{{ item.nombre }}</td>
                                    <td class="px-3 py-2 capitalize">{{ item.lateralidad || '-' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <section v-if="tipoVista(cotizacionSeleccionada) === 'codificación'" class="grid gap-4 lg:grid-cols-2">
                        <div v-if="insumosModal.length > 0" class="rounded-xl border border-slate-200 overflow-hidden">
                            <div class="bg-[#172a83] px-4 py-2 text-white font-semibold">INSUMOS</div>
                            <table class="min-w-full text-left text-xs">
                                <thead class="bg-slate-100 text-slate-700">
                                    <tr>
                                        <th class="px-3 py-2">Código</th>
                                        <th class="px-3 py-2">Nombre</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(detalle, index) in insumosModal" :key="`modal-insumo-${index}`" class="border-t border-slate-200">
                                        <td class="px-3 py-2">{{ detalle.codigo }}</td>
                                        <td class="px-3 py-2">{{ detalle.nombre }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div v-if="lentesModal.length > 0" class="rounded-xl border border-slate-200 overflow-hidden">
                            <div class="bg-[#172a83] px-4 py-2 text-white font-semibold">LENTES</div>
                            <table class="min-w-full text-left text-xs">
                                <thead class="bg-slate-100 text-slate-700">
                                    <tr>
                                        <th class="px-3 py-2">Código</th>
                                        <th class="px-3 py-2">Nombre</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(detalle, index) in lentesModal" :key="`modal-lente-${index}`" class="border-t border-slate-200">
                                        <td class="px-3 py-2">{{ detalle.codigo }}</td>
                                        <td class="px-3 py-2">{{ detalle.nombre }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section v-if="tipoVista(cotizacionSeleccionada) === 'codificación'" class="rounded-xl border border-slate-200 overflow-hidden">
                        <div class="bg-[#172a83] px-4 py-2 text-white font-semibold">VALORES</div>
                        <div class="grid grid-cols-1 md:grid-cols-2 text-xs">
                            <div class="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
                                <span class="font-semibold">Lente</span>
                                <span>{{ formatearNumeroSinDecimales(valorLentesCodificacion) }}</span>
                            </div>
                            <div class="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
                                <span class="font-semibold">Auxilio de lente</span>
                                <span>{{ formatearNumeroSinDecimales(cotizacionSeleccionada.codificacion?.auxilio_lente) }}</span>
                            </div>
                            <div class="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
                                <span class="font-semibold">Insumos</span>
                                <span>{{ formatearNumeroSinDecimales(cotizacionSeleccionada.codificacion?.insumos) }}</span>
                            </div>
                            <div class="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
                                <span class="font-semibold">Copago</span>
                                <span>{{ formatearNumeroSinDecimales(cotizacionSeleccionada.codificacion?.copago) }}</span>
                            </div>
                            <div class="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
                                <span class="font-semibold">Excedente tope</span>
                                <span>{{ formatearNumeroSinDecimales(cotizacionSeleccionada.codificacion?.excedente_tope) }}</span>
                            </div>
                            <div class="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
                                <span class="font-semibold">Pre anestesia</span>
                                <span>{{ formatearNumeroSinDecimales(cotizacionSeleccionada.codificacion?.pre_anestesia) }}</span>
                            </div>
                            <div class="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
                                <span class="font-semibold">Otros costos</span>
                                <span>{{ formatearNumeroSinDecimales(cotizacionSeleccionada.codificacion?.otros_costos) }}</span>
                            </div>
                            <div class="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
                                <span class="font-semibold">Fecha de vigencia</span>
                                <span>{{ formatearFechaSoloDia(cotizacionSeleccionada.codificacion?.fecha_vigencia) }}</span>
                            </div>
                            <div class="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
                                <span class="font-semibold">Fecha de autorización</span>
                                <span>{{ formatearFechaSoloDia(cotizacionSeleccionada.codificacion?.fecha_autorizacion) }}</span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { push } from "notivue"

const { consultarPorHistoria } = useConsultas()

const search = ref("")
const cotizaciones = ref([])
const cargando = ref(false)
const mostrarModalDetalle = ref(false)
const cotizacionSeleccionada = ref(null)
const cargandoDetalle = ref(false)

const fetchCotizaciones = async () => {
    if (!search.value.trim()) {
        push.warning({
            title: "Campo vacío",
            message: "Por favor ingresa un número de historia"
        })
        return
    }

    cargando.value = true
    cotizaciones.value = []

    try {
        const resultado = await consultarPorHistoria(search.value)
        
        // Validar que exista el resultado y su valor
        if (!resultado || !resultado.value) {
            push.warning({
                title: "Sin resultados",
                message: "No se encontraron cotizaciones para ese número de historia"
            })
            return
        }
        
        // Si la respuesta es una sola cotización, la convertimos en array
        const datos = Array.isArray(resultado.value) ? resultado.value : [resultado.value]
        
        // Validar que haya datos en el array
        if (datos.length === 0 || !datos[0]) {
            push.warning({
                title: "Sin resultados",
                message: "No se encontraron cotizaciones para ese número de historia"
            })
            return
        }
        
        cotizaciones.value = datos
        
        push.success({
            title: "Búsqueda exitosa",
            message: `Se encontró${cotizaciones.value.length > 1 ? 'ron' : ''} ${cotizaciones.value.length} cotización${cotizaciones.value.length > 1 ? 'es' : ''}`
        })
    } catch (error) {
        push.error({
            title: "Error",
            message: error.message || "No se pudo realizar la búsqueda"
        })
    } finally {
        cargando.value = false
    }
}

const limpiarResultados = () => {
    search.value = ""
    cotizaciones.value = []
    cerrarModalDetalle()
}

const abrirDetalle = async (cotizacion) => {
    cargandoDetalle.value = true
    mostrarModalDetalle.value = true
    cotizacionSeleccionada.value = null

    try {
        const { data, error } = await useSanctumFetch(`/api/cotizacion/${cotizacion.id}`)

        if (error.value) {
            push.error({
                title: "Error",
                message: "No se pudo cargar el detalle de la cotización"
            })
            mostrarModalDetalle.value = false
            return
        }

        cotizacionSeleccionada.value = data.value?.cotizacion || null
    } catch (error) {
        push.error({
            title: "Error",
            message: "No se pudo cargar el detalle de la cotización"
        })
        mostrarModalDetalle.value = false
    } finally {
        cargandoDetalle.value = false
    }
}

const cerrarModalDetalle = () => {
    mostrarModalDetalle.value = false
    cotizacionSeleccionada.value = null
}

const formatearFecha = (fecha) => {
    const valor = new Date(fecha)
    if (Number.isNaN(valor.getTime())) {
        return 'Fecha no disponible'
    }

    return new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(valor)
}

const formatearFechaHora = (fecha) => {
    const valor = new Date(fecha)
    if (Number.isNaN(valor.getTime())) {
        return 'Fecha no disponible'
    }

    return new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        dateStyle: 'long',
        timeStyle: 'short'
    }).format(valor)
}

const formatearFechaSoloDia = (fecha) => {
    if (!fecha) return 'N/A'

    const match = String(fecha).match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
        const [, anio, mes, dia] = match
        return `${dia}/${mes}/${anio}`
    }

    return formatearFecha(fecha)
}

const obtenerNombreMedico = (cotizacion) => {
    if (cotizacion.medico) {
        return `${cotizacion.medico.nombre}`.trim()
    }
    return "No especificado"
}

const obtenerPrimerProcedimiento = (cotizacion) => {
    if (cotizacion.items && cotizacion.items.length > 0) {
        return cotizacion.items[0].nombre
    }
    return "Sin procedimientos"
}

const tipoVista = (cotizacion) => cotizacion?.tipo_gestion === 'codificación' ? 'codificación' : 'cotización'

const procedimientosModal = computed(() => {
    if (!cotizacionSeleccionada.value?.items) return []

    const vistos = new Set()
    return cotizacionSeleccionada.value.items.filter((item) => {
        const clave = `${item.codigo || ''}-${item.nombre || ''}-${item.lateralidad || ''}`
        if (vistos.has(clave)) return false
        vistos.add(clave)
        return true
    })
})

const insumosModal = computed(() => {
    if (!cotizacionSeleccionada.value?.detalles) return []
    return cotizacionSeleccionada.value.detalles.filter((detalle) => detalle.tipo !== 'L')
})

const lentesModal = computed(() => {
    if (!cotizacionSeleccionada.value?.detalles) return []
    return cotizacionSeleccionada.value.detalles.filter((detalle) => detalle.tipo === 'L')
})

const valorLentesCodificacion = computed(() => {
    if (!cotizacionSeleccionada.value?.codificacion) return 0
    const base = Number(cotizacionSeleccionada.value.codificacion.lente || 0)
    const auxilio = Number(cotizacionSeleccionada.value.codificacion.auxilio_lente || 0)
    return Math.max(base - auxilio, 0)
})

const formatearNumero = (valor, decimals = 2) => {
    if (valor === null || valor === undefined) return '0,00'

    const numero = Number(valor)
    if (Number.isNaN(numero)) return '0,00'

    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: true,
        style: 'decimal'
    }).format(numero)
}

const formatearNumeroSinDecimales = (valor) => formatearNumero(valor, 0)
</script>
