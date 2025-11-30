<template>
    <div class="bg-white rounded-xl shadow p-6 max-w-6xl mx-auto">
        <div v-if="extracting" class="max-w-5xl mx-auto p-4 bg-white rounded shadow">
            <div class="flex justify-center items-center gap-2">
                <svg width="32" height="32" viewBox="0 0 38 38">
                    <g transform="translate(19 19)">
                        <g transform="rotate(0)">
                            <circle cx="0" cy="12" r="3" fill="#3b82f6" opacity="0.125">
                                <animate attributeName="opacity" from="0.125" to="0.125" dur="1.2s" begin="0s"
                                    repeatCount="indefinite" keyTimes="0;1" values="1;0.125"></animate>
                            </circle>
                        </g>
                        <g transform="rotate(45)">
                            <circle cx="0" cy="12" r="3" fill="#3b82f6" opacity="0.25">
                                <animate attributeName="opacity" from="0.25" to="0.25" dur="1.2s" begin="0.15s"
                                    repeatCount="indefinite" keyTimes="0;1" values="1;0.25"></animate>
                            </circle>
                        </g>
                        <g transform="rotate(90)">
                            <circle cx="0" cy="12" r="3" fill="#3b82f6" opacity="0.375">
                                <animate attributeName="opacity" from="0.375" to="0.375" dur="1.2s" begin="0.3s"
                                    repeatCount="indefinite" keyTimes="0;1" values="1;0.375"></animate>
                            </circle>
                        </g>
                        <g transform="rotate(135)">
                            <circle cx="0" cy="12" r="3" fill="#3b82f6" opacity="0.5">
                                <animate attributeName="opacity" from="0.5" to="0.5" dur="1.2s"
                                    begin="0.44999999999999996s" repeatCount="indefinite" keyTimes="0;1" values="1;0.5">
                                </animate>
                            </circle>
                        </g>
                        <g transform="rotate(180)">
                            <circle cx="0" cy="12" r="3" fill="#3b82f6" opacity="0.625">
                                <animate attributeName="opacity" from="0.625" to="0.625" dur="1.2s" begin="0.6s"
                                    repeatCount="indefinite" keyTimes="0;1" values="1;0.625"></animate>
                            </circle>
                        </g>
                    </g>
                </svg>
                <span class="text-gray-600">Extrayendo información...</span>
            </div>
        </div>
        <div v-else class="max-w-5xl mx-auto p-4 bg-white rounded shadow">
            <h2 class="text-xl font-bold mb-4">Crear Cotización</h2>
            <Notivue v-slot="item">
                <Notification :item="item" :icons="filledIcons" class="text-2xl" />
            </Notivue>
            <!-- Paciente -->
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="font-semibold">Tipo de identificación</label>
                    <select v-model="paciente.tipo_identificacion" class="w-full h-12 border rounded p-2"
                        :disabled="paciente.id">
                        <option value="CC">CC</option>
                        <option value="CE">CE</option>
                        <option value="TI">TI</option>
                        <option value="PA">PA</option>
                    </select>
                </div>
                <div>
                    <label class="font-semibold">Número de identificación</label>
                    <div class="flex gap-2">
                        <input v-model="paciente.numero_identificacion" type="text"
                            class="w-full h-12 border rounded p-2" :disabled="paciente.id" />
                        <button type="button" @click="buscarPaciente"
                            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            :disabled="loadingPaciente">
                            <span v-if="loadingPaciente">Buscando...</span>
                            <span v-else>Buscar</span>
                        </button>
                    </div>
                </div>

                <div>
                    <label class="font-semibold">Nombres</label>
                    <input v-model="paciente.nombres" type="text" class="w-full h-12 border rounded p-2"
                        :disabled="paciente.id" />
                </div>
                <div>
                    <label class="font-semibold">Apellidos</label>
                    <input v-model="paciente.apellidos" type="text" class="w-full h-12 border rounded p-2"
                        :disabled="paciente.id" />
                </div>
                <div>
                    <label class="font-semibold">Correo</label>
                    <input v-model="paciente.correo" type="email" class="w-full h-12 border rounded p-2"
                        :disabled="paciente.id" />
                </div>
                <div>
                    <label class="font-semibold">Teléfono</label>
                    <input v-model="paciente.telefono" type="text" class="w-full h-12 border rounded p-2"
                        :disabled="paciente.id" />
                </div>
                <div>
                    <label class="font-semibold">Entidad</label>
                    <!-- :disabled="paciente.id" -->
                    <select v-model="paciente.entidad_id" class="w-full h-12 border rounded p-2">
                        <option v-for="entidad in entidades" :key="entidad.id" :value="entidad.id">{{ entidad.nombre }}
                        </option>
                    </select>
                </div>
                <div>
                    <label class="font-semibold">Origen:</label>
                    <select v-model="cotizacion.origen" class="w-full h-12 border rounded p-2">
                        <option value="" select disabled>Seleccionar origen del ordenamiento</option>
                        <option value="1">Consultorio privado</option>
                        <option value="2">Consultorio institucional</option>
                    </select>
                </div>
            </div>

            <!-- Cotización -->
            <div class="mt-6">
                <label class="font-semibold">Fecha de recepción</label>
                <input type="text" :value="new Date().toISOString().split('T')[0]"
                    class="w-full h-12 border rounded p-2 bg-gray-100" disabled />

                <div :class="[{ 'flex items-center justify-center gap-2 mt-4': isCodificacion }]">
                    <div :class="[{ 'w-1/2': isCodificacion, 'w-full mt-4': !isCodificacion }]">
                        <label class="font-semibold mt-4">Tipo de gestión</label>
                        <select v-model="cotizacion.tipo_gestion" class="w-full h-12 border rounded p-2">
                            <option v-for="tipo in tiposGestion" :key="tipo" :value="tipo">{{ tipo }}</option>
                        </select>
                    </div>
                    <div v-if="isCodificacion" class="w-1/2">
                        <label class="font-semibold">Número de autorización</label>
                        <input v-model="codificacion.autorizacion" type="text" class="w-full h-12 border rounded p-2" />
                    </div>
                </div>
                <!-- :disabled="isdoctorDisabled" -->
                <label class="font-semibold mt-4 block">Médico</label>
                <select v-model="cotizacion.medico_id" class="w-full h-12 border rounded p-2">
                    <option v-for="medico in medicos" :key="medico.id" :value="medico.id">{{ medico.nombre }}</option>
                </select>

                <label class="font-semibold mt-4 block">Consultorio</label>
                <select v-model="cotizacion.consultorio_id" class="w-full h-12 border rounded p-2"
                    :disabled="isconsultorioDisabled">
                    <option v-for="c in consultorios" :key="c.id" :value="c.id">{{ c.nombre }}</option>
                </select>

                <div class="md:col-span-2 mt-4">
                    <div class="flex items-center gap-2 mb-2">
                        <h3 class="text-lg font-bold">Procedimientos</h3>
                        <div v-if="loadingBuscarCodigo" class="w-fit flex justify-center items-center gap-2 bg-blue-600 text-white px-2 py-1 rounded">
                            <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none"
                                viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                            <span>Buscando código...</span>
                        </div>
                    </div>
                    <div v-for="(item, index) in cotizacion.items" :key="index"
                        class="grid grid-cols-12 gap-2 mb-2 items-center">

                        <input v-model="item.codigo" @blur="buscarCodigo(item.codigo, index)" placeholder="Código"
                            class="p-2 border rounded"
                            :class="[{ 'col-span-3': isCodificacion, 'col-span-2': !isCodificacion }]" />


                        <input v-model="item.nombre" placeholder="Nombre"
                            :class="[{ 'p-2 border rounded col-span-6': isCodificacion, 'p-2 border rounded col-span-4': !isCodificacion }]" />

                        <select v-show="!isCodificacion" v-model="item.lateralidad" @change="aplicarFormulaLateralidad"
                            class="p-2 border rounded col-span-2">
                            <option v-for="lateral in lateralidad" :key="lateral" :value="lateral">{{ lateral }}
                            </option>
                        </select>

                        <input v-show="!isCodificacion" :value="formatearNumero(item.valor_con_descuento ?? item.valor)"
                            placeholder="Valor" class="p-2 border rounded col-span-2" type="text" disabled />


                        <input v-show="!isCodificacion" v-model.number="item.descuento" placeholder="% Desc"
                            @change="calcularTotal(index)" class="p-2 border rounded col-span-1" type="number" min="0"
                            max="100" />


                        <button @click="eliminarItem(index)"
                            class="text-red-600 font-bold text-xl hover:text-red-800 col-span-1">×</button>
                    </div>


                    <button type="button" @click="agregarItem" class="mt-2 text-sm text-blue-600 hover:underline">+
                        Agregar procedimiento</button>
                </div>

                <!-- insumos -->

                <div class="md:col-span-2 mt-6">
                    <h3 class="text-lg font-bold mb-2">Insumos</h3>

                    <div v-for="(insumo, index) in cotizacion.insumos" :key="index"
                        class="grid grid-cols-12 gap-2 mb-2 items-center">

                        <input v-model="insumo.codigo" placeholder="Código" class="p-2 border rounded"
                            :class="[{ 'col-span-3': isCodificacion, 'col-span-1': !isCodificacion }]" disabled />
                        <input v-model="insumo.nombre" placeholder="Nombre" class="p-2 border rounded col-span-4"
                            :class="[{ 'col-span-6': isCodificacion, 'col-span-4': !isCodificacion }]" disabled />

                        <!-- Valor unitario -->
                        <input v-show="!isCodificacion" v-model.number="insumo.valor" type="hidden" />
                        <input v-show="!isCodificacion" :value="formatearNumero(insumo.valor)" type="text"
                            class="p-2 border rounded col-span-2" disabled placeholder="Valor" />

                        <!-- Cantidad -->
                        <input v-show="!isCodificacion" v-model.number="insumo.cantidad" placeholder="Cantidad"
                            type="number" min="1" class="p-2 border rounded col-span-2" />

                        <!-- Subtotal calculado -->
                        <span v-show="!isCodificacion" class="col-span-2 text-right font-semibold">
                            {{ (insumo.cantidad * insumo.valor).toLocaleString('es-CO', {
                                style: 'currency', currency:
                                    'COP'
                            }) }}
                        </span>

                        <button @click="eliminarInsumo(index)"
                            class="text-red-600 font-bold text-xl hover:text-red-800 col-span-1">×</button>
                    </div>

                    <button type="button" @click="abrirModalInsumos" class="mt-2 text-sm text-blue-600 hover:underline">
                        + Agregar insumo
                    </button>
                </div>

                <!-- lentes -->
                <div class="md:col-span-2 mt-6">
                    <h3 class="text-lg font-bold mb-2">Lentes</h3>

                    <div v-for="(lente, index) in cotizacion.lentes" :key="index"
                        class="grid grid-cols-12 gap-2 mb-2 items-center">

                        <!-- Código -->
                        <input v-model="lente.codigo" placeholder="Código" class="p-2 border rounded"
                            :class="[{ 'col-span-3': isCodificacion, 'col-span-1': !isCodificacion }]" disabled />

                        <!-- Nombre -->
                        <input v-model="lente.nombre" placeholder="Nombre" class="p-2 border rounded"
                            :class="[{ 'col-span-6': isCodificacion, 'col-span-4': !isCodificacion }]" disabled />

                        <!-- Valor unitario -->
                        <input v-model.number="lente.valor" type="hidden" />
                        <input v-show="!isCodificacion" :value="formatearNumero(lente.valor)" type="text"
                            class="p-2 border rounded col-span-2" disabled placeholder="Valor" />

                        <!-- Cantidad -->
                        <input v-show="!isCodificacion" v-model.number="lente.cantidad" placeholder="Cantidad"
                            type="number" min="1" class="p-2 border rounded col-span-2" />

                        <!-- Subtotal calculado -->
                        <span v-show="!isCodificacion" class="col-span-2 text-right font-semibold">
                            {{ (lente.cantidad * lente.valor).toLocaleString('es-CO', {
                                style: 'currency',
                                currency: 'COP'
                            }) }}
                        </span>

                        <!-- Botón eliminar -->
                        <button @click="eliminarLente(index)"
                            class="text-red-600 font-bold text-xl hover:text-red-800 col-span-1">×</button>
                    </div>

                    <!-- Botón abrir modal -->
                    <button type="button" @click="abrirModalLentes" class="mt-2 text-sm text-blue-600 hover:underline">
                        + Agregar lente
                    </button>
                </div>

                <!-- Modal -->
                <QuoterLentesModal v-if="showModalLentes" :show="showModalLentes" @close="showModalLentes = false"
                    @select="agregarLentes" />


                <QuoterInsumosModal :show="showInsumosModal" @close="showInsumosModal = false"
                    @select="agregarInsumo" />

                <QuoterCodificacion v-if="isCodificacion" @update:valores="valoresCodificacion" class="mt-4"
                    :lentes="totalLentes" />

                <div class="mt-4 text-right text-xl font-bold">
                    <!-- Valor Total cotización: {{ total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) }} -->
                    Valor total cotización:{{ totalCotizacion.toLocaleString('es-CO', {
                        style: 'currency', currency:
                            'COP'
                    }) }}
                </div>

                <label class="font-semibold mt-4 block">Observaciones</label>
                <textarea v-model="cotizacion.observaciones" class="w-full h-24 border rounded p-2"></textarea>
                <div class="flex justify-center items-center gap-2">
                    <button @click="guardarCotizacion" :disabled="loading"
                        class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">

                        <span v-if="!loading" class="inline-block ml-2 ">Guardar cotización</span>
                        <span v-else class="flex justify-center items-center gap-1 ml-2 ">
                            <svg width="32" height="32" viewBox="0 0 38 38">
                                <g transform="translate(19 19)">
                                    <g transform="rotate(0)">
                                        <circle cx="0" cy="12" r="3" fill="#ffffff" opacity="0.125">
                                            <animate attributeName="opacity" from="0.125" to="0.125" dur="1.2s"
                                                begin="0s" repeatCount="indefinite" keyTimes="0;1" values="1;0.125">
                                            </animate>
                                        </circle>
                                    </g>
                                    <g transform="rotate(45)">
                                        <circle cx="0" cy="12" r="3" fill="#ffffff" opacity="0.25">
                                            <animate attributeName="opacity" from="0.25" to="0.25" dur="1.2s"
                                                begin="0.15s" repeatCount="indefinite" keyTimes="0;1" values="1;0.25">
                                            </animate>
                                        </circle>
                                    </g>
                                    <g transform="rotate(90)">
                                        <circle cx="0" cy="12" r="3" fill="#ffffff" opacity="0.375">
                                            <animate attributeName="opacity" from="0.375" to="0.375" dur="1.2s"
                                                begin="0.3s" repeatCount="indefinite" keyTimes="0;1" values="1;0.375">
                                            </animate>
                                        </circle>
                                    </g>
                                    <g transform="rotate(135)">
                                        <circle cx="0" cy="12" r="3" fill="#ffffff" opacity="0.5">
                                            <animate attributeName="opacity" from="0.5" to="0.5" dur="1.2s"
                                                begin="0.44999999999999996s" repeatCount="indefinite" keyTimes="0;1"
                                                values="1;0.5"></animate>
                                        </circle>
                                    </g>
                                    <g transform="rotate(180)">
                                        <circle cx="0" cy="12" r="3" fill="#ffffff" opacity="0.625">
                                            <animate attributeName="opacity" from="0.625" to="0.625" dur="1.2s"
                                                begin="0.6s" repeatCount="indefinite" keyTimes="0;1" values="1;0.625">
                                            </animate>
                                        </circle>
                                    </g>
                                    <g transform="rotate(225)">
                                        <circle cx="0" cy="12" r="3" fill="#ffffff" opacity="0.75">
                                            <animate attributeName="opacity" from="0.75" to="0.75" dur="1.2s"
                                                begin="0.75s" repeatCount="indefinite" keyTimes="0;1" values="1;0.75">
                                            </animate>
                                        </circle>
                                    </g>
                                    <g transform="rotate(270)">
                                        <circle cx="0" cy="12" r="3" fill="#ffffff" opacity="0.875">
                                            <animate attributeName="opacity" from="0.875" to="0.875" dur="1.2s"
                                                begin="0.8999999999999999s" repeatCount="indefinite" keyTimes="0;1"
                                                values="1;0.875"></animate>
                                        </circle>
                                    </g>
                                    <g transform="rotate(315)">
                                        <circle cx="0" cy="12" r="3" fill="#ffffff" opacity="1">
                                            <animate attributeName="opacity" from="1" to="1" dur="1.2s" begin="1.05s"
                                                repeatCount="indefinite" keyTimes="0;1" values="1;1"></animate>
                                        </circle>
                                    </g>
                                </g>
                            </svg>
                            Grabando cotización...
                        </span>
                    </button>
                </div>
            </div>
        </div>

    </div>

    <!-- Modal selección de códigos -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h3 class="text-lg font-bold mb-4">Selecciona un código</h3>

            <!-- 🔹 Acordeón por grupo -->
            <div v-for="(grupo, gIdx) in resultadosPaginados" :key="gIdx" class="mb-4 border rounded-lg shadow-sm">
                <!-- Encabezado -->
                <div class="flex justify-between items-center bg-blue-100 px-4 py-2 cursor-pointer hover:bg-blue-200"
                    @click="toggleGrupo(grupo.protartar)">
                    <h4 class="font-semibold text-blue-700">
                        {{ grupo.protartar }} ({{ grupo.tarnom }})
                    </h4>
                    <span>
                        <svg v-if="gruposAbiertos.has(grupo.protartar)" xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                        </svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                    </span>
                </div>

                <!-- Contenido -->
                <transition name="fade">
                    <div v-if="gruposAbiertos.has(grupo.protartar)" class="p-4">
                        <!-- Seleccionar todo el paquete -->
                        <div class="flex items-center mb-2">
                            <input type="checkbox" :id="'paquete-' + gIdx" v-model="seleccionarTodo[gIdx]"
                                @change="toggleSeleccionarTodo(grupo.items, gIdx)" class="mr-2" />
                            <label :for="'paquete-' + gIdx" class="cursor-pointer font-semibold">
                                Seleccionar todo el paquete
                            </label>
                        </div>

                        <!-- ✅ Checkboxes individuales -->
                        <div v-for="(r, idx) in grupo.items" :key="idx" class="flex items-center mb-2">
                            <input type="checkbox" :id="'codigo-' + gIdx + '-' + idx" :value="r"
                                v-model="codigoSeleccionado" class="mr-2" />
                            <label :for="'codigo-' + gIdx + '-' + idx" class="cursor-pointer">
                                {{ r.protarpro }} - {{ r.actnom }} <br />
                                (${{ r.protarval }}) <strong>{{ r.connom }}</strong>
                            </label>
                        </div>
                    </div>
                </transition>
            </div>

            <!-- Botones confirmar/cancelar -->
            <div class="mt-4 flex justify-end gap-2">
                <button @click="showModal = false" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                    Cancelar
                </button>
                <button @click="confirmarCodigo" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    :disabled="codigoSeleccionado.length === 0">
                    Confirmar
                </button>
            </div>
        </div>
    </div>


