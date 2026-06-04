<template>
    <div class="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-5">
        <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5 space-y-4">
            <h1 class="text-xl md:text-2xl font-semibold text-slate-900">Consultar cotizaciones</h1>
            <p class="text-sm text-slate-600">
                Busca con nÃºmero de identificaciÃ³n del paciente en
                <span class="uppercase text-indigo-700 font-semibold">Servinte</span>.
            </p>

            <div class="flex flex-col md:flex-row md:items-center gap-3">
                <input
                    v-model="search"
                    type="text"
                    placeholder="NÃºmero de identificaciÃ³n del paciente"
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
                No hay cotizaciones para mostrar. Realiza una bÃºsqueda.
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
                        <span class="font-medium">CÃ³digo:</span>
                        {{ cotizacion.codigo }}
                    </p>

                    <p class="text-sm text-slate-600 mt-1">
                        <span class="font-medium">Fecha:</span>
                        {{ formatearFecha(cotizacion.fecha_recepcion) }}
                    </p>

                    <p class="text-sm text-slate-600 mt-1">
                        <span class="font-medium">MÃ©dico:</span>
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
                        âœ•
                    </button>
                </div>

                <div v-if="cargandoDetalle" class="px-5 py-10 text-center text-slate-500">
                    Cargando detalle...
                </div>

                <div v-else-if="!cotizacionSeleccionada" class="px-5 py-10 text-center text-slate-500">
                    No se pudo cargar la informaciÃ³n.
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
                            <p class="mt-1"><span class="font-semibold">MÃ©dico:</span> {{ cotizacionSeleccionada.medico?.nombre || 'No especificado' }}</p>
                            <p class="mt-1"><span class="font-semibold">Entidad:</span> {{ cotizacionSeleccionada.entidad?.nombre || cotizacionSeleccionada.paciente?.entidad?.nombre || 'No especificada' }}</p>
                            <p v-if="cotizacionSeleccionada.codificacion?.numero_autorizacion" class="mt-1"><span class="font-semibold">AutorizaciÃ³n:</span> {{ cotizacionSeleccionada.codificacion.numero_autorizacion }}</p>
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

                    <section class="rounded-xl border border-slate-200 overflow-hidden">
                        <div class="bg-[#172a83] px-4 py-2 text-white font-semibold flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <span>LIQUIDACIÓN</span>
                            <span class="text-xs sm:text-sm">VALOR TOTAL: {{ formatearMoneda(totalLiquidacionModal) }}</span>
                        </div>
                        <table class="min-w-full text-left text-xs">
                            <thead class="bg-slate-100 text-slate-700">
                                <tr>
                                    <th class="px-3 py-2">Nombre</th>
                                    <th class="px-3 py-2 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(item, index) in liquidacionModal" :key="`modal-liquidacion-${index}`" class="border-t border-slate-200">
                                    <td class="px-3 py-2 font-medium text-slate-800">{{ item.nombre }}</td>
                                    <td class="px-3 py-2 text-right font-semibold text-slate-900">{{ formatearMoneda(item.valor) }}</td>
                                </tr>
                                <tr v-if="!liquidacionModal.length" class="border-t border-slate-200">
                                    <td colspan="2" class="px-3 py-4 text-center text-slate-500">Sin valores de liquidación registrados.</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <section class="rounded-xl border border-slate-200 overflow-hidden">
                        <div class="bg-[#172a83] px-4 py-2 text-white font-semibold">OBSERVACIONES</div>
                        <div class="min-h-20 bg-slate-50 px-4 py-3 text-sm whitespace-pre-line">
                            {{ cotizacionSeleccionada.observaciones || 'Sin observaciones.' }}
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
            title: "Campo vacÃ­o",
            message: "Por favor ingresa un nÃºmero de historia"
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
                message: "No se encontraron cotizaciones para ese nÃºmero de historia"
            })
            return
        }
        
        // Si la respuesta es una sola cotizaciÃ³n, la convertimos en array
        const datos = Array.isArray(resultado.value) ? resultado.value : [resultado.value]
        
        // Validar que haya datos en el array
        if (datos.length === 0 || !datos[0]) {
            push.warning({
                title: "Sin resultados",
                message: "No se encontraron cotizaciones para ese nÃºmero de historia"
            })
            return
        }
        
        cotizaciones.value = datos
        
        push.success({
            title: "BÃºsqueda exitosa",
            message: `Se encontrÃ³${cotizaciones.value.length > 1 ? 'ron' : ''} ${cotizaciones.value.length} cotizaciÃ³n${cotizaciones.value.length > 1 ? 'es' : ''}`
        })
    } catch (error) {
        push.error({
            title: "Error",
            message: error.message || "No se pudo realizar la bÃºsqueda"
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
                message: "No se pudo cargar el detalle de la cotizaciÃ³n"
            })
            mostrarModalDetalle.value = false
            return
        }

        cotizacionSeleccionada.value = data.value?.cotizacion || null
    } catch (error) {
        push.error({
            title: "Error",
            message: "No se pudo cargar el detalle de la cotizaciÃ³n"
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

const tipoVista = (cotizacion) => cotizacion?.tipo_gestion === 'codificaciÃ³n' ? 'codificaciÃ³n' : 'cotizaciÃ³n'

const procedimientosModal = computed(() => {
    if (!cotizacionSeleccionada.value?.items) return []

    const grupos = new Map()

    cotizacionSeleccionada.value.items.forEach((item) => {
        const codigo = String(item.codigo || '').trim()
        const lateralidad = String(item.lateralidad || '').trim()
        const clave = `${codigo}-${lateralidad}`

        if (!codigo || grupos.has(clave)) return

        grupos.set(clave, {
            codigo,
            nombre: item.nombre || item.connom || 'Sin nombre',
            lateralidad: lateralidad || '-',
        })
    })

    return Array.from(grupos.values())
})

const valorLentesCodificacion = computed(() => {
    if (!cotizacionSeleccionada.value?.codificacion) return 0
    const base = Number(cotizacionSeleccionada.value.codificacion.lente || 0)
    const auxilio = Number(cotizacionSeleccionada.value.codificacion.auxilio_lente || 0)
    return Math.max(base - auxilio, 0)
})

const totalDetallePorTipo = (tipo) => {
    const detalles = Array.isArray(cotizacionSeleccionada.value?.detalles)
        ? cotizacionSeleccionada.value.detalles
        : []

    return detalles
        .filter((detalle) => tipo === 'L' ? detalle.tipo === 'L' : detalle.tipo !== 'L')
        .reduce((sum, detalle) => {
            const cantidad = Number(detalle.cantidad || 1) || 1
            const valor = Number(detalle.valor || 0) || 0
            return sum + (valor * cantidad)
        }, 0)
}

const getConceptoLabel = (concepto, connom) => {
    const c = String(concepto || '').trim()
    const name = String(connom || '').trim()

    if (c === 'DP' || /DERECHOS/i.test(name)) return 'DERECHOS CLINICOS'
    if (c === 'HANQ' || /ANEST/i.test(name)) return 'HONORARIOS DE ANESTESIOLOGO'
    if (c === 'HMDQ' || /CIRUJANO/i.test(name)) return 'HONORARIOS CIRUJANO'
    if (c === 'HMLA' || /MEDICOS LASER/i.test(name)) return 'HONORARIOS MEDICOS LASER'
    if (c === 'LASH' || /LASER/i.test(name)) return 'DERECHOS CLINICOS LASER'
    if (!c) return name || 'HONORARIOS MEDICOS'

    return name || c
}

const conceptosLiquidacionModal = computed(() => {
    const items = Array.isArray(cotizacionSeleccionada.value?.items)
        ? cotizacionSeleccionada.value.items
        : []
    const grupos = new Map()

    items.forEach((item) => {
        const concepto = item.concepto || 'SIN_CONCEPTO'
        const connom = item.connom || item.nombre_concepto || ''
        const key = `${concepto}-${connom}`
        const cantidad = Number(item.cantidad || 1) || 1
        const valor = Number(item.valor || item.valor_unitario || 0) || 0

        if (!grupos.has(key)) {
            grupos.set(key, {
                nombre: getConceptoLabel(concepto, connom),
                valor: 0,
            })
        }

        grupos.get(key).valor += valor * cantidad
    })

    return Array.from(grupos.values()).filter((item) => Number(item.valor || 0) > 0)
})

const totalLentesModal = computed(() => {
    const totalDetalle = totalDetallePorTipo('L')
    return totalDetalle > 0 ? totalDetalle : Number(valorLentesCodificacion.value || 0)
})

const totalInsumosModal = computed(() => {
    const totalDetalle = totalDetallePorTipo('I')
    const totalCodificacion = Number(cotizacionSeleccionada.value?.codificacion?.insumos || 0)
    return totalDetalle > 0 ? totalDetalle : totalCodificacion
})

const polizaModal = computed(() => cotizacionSeleccionada.value?.poliza || null)
const valorPolizaModal = computed(() => Number(polizaModal.value?.valor_poliza ?? cotizacionSeleccionada.value?.valor_poliza ?? 0) || 0)

const liquidacionModal = computed(() => {
    const rows = [...conceptosLiquidacionModal.value]

    if (totalLentesModal.value > 0) rows.push({ nombre: 'LENTE INTRAOCULAR', valor: totalLentesModal.value })
    if (totalInsumosModal.value > 0) rows.push({ nombre: 'INSUMOS', valor: totalInsumosModal.value })
    if (valorPolizaModal.value > 0) rows.push({ nombre: 'POLIZA', valor: valorPolizaModal.value })

    return rows
})

const totalLiquidacionModal = computed(() =>
    liquidacionModal.value.reduce((sum, item) => sum + (Number(item.valor) || 0), 0)
)

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

const formatearMoneda = (valor) => `$${formatearNumero(valor, 0)}`
</script>
