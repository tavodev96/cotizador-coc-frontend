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
                        <option value="PA">PA</option>
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
                    <h3 class="text-lg font-bold mb-2">Procedimientos</h3>
                    <div v-for="(item, index) in cotizacion.items" :key="index"
                        class="grid grid-cols-12 gap-2 mb-2 items-center">

                        <input v-model="item.codigo" @blur="buscarCodigo(item.codigo, index)" placeholder="Código"
                            class="p-2 border rounded col-span-2" />


                        <input v-model="item.nombre" placeholder="Nombre" class="p-2 border rounded col-span-4" />
                        <select v-model="item.lateralidad" @change="aplicarFormulaLateralidad"
                            class="p-2 border rounded col-span-2">
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
                        Agregar procedimiento</button>
                </div>

                <!-- insumos -->

                <div class="md:col-span-2 mt-6">
                    <h3 class="text-lg font-bold mb-2">Insumos</h3>

                    <div v-for="(insumo, index) in cotizacion.insumos" :key="index"
                        class="grid grid-cols-12 gap-2 mb-2 items-center">

                        <input v-model="insumo.codigo" placeholder="Código" class="p-2 border rounded col-span-2"
                            disabled />

                        <input v-model="insumo.nombre" placeholder="Nombre" class="p-2 border rounded col-span-6"
                            disabled />

                        <input v-model.number="insumo.cantidad" placeholder="Cantidad" type="number" min="1"
                            class="p-2 border rounded col-span-2" />

                        <button @click="eliminarInsumo(index)"
                            class="text-red-600 font-bold text-xl hover:text-red-800 col-span-1">×</button>
                    </div>

                    <button type="button" @click="abrirModalInsumos" class="mt-2 text-sm text-blue-600 hover:underline">
                        + Agregar insumo
                    </button>
                </div>

                <QuoterInsumosModal :show="showInsumosModal" @close="showInsumosModal = false"
                    @select="agregarInsumo" />

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
    insumos: [],
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
// const codigoSeleccionado = ref(null)
const gruposAbiertos = ref(new Set());
const codigoSeleccionado = ref([]);
const seleccionarTodo = ref({});

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

        if (!data.value || data.value.length === 0) {
            pushNotification('error', 'Código no encontrado', 'Error');
            return;
        }

        if (data.value.length === 1) {
            // ✅ Solo un resultado, lo asignamos directo
            const unico = data.value[0];
            console.log("👉 Código único encontrado:", unico);

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

            resultadosCodigo.value = Object.values(agrupado);
            itemSeleccionadoIndex.value = index;
            showModal.value = true;
        }
    } catch (err) {
        pushNotification('error', 'Código no encontrado', 'Error');
        console.error("❌ Error buscando código:", err);
    }
};

const confirmarCodigo = () => {
    console.log("👉 Selección:", codigoSeleccionado.value);

    if (codigoSeleccionado.value.length > 0) {
        let tieneHMDQ = false;

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
                valor: Number(item.valor_con_descuento || item.valor)
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

        const { data, status, error, refresh } = await useSanctumFetch('/api/cotizaciones', {
            method: 'POST',
            body: payload,
        });
        console.log("👉 Respuesta al guardar cotización:", data);

        if (!data.value) {
            pushNotification('error', error.value?.message || 'Error al guardar la cotización', 'Error');
            return;
        }

        if (!data.value.success) {
            pushNotification('error', data.value.message || 'Error al guardar la cotización', 'Error');
            return;
        } else {
            pushNotification('success', `Cotización creada con código:\n${data.value.codigo}`, 'Éxito');
        }

        paciente.value = { tipo_identificacion: '', numero_identificacion: '', nombres: '', apellidos: '', correo: '', telefono: '', entidad_id: '' }
        cotizacion.value = { tipo_gestion: '', medico_id: '', consultorio_id: '', observaciones: '', items: [] }
    } catch (err) {
        console.error('❌ Error inesperado:', err)
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