</template>
<script setup>
definePageMeta({
    middleware: ['sanctum:auth'],
})

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
    origen: '',
    tipo_gestion: '',
    medico_id: '',
    consultorio_id: '',
    observaciones: '',
    items: [],
    insumos: [],
    lentes: [],
    total: 0
})

const codificacion = ref({
    autorizacion: '',
    copago: '0',
    excedenteTope: '0',
    lentes: '0',
    preAnestesia: '0',
    otros: '0',
    fechaVigencia: ''
});

const entidades = ref([])
const medicos = ref([])
const consultorios = ref([])
const tiposGestion = ['cotización', 'información', 'codificación']
const lateralidad = ['izquierda', 'derecha', 'ambos']

const showModal = ref(false)
const resultadosCodigo = ref([])
const itemSeleccionadoIndex = ref(null)
// const codigoSeleccionado = ref(null)
const gruposAbiertos = ref(new Set());
const codigoSeleccionado = ref([]);
const seleccionarTodo = ref({});
const loading = ref(false);
const isconsultorioDisabled = ref(false);
const isdoctorDisabled = ref(false);
const extracting = ref(true);
const loadingPaciente = ref(false);
const loadingBuscarCodigo = ref(false);

const toggleGrupo = (protartar) => {
    if (gruposAbiertos.value.has(protartar)) {
        gruposAbiertos.value.delete(protartar);
    } else {
        gruposAbiertos.value.add(protartar);
    }
};

