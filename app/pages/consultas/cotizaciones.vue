<template>
    <div class="p-6">
        <h2 class="text-2xl font-bold">Consultar Cotizaciones</h2>
        <p>Busca con numero de historia que tiene el paciente en <span
                class="uppercase text-blue-900 font-bold">Servinte</span></p>

        <div class="flex items-center gap-4 mt-4">
            <input v-model="search" type="text" placeholder="Número de historia"
                class="border border-gray-300 rounded px-4 py-2 w-full md:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
                @keyup.enter="fetchCotizaciones"
                :disabled="cargando">
            <button @click="fetchCotizaciones" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="cargando">
                {{ cargando ? "Buscando..." : "Buscar" }}
            </button>
            <button v-if="cotizaciones.length > 0 || search" @click="limpiarResultados" 
                class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                :disabled="cargando">
                Limpiar
            </button>
        </div>

        <div v-if="cotizaciones.length === 0 && !cargando" class="mt-6 text-center text-gray-500">
            <p>No hay cotizaciones para mostrar. Realiza una búsqueda.</p>
        </div>

        <div v-if="cargando" class="mt-6 text-center">
            <p class="text-gray-600">Cargando...</p>
        </div>

        <div v-if="cotizaciones.length > 0" class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="cotizacion in cotizaciones" :key="cotizacion.id"
                class="bg-white shadow-md rounded-xl p-4 border hover:shadow-lg transition h-fit">
                <div class="flex">
                    <h3 class="text-lg font-semibold text-blue-900">
                        {{ obtenerPrimerProcedimiento(cotizacion) }}
                    </h3>
                </div>

                <p class="text-sm text-gray-600 mt-2">
                    <span class="font-medium">Código:</span>
                    {{ cotizacion.codigo }}
                </p>

                <p class="text-sm text-gray-600 mt-2">
                    <span class="font-medium">Fecha:</span>
                    {{ formatearFecha(cotizacion.fecha_recepcion) }}
                </p>

                <p class="text-sm text-gray-600">
                    <span class="font-medium">Médico:</span>
                    {{ obtenerNombreMedico(cotizacion) }}
                </p>

                <p class="text-sm text-gray-600">
                    <span class="font-medium">Estado: </span>
                    <span class="font-semibold" :class="{
                        'text-green-600': cotizacion.estado?.nombre === 'Aprobada',
                        'text-yellow-600': cotizacion.estado?.nombre === 'Pendiente',
                        'text-red-600': cotizacion.estado?.nombre === 'Rechazada'
                    }">
                        {{ cotizacion.estado?.nombre || 'Sin estado' }}
                    </span>
                </p>

                <div class="mt-2 flex justify-between items-center gap-2">
                    <nuxt-link :to="`/cotizacion/imprimir/${cotizacion.id}?modo=consulta`" class="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600">
                        Ver Cotización
                    </nuxt-link>
                    <span class="text-xs font-semibold text-white bg-neutral-600 px-2 py-1 rounded-full">
                        {{ cotizacion.paciente?.numero_identificacion || 'Sin historia' }}
                    </span>
                </div>

            </div>
        </div>
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