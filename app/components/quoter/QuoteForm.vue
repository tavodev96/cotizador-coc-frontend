<template>
    <div class="bg-white rounded-xl shadow p-6 max-w-6xl mx-auto">
        <div class="max-w-5xl mx-auto p-4 bg-white rounded shadow">
            <h2 class="text-xl font-bold mb-4">Crear Cotización</h2>
            <Notivue v-slot="item">
                <Notification :item="item" :icons="filledIcons" class="text-2xl" />
            </Notivue>
            <!-- Paciente -->
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="font-semibold">Tipo de identificación</label>
                    <select v-model="paciente.tipo_identificacion" class="w-full h-12 border rounded p-2">
                        <option value="CC">CC</option>
                        <option value="CE">CE</option>
                        <option value="TI">TI</option>
                    </select>
                </div>
                <div>
                    <label class="font-semibold">Número de identificación</label>
                    <div class="flex gap-2">
                        <input v-model="paciente.numero_identificacion" type="text"
                            class="w-full h-12 border rounded p-2" />
                        <button type="button" @click="buscarPaciente"
                            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                            Buscar
                        </button>
                    </div>
                </div>

                <div>
                    <label class="font-semibold">Nombres</label>
                    <input v-model="paciente.nombres" type="text" class="w-full h-12 border rounded p-2" />
                </div>
                <div>
                    <label class="font-semibold">Apellidos</label>
                    <input v-model="paciente.apellidos" type="text" class="w-full h-12 border rounded p-2" />
                </div>
                <div>
                    <label class="font-semibold">Correo</label>
                    <input v-model="paciente.correo" type="email" class="w-full h-12 border rounded p-2" />
                </div>
                <div>
                    <label class="font-semibold">Teléfono</label>
                    <input v-model="paciente.telefono" type="text" class="w-full h-12 border rounded p-2" />
                </div>
                <div>
                    <label class="font-semibold">Entidad</label>
                    <select v-model="paciente.entidad_id" class="w-full h-12 border rounded p-2">
                        <option v-for="entidad in entidades" :key="entidad.id" :value="entidad.id">{{ entidad.nombre }}
                        </option>
                    </select>
                </div>
            </div>

            <!-- Cotización -->
            <div class="mt-6">
                <label class="font-semibold">Fecha de recepción</label>
                <input type="text" :value="new Date().toISOString().split('T')[0]"
                    class="w-full h-12 border rounded p-2 bg-gray-100" disabled />

                <label class="font-semibold mt-4 block">Tipo de gestión</label>
                <select v-model="cotizacion.tipo_gestion" class="w-full h-12 border rounded p-2">
                    <option v-for="tipo in tiposGestion" :key="tipo" :value="tipo">{{ tipo }}</option>
                </select>

                <label class="font-semibold mt-4 block">Médico</label>
                <select v-model="cotizacion.medico_id" class="w-full h-12 border rounded p-2">
                    <option v-for="medico in medicos" :key="medico.id" :value="medico.id">{{ medico.nombre }}</option>
                </select>

                <label class="font-semibold mt-4 block">Consultorio</label>
                <select v-model="cotizacion.consultorio_id" class="w-full h-12 border rounded p-2">
                    <option v-for="c in consultorios" :key="c.id" :value="c.id">{{ c.nombre }}</option>
                </select>

                <div class="md:col-span-2 mt-4">
                    <h3 class="text-lg font-bold mb-2">Ítems de cotización</h3>
                    <div v-for="(item, index) in cotizacion.items" :key="index"
                        class="grid grid-cols-12 gap-2 mb-2 items-center">

                        <input v-model="item.codigo" @blur="buscarCodigo(item.codigo, index)" placeholder="Código"
                            class="p-2 border rounded col-span-2" />


                        <input v-model="item.nombre" placeholder="Nombre" class="p-2 border rounded col-span-4" />
                        <select v-model="item.lateralidad" class="p-2 border rounded col-span-2">
                            <option v-for="lateral in lateralidad" :key="lateral" :value="lateral">{{ lateral }}
                            </option>
                        </select>

                        <input :value="item.valor_con_descuento ?? item.valor" placeholder="Valor"
                            class="p-2 border rounded col-span-2" type="number" disabled />


                        <input v-model.number="item.descuento" placeholder="% Desc" @change="calcularTotal(index)"
                            class="p-2 border rounded col-span-1" type="number" min="0" max="100" />


                        <button @click="eliminarItem(index)"
                            class="text-red-600 font-bold text-xl hover:text-red-800 col-span-1">×</button>
                    </div>


                    <button type="button" @click="agregarItem" class="mt-2 text-sm text-blue-600 hover:underline">+
                        Agregar ítem</button>
                </div>
                <div class="mt-4 text-right text-lg font-bold">
                    Total: ${{ total }}
                </div>
                <label class="font-semibold mt-4 block">Observaciones</label>
                <textarea v-model="cotizacion.observaciones" class="w-full h-24 border rounded p-2"></textarea>
                <button @click="guardarCotizacion"
                    class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Guardar cotización
                </button>

            </div>
        </div>

    </div>

    <!-- Modal selección de códigos -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h3 class="text-lg font-bold mb-4">Selecciona un código</h3>

            <div v-for="(r, idx) in resultadosCodigo" :key="idx" class="flex items-center mb-2">
                <input type="radio" :id="'codigo-' + idx" name="codigoSeleccionado" :value="r"
                    v-model="codigoSeleccionado" class="mr-2" />
                <label :for="'codigo-' + idx" class="cursor-pointer">
                    {{ r.protarpro }} - [{{ r.protartar }}] - {{ r.actnom }} <br /> ( ${{ r.protarval }} )
                </label>
            </div>

            <div class="mt-4 flex justify-end gap-2">
                <button @click="showModal = false" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                    Cancelar
                </button>
                <button @click="confirmarCodigo" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    :disabled="!codigoSeleccionado">
                    Confirmar
                </button>
            </div>
        </div>
    </div>