const toggleSeleccionarTodo = (items, gIdx) => {
    if (seleccionarTodo.value[gIdx]) {
        // Marcar todo
        codigoSeleccionado.value = [
            ...codigoSeleccionado.value,
            ...items.filter(i => !codigoSeleccionado.value.includes(i))
        ];
    } else {
        // Desmarcar todo
        codigoSeleccionado.value = codigoSeleccionado.value.filter(
            i => !items.includes(i)
        );
    }
};

// modal insumos
const showInsumosModal = ref(false)
const abrirModalInsumos = () => {
    showInsumosModal.value = true
}

const showModalLentes = ref(false)
const abrirModalLentes = () => {
    showModalLentes.value = true
}


const resultadosPaginados = computed(() => {
    return resultadosCodigo.value
})

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
    } finally {
        extracting.value = false
    }
})

const isCodificacion = computed(() => {
    return cotizacion.value.tipo_gestion === 'codificación'
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
        isdoctorDisabled.value = true;
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
        isconsultorioDisabled.value = true;
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
        loadingBuscarCodigo.value = true;

        const { data, error } = await useSanctumFetch(`/api/codigos/buscar/${codigo}`);

        if (!data.value || data.value.length === 0) {
            pushNotification('error', 'Código no encontrado', 'Error');
            return;
        }

        if (data.value.length === 1) {
            // ✅ Solo un resultado, lo asignamos directo
            const unico = data.value[0];

            Object.assign(cotizacion.value.items[index], {
                codigo: unico.protarpro,
                nombre: unico.actnom,
                valor: unico.protarval,
                concepto: unico.protarcon,
                connom: unico.connom,
                descuento: null
            });
        } else {
            // ✅ Agrupar por protartar
            const agrupado = data.value.reduce((acc, item) => {
                console.log(item);
                if (item?.id) {
                    item.protartar = item.tarifa || 'SIN GRUPO';
                    item.tarnom = item.nombre_tarifa || 'SIN NOMBRE';
                    item.protarpro = item.codigo || 'SIN CÓDIGO';
                    item.actnom = item.nombre || 'SIN NOMBRE';
                    item.protarval = item.valor || 0;
                    item.protarcon = item.concepto || 'SIN CONCEPTO';
                    item.connom = item.nombre_concepto || 'SIN NOMBRE';
                }

                if (!acc[item.protartar]) {
                    acc[item.protartar] = {
                        protartar: item.protartar,
                        tarnom: item.tarnom,
                        items: []
                    };
                }
                acc[item.protartar].items.push(item);
                return acc;
            }, {});
            console.log(agrupado, "validando lo que esta pasando a la vista 😒");

            resultadosCodigo.value = Object.values(agrupado);
            itemSeleccionadoIndex.value = index;
            showModal.value = true;
        }
    } catch (err) {
        pushNotification('error', 'Código no encontrado', 'Error');
        console.error("❌ Error buscando código:", err);
    } finally {
        loadingBuscarCodigo.value = false;
    }

};

