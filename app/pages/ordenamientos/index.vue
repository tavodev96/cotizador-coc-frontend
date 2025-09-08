<script setup>
import { Notivue, Notification, filledIcons } from 'notivue'

definePageMeta({
    middleware: ['sanctum:auth'],
})

const config = useRuntimeConfig()
const router = useRouter();
const search = ref('')
const fechaInicio = ref('')
const fechaFin = ref('')
const data = ref([])           // Datos completos
const page = ref(1)
const perPage = 10
const loading = ref(false)

const fetchData = async () => {
    if (!fechaInicio.value || !fechaFin.value) {
        pushNotification('error', 'Por favor, seleccione las fechas de inicio y fin.', 'Error');
        return
    }
    loading.value = true
    try {
        const response = await $fetch(`${config.public.apiBase}/ordenamientos`, {
            method: 'GET',
            credentials: "include",
            params: {
                fecha_inicio: fechaInicio.value,
                fecha_fin: fechaFin.value,
                numero_historia: search.value
            }
        })

        data.value = Array.isArray(response) ? response : (response || [])
        page.value = 1
    } catch (error) {
        console.error('Error cargando datos:', error)
    } finally {
        loading.value = false
    }
}

const generarCotizacion = (item) => {
    router.push({
        name: 'gestion-cotizacion', // Nombre de la ruta de tu formulario
        query: {
            tipo_identificacion: 'CC', // si la tienes
            numero_identificacion: item.pacide,
            nombres: item.pacnom,
            apellidos: item.pacape,
            entidad_cod: item.empcod,
            entidad: item.empnom,
            medico: item.medico,
            medico_id: item.ideide,
            consultorio: item.n_consultorio,
            procedimiento: item.actnom,
            id_ordenamiento: item.id_ordenamiento,
            codigo: item.actcfa
        }
    });
};

const totalPages = computed(() => Math.ceil(data.value.length / perPage))

const paginatedData = computed(() =>
    data.value.slice((page.value - 1) * perPage, page.value * perPage)
)

const nextPage = () => {
    if (page.value < totalPages.value) page.value++
}
const prevPage = () => {
    if (page.value > 1) page.value--
}

const clearFilters = () => {
    search.value = ''
    fechaInicio.value = ''
    fechaFin.value = ''
}

const pushNotification = (type, message, title) => {
    push[type]({
        title: title,
        message: message,
        ariaRole: 'alert'
    })
}
</script>

<template>
    <div class="p-4">
        <Notivue v-slot="item">
            <Notification :item="item" :icons="filledIcons" />
        </Notivue>
        <div class="mb-4 flex gap-2">
            <input v-model="search" placeholder="N° identificación paciente" class="border px-2 py-1" />
            <input type="date" v-model="fechaInicio" class="border px-2 py-1" />
            <input type="date" v-model="fechaFin" class="border px-2 py-1" />
            <button @click="fetchData" class="bg-blue-500 text-white px-4 py-1 rounded">
                Buscar
            </button>
            <button @click="clearFilters" class="bg-gray-400 text-white px-4 py-2 rounded">
                Limpiar
            </button>
        </div>

        <div v-if="loading" class="text-gray-500">Cargando...</div>

        <table v-else class="table-auto w-full border">
            <thead>
                <tr>
                    <th class="border px-2 py-1">Identificación</th>
                    <th class="border px-2 py-1">ID Servinte</th>
                    <th class="border px-2 py-1">Entidad</th>
                    <th class="border px-2 py-1">Fecha</th>
                    <th class="border px-2 py-1">Procedimiento</th>
                    <th class="border px-2 py-1">Consultorio</th>
                    <th class="border px-2 py-1">Medico</th>
                    <th class="border px-2 py-1">Acciones</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="item in paginatedData" :key="item.id">
                    <td class="border px-2 py-1">{{ item.pacide }}</td>
                    <td class="border px-2 py-1">{{ item.id_ordenamiento }}</td>
                    <td class="border px-2 py-1">{{ item.empnom }}</td>
                    <td class="border px-2 py-1">{{ item.f_ordenamiento }}</td>
                    <td class="border px-2 py-1">{{ item.actnom }}</td>
                    <td class="border px-2 py-1">{{ item.n_consultorio }}</td>
                    <td class="border px-2 py-1">{{ item.medico }}</td>
                    <td class="border px-2 py-1">
                        <button @click="generarCotizacion(item)" class="text-blue-500">
                            Generar cotización
                        </button>

                    </td>
                </tr>
            </tbody>
        </table>

        <div class="flex justify-between mt-4">
            <button @click="prevPage" :disabled="page === 1">Anterior</button>
            <span>Página {{ page }} de {{ totalPages }}</span>
            <button @click="nextPage" :disabled="page === totalPages">Siguiente</button>
        </div>
    </div>
</template>