</template>
<script setup>
import { Notivue, Notification, filledIcons } from 'notivue'
const route = useRoute();

const paciente = ref({
    id: null,
    tipo_identificacion: '',
    numero_identificacion: '',
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    entidad_id: null
})

const cotizacion = ref({
    tipo_gestion: '',
    medico_id: '',
    consultorio_id: '',
    observaciones: '',
    items: [],
    total: 0
})

const entidades = ref([])
const medicos = ref([])
const consultorios = ref([])
const tiposGestion = ['cotización', 'información', 'codificación']
const lateralidad = ['izquierda', 'derecha', 'ambos']

const showModal = ref(false)
const resultadosCodigo = ref([])
const itemSeleccionadoIndex = ref(null)
const codigoSeleccionado = ref(null)

onMounted(async () => {

    try {
        const { data, status, error, refresh, clear } = await useAsyncData(
            'catalogos', () => useSanctumFetch('/api/catalogos')
        );
        if (status.value == 'success') {
            medicos.value = data.value.data.value.medicos
            consultorios.value = data.value.data.value.consultorios
            entidades.value = data.value.data.value.entidades
        }

        if (route.query) {

            if (route.query.numero_identificacion) {
                paciente.value.numero_identificacion = route.query.numero_identificacion
                await buscarPaciente()
            }
            syncEntidadFromQuery()
            syncMedicoFromQuery()
            syncConsultorioFromQuery()
            await buscarCodigo(route.query.codigo, 0)
        }

    } catch (err) {
        console.error('❌ Error cargando catálogos:', err)
    }
})



const syncEntidadFromQuery = () => {
    const q = route.query?.entidad
    if (!q || !entidades.value.length) return

    const match = entidades.value.find(
        e => String(e.nombre).trim().toLowerCase() === String(q).trim().toLowerCase()
    )
    if (match) {
        paciente.value.entidad_id = Number(match.id)
    }
}

const syncMedicoFromQuery = () => {

    const q = route.query?.medico_id
    if (!q || !medicos.value.length) return

    const match = medicos.value.find(
        e => e.identificacion === q
    )
    if (match) {
        cotizacion.value.medico_id = Number(match.id)
    }
}


const syncConsultorioFromQuery = () => {

    const q = route.query?.consultorio
    if (!q || !consultorios.value.length) return

    const match = consultorios.value.find(
        e => e.codigo === q
    )
    if (match) {
        cotizacion.value.consultorio_id = Number(match.id)
    }
}

const agregarItem = () => {
    cotizacion.value.items.push({ codigo: '', nombre: '', lateralidad: '', valor: 0 })
}

const eliminarItem = (index) => {
    cotizacion.value.items.splice(index, 1)
}

const total = computed(() =>
  cotizacion.value.items.reduce((sum, item) => {
    const valor = item.valor_con_descuento
      ? Number(item.valor_con_descuento)
      : Number(item.valor || 0);

    return sum + valor;
  }, 0)
);

const pushNotification = (type, message, title) => {
    push[type]({
        title: title,
        message: message,
        ariaRole: 'alert'
    })
}