const confirmarCodigo = () => {
    console.log("👉 Selección:", codigoSeleccionado.value);

    if (codigoSeleccionado.value.length > 0) {
        let tieneHMDQ = false;

        cotizacion.value.items = cotizacion.value.items.filter(
            item => item.nombre
        );

        codigoSeleccionado.value.forEach(codigo => {
            if (codigo.protarcon === "HMDQ") {
                tieneHMDQ = true;
            }

            const nuevoItem = {
                codigo: codigo.protarpro,
                nombre: codigo.actnom,
                valor: codigo.protarcon === "HMDQ" && tieneHMDQ === false ? 0 : codigo.protarval,
                concepto: codigo.protarcon,
                connom: codigo.connom,
                descuento: 0
            };

            cotizacion.value.items.push(nuevoItem);
        });

        // 🚨 Si ninguno era HMDQ => agregamos HONORARIOS CIRUJANO
        if (tieneHMDQ === false) {
            // tomo el mismo protarpro de los seleccionados
            const codigoBase = codigoSeleccionado.value[0]?.protarpro || "SIN-CODIGO";

            cotizacion.value.items.push({
                codigo: codigoBase,
                nombre: "HONORARIOS CIRUJANO",
                concepto: "",
                connom: "",
                valor: 0,
                descuento: 0
            });
        }


        pushNotification("success", "Códigos agregados correctamente", "Éxito");
    }

    // Resetear modal
    showModal.value = false;
    codigoSeleccionado.value = [];
    itemSeleccionadoIndex.value = null;
};

