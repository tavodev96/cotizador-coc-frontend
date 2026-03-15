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
                        <nuxt-link
                            :to="`/cotizacion/imprimir/${cotizacion.id}?modo=consulta`"
                            class="inline-flex items-center h-9 px-3 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-sm font-medium"
                        >
                            Ver cotización
                        </nuxt-link>
                        <span class="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-full">
                            {{ cotizacion.paciente?.numero_identificacion || 'Sin historia' }}
                        </span>
                    </div>
                </article>
            </div>
        </section>
    </div>
</template>

<script setup>
import { ref } from "vue"
import { push } from "notivue"

const { consultarPorHistoria } = useConsultas()

const search = ref("")
const cotizaciones = ref([])
const cargando = ref(false)

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
}

const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
    })
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
</script>