const buscarCodigo = async (codigo, index) => {

    if (!codigo) return;

    try {
        const { data, error } = await useSanctumFetch(`/api/codigos/buscar/${codigo}`);

        if (data.value === null) {
            pushNotification('error', 'Código no encontrado', 'Error');
            return;
        } else {
            if (data.value.length === 1) {
                console.log("vamos por aca");
                
                const unico = data.value
                Object.assign(cotizacion.value.items[index], {
                    codigo: unico.protarpro,
                    nombre: unico.actnom,
                    valor: unico.protarval,
                    descuento: null
                })
            } else {
                resultadosCodigo.value = data.value
                itemSeleccionadoIndex.value = index
                showModal.value = true
            }
        }
    } catch (err) {
        pushNotification('error', 'Código no encontrado', 'Error');
        console.error("❌ Error buscando código:", err);
    }
};

const confirmarCodigo = () => {
    console.log(itemSeleccionadoIndex.value, cotizacion.value);

    if (codigoSeleccionado.value) {
        const nuevoItem = {
            codigo: codigoSeleccionado.value.protarpro,
            nombre: codigoSeleccionado.value.actnom,
            valor: codigoSeleccionado.value.protarval,
            descuento: 0
        };

        if (
            itemSeleccionadoIndex.value !== null &&
            cotizacion.value.items[itemSeleccionadoIndex.value]
        ) {
            // Si existe, asigno sobre el existente
            Object.assign(cotizacion.value.items[itemSeleccionadoIndex.value], nuevoItem);
        } else {
            // Si NO existe, lo agrego como nuevo
            cotizacion.value.items.push(nuevoItem);
        }

        pushNotification('success', 'Código seleccionado correctamente', 'Éxito');
    }

    // Resetear modal
    showModal.value = false;
    codigoSeleccionado.value = null;
    itemSeleccionadoIndex.value = null;
};

const calcularTotal = (index) => {
    const item = cotizacion.value.items[index];
    item.valor_con_descuento = item.valor - (item.valor * (item.descuento / 100));
    cotizacion.value.items[index] = { ...item };
}

const buscarPaciente = async () => {

    try {
        const { data, error } = await useSanctumFetch(`/api/pacientes/${paciente.value.numero_identificacion}`);

        if (error.value) {
            alert('Paciente no encontrado');
            return;
        }

        if (data.value?.found) {
            const p = data.value.paciente;
            paciente.value.id = p.id || null;
            paciente.value.tipo_identificacion = p.tipo_identificacion || '';
            paciente.value.nombres = p.nombres || '';
            paciente.value.apellidos = p.apellidos || '';
            paciente.value.correo = p.correo || '';
            paciente.value.telefono = p.telefono || '';
            paciente.value.entidad_id = p.entidad_id || '';
        }

    } catch (err) {
        console.error('❌ Error buscando paciente:', err);
    }
};

const guardarCotizacion = async () => {
    try {
        let payload = {
            tipo_gestion: cotizacion.value.tipo_gestion,
            medico_id: cotizacion.value.medico_id,
            entidad_id: paciente.value.entidad_id,
            consultorio_id: cotizacion.value.consultorio_id,
            observaciones: cotizacion.value.observaciones,
            items: cotizacion.value.items.map(item => ({
                codigo: item.codigo,
                nombre: item.nombre,
                lateralidad: item.lateralidad,
                valor: Number(item.valor)
            }))
        };

        if (paciente.value.id) {
            payload.paciente_id = paciente.value.id;
        } else {
            payload = {
                ...payload,
                nombre_paciente: paciente.value.nombres,
                apellidos_paciente: paciente.value.apellidos,
                tipo_identificacion: paciente.value.tipo_identificacion,
                numero_identificacion: paciente.value.numero_identificacion,
                correo: paciente.value.correo,
                telefono: paciente.value.telefono
            };
        }

        const { data, status, error, refresh, clear } = await useAsyncData('cotizacion', () => useSanctumFetch('/api/cotizaciones', {
            method: 'POST',
            body: payload,
        }));

        console.log('✅ Respuesta al guardar:', data.value)

        if (data.value.status.value !== 'success') {
            pushNotification('error', 'Error al guardar la cotización', 'Error');
            return
        } else {
            pushNotification('success', `Cotización creada con código:\n${data.value.data.value.codigo}`, 'Éxito');
        }

        paciente.value = { tipo_identificacion: '', numero_identificacion: '', nombres: '', apellidos: '', correo: '', telefono: '', entidad_id: '' }
        cotizacion.value = { tipo_gestion: '', medico_id: '', consultorio_id: '', observaciones: '', items: [] }
    } catch (err) {
        console.error('❌ Error inesperado:', err)
    }
}


</script>