const formatearNumero = (valor) => {
    const numero = Number(valor);
    if (isNaN(numero)) return '0,00';

    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numero);
};

// Marcar/desmarcar paquete completo
const seleccionarPaquete = (event, grupo) => {
    if (event.target.checked) {
        // agregar todos los del grupo
        grupo.forEach((item) => {
            if (!codigoSeleccionado.value.some((c) => c.protarpro === item.protarpro)) {
                codigoSeleccionado.value.push(item);
            }
        });
    } else {
        // eliminar todos los del grupo
        codigoSeleccionado.value = codigoSeleccionado.value.filter(
            (c) => !grupo.some((g) => g.protarpro === c.protarpro)
        );
    }
};

// Saber si todo el grupo está seleccionado
const isGrupoSeleccionado = (grupo) => {
    return grupo.every((item) =>
        codigoSeleccionado.value.some((c) => c.protarpro === item.protarpro)
    );
};

const calcularTotal = (index) => {
    const item = cotizacion.value.items[index];
    item.valor_con_descuento = item.valor - (item.valor * (item.descuento / 100));
    cotizacion.value.items[index] = { ...item };
}

const totalProcedimientos = computed(() => {
    return cotizacion.value.items.reduce((acc, item) => {
        const valor = item.valor_con_descuento ?? item.valor;
        return acc + (valor * (item.cantidad ?? 1));
    }, 0);
});

const totalInsumos = computed(() => {
    return cotizacion.value.insumos?.reduce((acc, insumo) => {
        return acc + (insumo.valor * (insumo.cantidad ?? 1));
    }, 0) || 0;
});

const totalLentes = computed(() => {
    return cotizacion.value.lentes?.reduce((acc, lente) => {
        return acc + (lente.valor * (lente.cantidad ?? 1));
    }, 0) || 0;
});

const totalCotizacion = computed(() => {
    return totalProcedimientos.value + totalInsumos.value + totalLentes.value;
});


const buscarPaciente = async () => {

    loadingPaciente.value = true;

    try {
        const { data, error } = await useSanctumFetch(`/api/pacientes/${paciente.value.numero_identificacion}`);

        if (error.value) {
            pushNotification('error', 'Paciente no encontrado', 'Error');
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
        } else {
            pushNotification('error', 'Paciente no encontrado', 'Error');
        }

    } catch (err) {
        console.error('❌ Error buscando paciente:', err);
    } finally {
        loadingPaciente.value = false;
    }
};

const aplicarFormulaLateralidad = () => {
    // 1. Agrupar por procedimiento (protarpro) y lateralidad
    const agrupados = {}
    cotizacion.value.items.forEach((item, idx) => {
        const key = `${item.codigo}-${item.lateralidad}`
        if (!agrupados[key]) agrupados[key] = []
        agrupados[key].push({ ...item, index: idx })
    })

    // 2. Separar por ojo
    const porOjo = { derecha: [], izquierda: [] }
    Object.values(agrupados).forEach(items => {
        if (!items.length) return

        const lateralidad = items[0].lateralidad
        if (lateralidad === 'derecha' || lateralidad === 'ambos') porOjo.derecha.push(items)
        if (lateralidad === 'izquierda' || lateralidad === 'ambos') porOjo.izquierda.push(items)
    })

    // 3. Función para aplicar porcentajes en un ojo
    const aplicarPorOjo = (listaProcedimientos, factorOjo = 1) => {
        // Ordenar procedimientos por valor de "Derechos clínicos"
        console.log("👉 Antes de ordenar:", listaProcedimientos);

        listaProcedimientos.sort((a, b) => {
            const valA = a.find(it => it.connom?.includes("DERECHOS CLINICOS"))?.valor || 0
            const valB = b.find(it => it.connom?.includes("DERECHOS CLINICOS"))?.valor || 0
            return valB - valA
        })

        console.log("👉 Después de ordenar:", listaProcedimientos);


        listaProcedimientos.forEach((proc, i) => {
            let porcentaje = 0
            if (i === 0) porcentaje = 1
            else if (i === 1) porcentaje = 0.5
            else if (i === 2) porcentaje = 0.25
            else porcentaje = 0

            proc.forEach(item => {
                const nuevoValor = item.valor * porcentaje * factorOjo
                cotizacion.value.items[item.index].valor_con_descuento = nuevoValor
            })
        })
    }

    // 4. Decidir reglas según ojo
    if (porOjo.derecha.length && !porOjo.izquierda.length) {
        aplicarPorOjo(porOjo.derecha, 1)
    } else if (porOjo.izquierda.length && !porOjo.derecha.length) {
        aplicarPorOjo(porOjo.izquierda, 1)
    } else {
        // Ambos ojos: derecho 100%, izquierdo 75%
        aplicarPorOjo(porOjo.derecha, 1)
        aplicarPorOjo(porOjo.izquierda, 0.75)
    }
}

const agregarInsumo = (seleccionados) => {
    console.log("👉 Insumos seleccionados:", seleccionados);

    seleccionados.forEach((insumo) => {
        // ✅ evitar duplicados
        if (!cotizacion.value.insumos.some(i => i.codigo === insumo.codigo)) {
            cotizacion.value.insumos.push({
                codigo: insumo.codigo,
                nombre: insumo.nombre,
                cantidad: 1,
                valor: insumo.valor
            })
        }
    })

    // cerrar modal después de agregar
    showInsumosModal.value = false
}

const eliminarInsumo = (index) => {
    cotizacion.value.insumos.splice(index, 1)
}

const agregarLentes = (seleccionados) => {
    console.log("👉 Lentes seleccionados:", seleccionados);

    seleccionados.forEach((lente) => {
        if (!cotizacion.value.lentes.some(l => l.codigo === lente.codigo)) {
            cotizacion.value.lentes.push({
                codigo: lente.codigo,
                nombre: lente.nombre,
                cantidad: 1,
                valor: lente.valor
            })
        }
    })

    showModalLentes.value = false
}

const eliminarLente = (index) => {
    cotizacion.value.lentes.splice(index, 1)
}

const valoresCodificacion = (nuevoObjeto) => {
    console.log('Datos actualizados recibidos del hijo:', nuevoObjeto);
    // Actualiza el estado del padre con los nuevos datos
    nuevoObjeto.autorizacion = String(codificacion.value.autorizacion).toUpperCase();
    codificacion.value = nuevoObjeto;
};

const guardarCotizacion = async () => {
    loading.value = true;
    try {
        let payload = {
            origen: cotizacion.value.origen,
            tipo_gestion: cotizacion.value.tipo_gestion,
            medico_id: cotizacion.value.medico_id,
            entidad_id: paciente.value.entidad_id,
            consultorio_id: cotizacion.value.consultorio_id,
            observaciones: cotizacion.value.observaciones,

            // 🔹 Procedimientos
            items: cotizacion.value.items.map(item => ({
                codigo: item.codigo,
                nombre: item.nombre,
                lateralidad: item.lateralidad,
                valor: Number(item.valor_con_descuento || item.valor),
                cantidad: item.cantidad ?? 1
            })),

            // 🔹 Insumos
            insumos: cotizacion.value.insumos.map(insumo => ({
                codigo: insumo.codigo,
                nombre: insumo.nombre,
                valor: Number(insumo.valor),
                cantidad: insumo.cantidad ?? 1,
                tipo: 'I'
            })),

            // 🔹 Lentes
            lentes: cotizacion.value.lentes.map(lente => ({
                codigo: lente.codigo,
                nombre: lente.nombre,
                valor: Number(lente.valor),
                cantidad: lente.cantidad ?? 1,
                tipo: 'L'
            }))
        };

        // Si existe paciente guardado
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

        if (isCodificacion.value) {
            payload = {
                ...payload,
                codificacion: {
                    autorizacion: codificacion.value.autorizacion,
                    copago: Number(codificacion.value.copago),
                    excedente_tope: Number(codificacion.value.excedenteTope),
                    lentes: Number(codificacion.value.lentes),
                    pre_anestesia: Number(codificacion.value.preAnestesia),
                    otros: Number(codificacion.value.otros),
                    fecha_vigencia: codificacion.value.fechaVigencia
                }
            };
        }

        const { data, status, error, refresh } = await useSanctumFetch('/api/cotizaciones', {
            method: 'POST',
            body: payload,
        });
        console.log("👉 Respuesta al guardar cotización:", data, status, error, refresh);

        if (error.value) {
            const validationErrors = error.value.data?.errors;

            console.log("👉 Respuesta al guardar cotización:", validationErrors);

            if (validationErrors && typeof validationErrors === 'object') {

                const getFriendlyFieldName = (key) => {

                    if (key.startsWith('items.')) {
                        const match = key.match(/items\.(\d+)\.(.*)/);
                        if (match) {
                            const index = parseInt(match[1]) + 1;
                            const field = match[2].replace(/_/g, ' ');
                            const fieldCapitalized = field.charAt(0).toUpperCase() + field.slice(1);
                            return `${fieldCapitalized} del Ítem ${index}`;
                        }
                    }
                    return key.replace(/_/g, ' ').toUpperCase();
                };

                // Recorrer las CLAVES del objeto de errores
                for (const fieldKey in validationErrors) {

                    if (Object.hasOwnProperty.call(validationErrors, fieldKey)) {
                        const messagesArray = validationErrors[fieldKey];

                        if (Array.isArray(messagesArray)) {

                            messagesArray.forEach(message => {
                                pushNotification('error', message, 'Error de Validación');
                            });
                        }
                    }
                }
            } else if (error.value.data?.message) {
                pushNotification('error', error.value.data.message, 'Error');
            } else {
                pushNotification('error', 'Ocurrió un error inesperado al guardar la cotización.', 'Error');
            }
            return;
        }


        pushNotification('success', `Cotización creada con código:\n${data.value.codigo}`, 'Éxito');


        // Reset
        paciente.value = { tipo_identificacion: '', numero_identificacion: '', nombres: '', apellidos: '', correo: '', telefono: '', entidad_id: '' }
        cotizacion.value = { origen: '', tipo_gestion: '', medico_id: '', consultorio_id: '', observaciones: '', items: [], insumos: [], lentes: [] }
        codificacion.value = { autorizacion: '', copago: '', excedenteTope: '', lentes: '', preAnestesia: '', otros: '', fechaVigencia: '' };

    } catch (err) {
        console.error('❌ Error inesperado:', err)
    } finally {
        loading.value = false;
    }
}

</script>

<style>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>