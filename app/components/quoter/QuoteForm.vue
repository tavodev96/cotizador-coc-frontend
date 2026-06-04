<template>
    <div class="bg-white border border-slate-200 rounded-2xl p-6 max-w-6xl mx-auto shadow-sm">
        <div v-if="extracting" class="max-w-5xl mx-auto p-6 bg-white border border-slate-200 rounded-2xl">
            <div class="flex justify-center items-center gap-2">
                <svg class="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                    aria-hidden="true">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
                        fill="none"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span class="text-gray-600">Extrayendo información...</span>
            </div>
        </div>
        <div v-else class="max-w-5xl mx-auto p-4 bg-white border border-slate-200 rounded-2xl space-y-5">
            <h2 class="text-2xl font-semibold text-slate-900">Crear Cotización</h2>
            <Notivue v-slot="item">
                <Notification :item="item" :icons="filledIcons" class="text-2xl" />
            </Notivue>
            <!-- Paciente -->
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h3 class="text-base font-semibold text-slate-800 mb-3">Información del paciente</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Tipo de identificación</label>
                    <input
                        v-model="paciente.tipo_identificacion"
                        list="tipos-identificacion"
                        class="w-full h-12 border border-slate-300 rounded-lg px-3 bg-white"
                        :disabled="paciente.id"
                        @blur="validarTipoIdentificacion"
                    />
                    <datalist id="tipos-identificacion">
                        <option v-for="tipo in tiposIdentificacion" :key="tipo" :value="tipo" />
                    </datalist>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Número de identificación</label>
                    <div class="flex gap-2">
                        <input v-model="paciente.numero_identificacion" type="text"
                            class="w-full h-12 border border-slate-300 rounded-lg px-3 bg-white" :disabled="paciente.id" />
                        <button type="button" @click="buscarPaciente"
                            class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            :disabled="loadingPaciente">
                            <span v-if="loadingPaciente">Buscando...</span>
                            <span v-else>Buscar</span>
                        </button>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Nombres</label>
                    <input v-model="paciente.nombres" type="text" class="w-full h-12 border border-slate-300 rounded-lg px-3 bg-white"
                        :disabled="paciente.id" />
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Apellidos</label>
                    <input v-model="paciente.apellidos" type="text" class="w-full h-12 border border-slate-300 rounded-lg px-3 bg-white"
                        :disabled="paciente.id" />
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Correo</label>
                    <input v-model="paciente.correo" type="email" class="w-full h-12 border border-slate-300 rounded-lg px-3 bg-white"
                        :disabled="paciente.id" />
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Teléfono</label>
                    <input v-model="paciente.telefono" type="text" class="w-full h-12 border border-slate-300 rounded-lg px-3 bg-white"
                        :disabled="paciente.id" />
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Entidad</label>
                    <div class="relative" data-dropdown="entidad">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                        <input
                            v-model="buscadorEntidad"
                            class="w-full h-12 border border-slate-300 rounded-lg pl-10 pr-3 bg-white"
                            placeholder="Buscar entidad"
                            @focus="mostrarDropdownEntidad = true"
                            @input="handleEntidadInput"
                            @keydown.enter.prevent="seleccionarPrimeraCoincidencia('entidad')"
                            @keydown.esc="mostrarDropdownEntidad = false"
                        />
                        <div
                            v-if="mostrarDropdownEntidad"
                            class="absolute z-20 w-full bg-white border border-slate-200 rounded-lg mt-1 max-h-56 overflow-y-auto"
                            @mousedown.prevent
                        >
                            <template v-if="entidadesFiltradas.length">
                                <button
                                    v-for="entidad in entidadesFiltradas"
                                    :key="entidad.id"
                                    type="button"
                                    class="w-full text-left px-3 py-2 hover:bg-slate-100"
                                    @click="seleccionarEntidad(entidad)"
                                >
                                    {{ entidad.nombre }}
                                </button>
                            </template>
                            <p v-else class="px-3 py-2 text-sm text-slate-500">Sin resultados</p>
                        </div>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Origen:</label>
                    <select v-model="cotizacion.origen" class="w-full h-12 border border-slate-300 rounded-lg px-3 bg-white">
                        <option value="" select disabled>Seleccionar origen del ordenamiento</option>
                        <option value="1">Consultorio privado</option>
                        <option value="2">Consultorio institucional</option>
                    </select>
                </div>
            </div>
            </div>

            <!-- Cotización -->
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <h3 class="text-base font-semibold text-slate-800">Información de cotización</h3>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Fecha de recepción</label>
                <input type="text" :value="new Date().toISOString().split('T')[0]"
                    class="w-full h-12 border border-slate-300 rounded-lg px-3 bg-slate-100" disabled />

                <div v-if="props.mode === 'edit' && !isCodificacion">
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Fecha de inicio de nueva vigencia</label>
                    <input
                        v-model="cotizacion.fecha_vigencia"
                        type="date"
                        :min="fechaMinimaVigencia"
                        class="w-full h-12 border border-slate-300 rounded-lg px-3 bg-white"
                    />
                    <p class="mt-1 text-xs text-slate-500">Al guardar, desde esta fecha se cuentan 30 días para calcular la nueva fecha de vencimiento.</p>
                </div>

                <div :class="[{ 'flex items-center justify-center gap-2 mt-4': isCodificacion }]">
                    <div :class="[{ 'w-1/2': isCodificacion, 'w-full mt-4': !isCodificacion }]">
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Tipo de gestión</label>
                        <input
                            v-model="cotizacion.tipo_gestion"
                            list="tipos-gestion"
                            class="w-full h-12 border border-slate-300 rounded-lg px-3 bg-white"
                            @blur="validarTipoGestion"
                        />
                        <datalist id="tipos-gestion">
                            <option v-for="tipo in tiposGestion" :key="tipo" :value="tipo" />
                        </datalist>
                    </div>
                    <div v-if="isCodificacion" class="w-1/2">
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Número de autorización</label>
                        <input v-model="codificacion.autorizacion" type="text" class="w-full h-12 border border-slate-300 rounded-lg px-3 bg-white" />
                    </div>
                </div>
                <!-- :disabled="isdoctorDisabled" -->
                <label class="block text-sm font-semibold text-slate-700 mb-1">Médico</label>
                <div class="relative" data-dropdown="medico">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                        v-model="buscadorMedico"
                        class="w-full h-12 border border-slate-300 rounded-lg pl-10 pr-3 bg-white"
                        placeholder="Buscar médico"
                        :disabled="isdoctorDisabled"
                        @focus="mostrarDropdownMedico = true"
                        @keydown.enter.prevent="seleccionarPrimeraCoincidencia('medico')"
                        @keydown.esc="mostrarDropdownMedico = false"
                    />
                    <div
                        v-if="mostrarDropdownMedico"
                        class="absolute z-20 w-full bg-white border border-slate-200 rounded-lg mt-1 max-h-56 overflow-y-auto"
                        @mousedown.prevent
                    >
                        <template v-if="medicosFiltrados.length">
                            <button
                                v-for="medico in medicosFiltrados"
                                :key="medico.id"
                                type="button"
                                class="w-full text-left px-3 py-2 hover:bg-slate-100"
                                @click="seleccionarMedico(medico)"
                            >
                                {{ medico.nombre }}
                            </button>
                        </template>
                        <p v-else class="px-3 py-2 text-sm text-slate-500">Sin resultados</p>
                    </div>
                </div>

                <label class="block text-sm font-semibold text-slate-700 mb-1">Consultorio</label>
                <div class="relative" data-dropdown="consultorio">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                        v-model="buscadorConsultorio"
                        class="w-full h-12 border border-slate-300 rounded-lg pl-10 pr-3 bg-white"
                        placeholder="Buscar consultorio"
                        :disabled="isconsultorioDisabled"
                        @focus="mostrarDropdownConsultorio = true"
                        @keydown.enter.prevent="seleccionarPrimeraCoincidencia('consultorio')"
                        @keydown.esc="mostrarDropdownConsultorio = false"
                    />
                    <div
                        v-if="mostrarDropdownConsultorio"
                        class="absolute z-20 w-full bg-white border border-slate-200 rounded-lg mt-1 max-h-56 overflow-y-auto"
                        @mousedown.prevent
                    >
                        <template v-if="consultoriosFiltrados.length">
                            <button
                                v-for="consultorio in consultoriosFiltrados"
                                :key="consultorio.id"
                                type="button"
                                class="w-full text-left px-3 py-2 hover:bg-slate-100"
                                @click="seleccionarConsultorio(consultorio)"
                            >
                                {{ consultorio.nombre }} ({{ consultorio.codigo }})
                            </button>
                        </template>
                        <p v-else class="px-3 py-2 text-sm text-slate-500">Sin resultados</p>
                    </div>
                </div>

                <div v-if="polizas.length" class="mt-4">
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Póliza</label>
                    <select v-model="cotizacion.poliza_id" class="w-full h-12 border border-slate-300 rounded-lg px-3 bg-white">
                        <option value="" disabled>Seleccionar póliza</option>
                        <option v-for="poliza in polizas" :key="poliza.id" :value="poliza.id">
                            {{ poliza.nombre }} — Valor asegurado: {{ formatCurrency(poliza.valor_asegurado) }} · Valor póliza: {{ formatCurrency(poliza.valor_poliza) }}
                        </option>
                    </select>
                    <p v-if="polizaSeleccionada" class="mt-2 text-sm text-slate-600">
                        Se sumará {{ formatCurrency(polizaSeleccionada.valor_poliza) }} al total de la cotización.
                    </p>
                </div>

                <div class="md:col-span-2 mt-4">
                    <div v-show="!isCodificacion" class="flex items-center gap-4 mb-2">
                        <div class="flex items-center gap-2">
                            <input type="checkbox" id="cotizar-laser" v-model="cotizandoLaser" @change="handleLaserChange" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2" />
                            <label for="cotizar-laser" class="text-sm font-medium text-gray-700">Vas a cotizar laser</label>
                        </div>
                        <div class="flex items-center gap-2">
                            <input type="checkbox" id="cotizar-plastica" v-model="cotizandoPlasticaOcular" @change="handlePlasticaChange" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2" />
                            <label for="cotizar-plastica" class="text-sm font-medium text-gray-700">Vas a cotizar plastica ocular</label>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 mb-2">
                        
                        <h3 class="text-lg font-bold">{{ cotizandoLaser ? 'Laser' : cotizandoPlasticaOcular ? 'Plastica Ocular' : 'Procedimientos' }}</h3>
                        <div v-if="loadingBuscarCodigo"
                            class="w-fit flex justify-center items-center gap-2 bg-blue-600 text-white px-2 py-1 rounded">
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

                    <div v-if="procedimientosFormulados.length" class="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p class="text-sm font-semibold text-amber-800">Procedimientos formulados desde ordenamiento</p>
                        <ul v-if="procedimientosFormulados.length" class="mt-2 list-disc pl-5 text-sm text-amber-900 space-y-1">
                            <li v-for="(proc, idx) in procedimientosFormulados" :key="`formulado-${idx}`">{{ proc }}</li>
                        </ul>
                    </div>

                    <div v-for="(item, index) in cotizacion.items" :key="index"
                        class="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2 items-end">

                        <div :class="[{ 'md:col-span-2': isCodificacion, 'md:col-span-2': !isCodificacion }]">
                            <label class="block text-xs font-semibold text-slate-600 mb-1">Código</label>
                            <input v-model="item.codigo" @blur="buscarCodigo(item.codigo, index)" placeholder="Código"
                                class="p-2 border rounded w-full" />
                        </div>

                        <div :class="[{ 'md:col-span-7': isCodificacion, 'md:col-span-4': !isCodificacion }]">
                            <label class="block text-xs font-semibold text-slate-600 mb-1">Nombre</label>
                            <input v-model="item.nombre" placeholder="Nombre"
                                class="p-2 border rounded w-full" />
                        </div>

                        <div :class="[{ 'md:col-span-2': isCodificacion, 'md:col-span-2': !isCodificacion }]">
                            <label class="block text-xs font-semibold text-slate-600 mb-1">Lateralidad</label>
                            <select v-model="item.lateralidad" @change="handleLateralidadChange(index)"
                                class="p-2 border rounded w-full">
                                <option value="" disabled>Seleccione</option>
                                <option v-for="lateral in lateralidad" :key="lateral" :value="lateral">{{ lateral }}</option>
                            </select>
                        </div>

                        <div v-show="!isCodificacion" class="md:col-span-2">
                            <label class="block text-xs font-semibold text-slate-600 mb-1">Valor</label>
                            <input :value="formatearNumero(item.valor_con_descuento ?? item.valor)"
                                placeholder="Valor" class="p-2 border rounded w-full" type="text"
                                @input="onItemValorInput($event.target.value, index)" />
                        </div>

                        <div v-show="!isCodificacion" class="md:col-span-1">
                            <label class="block text-xs font-semibold text-slate-600 mb-1">Descuento</label>
                            <input v-model.number="item.descuento" placeholder="% Desc"
                                @change="calcularTotal(index)" class="p-2 border rounded w-full" type="number" min="0"
                                max="100" />
                        </div>

                        <button @click="eliminarItem(index)"
                            class="text-red-600 font-bold text-xl hover:text-red-800 md:col-span-1 justify-self-end">×</button>
                    </div>


                    <button type="button" @click="agregarItem" class="mt-2 text-sm text-[#162983] font-medium hover:underline">+
                        Agregar {{ cotizandoLaser ? 'Laser' : cotizandoPlasticaOcular ? 'Plastica Ocular' : 'Procedimientos' }}</button>
                </div>

                <!-- insumos -->

                <div class="md:col-span-2 mt-6">
                    <h3 class="text-lg font-bold mb-2">Insumos</h3>

                    <div v-for="(insumo, index) in cotizacion.insumos" :key="index"
                        class="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2 items-center">

                        <input v-model="insumo.codigo" placeholder="Código" class="p-2 border rounded"
                            :class="[{ 'md:col-span-3': isCodificacion, 'md:col-span-1': !isCodificacion }]" disabled />
                        <input v-model="insumo.nombre" placeholder="Nombre" class="p-2 border rounded col-span-4"
                            :class="[{ 'md:col-span-6': isCodificacion, 'md:col-span-4': !isCodificacion }]" disabled />

                        <!-- Valor unitario -->
                        <input v-show="!isCodificacion" v-model.number="insumo.valor" type="hidden" />
                        <input v-show="!isCodificacion" :value="formatearNumero(insumo.valor)" type="text"
                            class="p-2 border rounded md:col-span-2" placeholder="Valor"
                            @input="onInsumoValorInput($event.target.value, index)" />

                        <!-- Cantidad -->
                        <input v-show="!isCodificacion" v-model.number="insumo.cantidad" placeholder="Cantidad"
                            type="number" min="1" class="p-2 border rounded md:col-span-2" />

                        <!-- Subtotal calculado -->
                        <span v-show="!isCodificacion" class="md:col-span-2 text-right font-semibold">
                            {{ formatCurrency(insumo.cantidad * insumo.valor) }}
                        </span>

                        <button @click="eliminarInsumo(index)"
                            class="text-red-600 font-bold text-xl hover:text-red-800 md:col-span-1 justify-self-end">×</button>
                    </div>

                    <button type="button" @click="abrirModalInsumos" class="mt-2 text-sm text-[#162983] font-medium hover:underline">
                        + Agregar insumo
                    </button>
                </div>

                <!-- lentes -->
                <div class="md:col-span-2 mt-6">
                    <h3 class="text-lg font-bold mb-2">Lentes</h3>

                    <div v-for="(lente, index) in cotizacion.lentes" :key="index"
                        class="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2 items-center">

                        <!-- Código -->
                        <input v-model="lente.codigo" placeholder="Código" class="p-2 border rounded"
                            :class="[{ 'md:col-span-3': isCodificacion, 'md:col-span-1': !isCodificacion }]" disabled />

                        <!-- Nombre -->
                        <input v-model="lente.nombre" placeholder="Nombre" class="p-2 border rounded"
                            :class="[{ 'md:col-span-6': isCodificacion, 'md:col-span-4': !isCodificacion }]" disabled />

                        <!-- Valor unitario -->
                        <input v-model.number="lente.valor" type="hidden" />
                        <input v-show="!isCodificacion" :value="formatearNumero(lente.valor)" type="text"
                            class="p-2 border rounded md:col-span-2" placeholder="Valor"
                            @input="onLenteValorInput($event.target.value, index)" />

                        <!-- Cantidad -->
                        <input v-show="!isCodificacion" v-model.number="lente.cantidad" placeholder="Cantidad"
                            type="number" min="1" class="p-2 border rounded md:col-span-2" />

                        <!-- Subtotal calculado -->
                        <span v-show="!isCodificacion" class="md:col-span-2 text-right font-semibold">
                            {{ formatCurrency(lente.cantidad * lente.valor) }}
                        </span>

                        <!-- Botón eliminar -->
                        <button @click="eliminarLente(index)"
                            class="text-red-600 font-bold text-xl hover:text-red-800 md:col-span-1 justify-self-end">×</button>
                    </div>

                    <!-- Botón abrir modal -->
                    <button type="button" @click="abrirModalLentes" class="mt-2 text-sm text-[#162983] font-medium hover:underline">
                        + Agregar lente
                    </button>
                </div>

                <!-- Modal -->
                <QuoterLentesModal v-if="showModalLentes" :show="showModalLentes" @close="showModalLentes = false"
                    @select="agregarLentes" />


                <QuoterInsumosModal :show="showInsumosModal" @close="showInsumosModal = false"
                    @select="agregarInsumo" />

                <QuoterCodificacion v-if="isCodificacion" @update:valores="valoresCodificacion" class="mt-4"
                    :lentes="totalLentes" :insumos="totalInsumos" />

                <div v-show="!isCodificacion" class="mt-4 text-right text-xl font-bold">
                    Valor total cotización: {{ formatCurrency(totalCotizacion) }}
                </div>

                <label class="block text-sm font-semibold text-slate-700 mb-1">Observaciones</label>
                <textarea v-model="cotizacion.observaciones" class="w-full h-24 border border-slate-300 rounded-lg p-3 bg-white"></textarea>
                <div class="sticky bottom-3 z-10 md:static bg-white/95 md:bg-transparent backdrop-blur-sm md:backdrop-blur-0 border border-slate-200 md:border-0 rounded-xl md:rounded-none p-3 md:p-0 flex justify-center items-center gap-2">
                    <button @click="guardarCotizacion" :disabled="loading"
                        class="mt-0 md:mt-4 w-full md:w-auto px-5 py-2.5 bg-[#162983] text-white rounded-lg hover:bg-blue-800 shadow-sm">

                        <span v-if="!loading" class="inline-block ml-2 "> {{ mode == 'edit' ? 'Actualizar cotización' : 'Guardar cotización' }}</span>
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
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 w-full max-w-2xl">
            <h3 class="text-lg font-semibold text-slate-900 mb-4">Selecciona un código</h3>

            <!-- 🔹 Acordeón por grupo -->
            <div v-for="(grupo, gIdx) in resultadosPaginados" :key="grupo.__index" class="mb-4 border rounded-lg shadow-sm">
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
                            <input type="checkbox" :id="'paquete-' + grupo.__index" v-model="seleccionarTodo[grupo.__index]"
                                @change="toggleSeleccionarTodo(grupo.items, grupo.__index)" class="mr-2" />
                            <label :for="'paquete-' + grupo.__index" class="cursor-pointer font-semibold">
                                Seleccionar todo el paquete
                            </label>
                        </div>

                        <!-- ✅ Checkboxes individuales -->
                        <div v-for="(r, idx) in grupo.items" :key="idx" class="flex items-center mb-2">
                            <input type="checkbox" :id="'codigo-' + grupo.__index + '-' + idx" :value="r"
                                v-model="codigoSeleccionado" class="mr-2" />
                            <label :for="'codigo-' + grupo.__index + '-' + idx" class="cursor-pointer">
                                {{ r.protarpro }} - {{ r.actnom }} <br />
                                (${{ r.protarval }}) <strong>{{ r.connom }}</strong>
                            </label>
                        </div>
                    </div>
                </transition>
            </div>

            <div v-if="totalPaginasResultados > 1" class="flex items-center justify-between mt-4">
                <button type="button" @click="cambiarPaginaResultados(paginaResultados - 1)"
                    :disabled="paginaResultados === 1"
                    class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50">
                    Anterior
                </button>
                <div class="flex items-center gap-2">
                    <button v-for="p in paginasResultados" :key="p" type="button" @click="cambiarPaginaResultados(p)"
                        :class="['px-3 py-1 rounded', p === paginaResultados ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300']">
                        {{ p }}
                    </button>
                </div>
                <button type="button" @click="cambiarPaginaResultados(paginaResultados + 1)"
                    :disabled="paginaResultados === totalPaginasResultados"
                    class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50">
                    Siguiente
                </button>
            </div>

            <!-- Botones confirmar/cancelar -->
            <div class="mt-4 flex justify-end gap-2">
                <button @click="showModal = false" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                    Cancelar
                </button>
                <button type="button" @click="limpiarSeleccion" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                    Deseleccionar
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

const props = defineProps({
    mode: { type: String, required: true }, // create | edit
})
const emit = defineEmits(['saved'])

import { Notivue, Notification, filledIcons } from 'notivue'
import { nextTick } from 'vue'
const { getById, create, update } = useCotizacionApi()
const { paciente, cotizacion, codificacion, totalCotizacion, totalInsumos, totalLentes } = useCotizacionForm()
const route = useRoute();
const router = useRouter();

const entidades = ref([])
const medicos = ref([])
const consultorios = ref([])
const polizas = ref([])
const tiposGestion = ['cotización', 'información', 'codificación']
const lateralidad = ['izquierda', 'derecha', 'bilateral']
const tiposIdentificacion = ['CC', 'CE', 'TI', 'PA']

const buscadorEntidad = ref('')
const buscadorMedico = ref('')
const buscadorConsultorio = ref('')

const mostrarDropdownEntidad = ref(false)
const mostrarDropdownMedico = ref(false)
const mostrarDropdownConsultorio = ref(false)

const showModal = ref(false)
const entidadFromQueryIsNA = ref(false)
const resultadosCodigo = ref([])
const itemSeleccionadoIndex = ref(null)
// const codigoSeleccionado = ref(null)
const gruposAbiertos = ref(new Set());
const codigoSeleccionado = ref([]);
const seleccionarTodo = ref({});
const procedimientosFormulados = ref([])
const loading = ref(false);
const isconsultorioDisabled = ref(false);
const isdoctorDisabled = ref(false);
const extracting = ref(true);
const loadingPaciente = ref(false);
const loadingBuscarCodigo = ref(false);
const cotizandoLaser = ref(false);
const cotizandoPlasticaOcular = ref(false);
const fechaOrdenamiento = ref('');
const tipoBusquedaCodigo = computed(() => {
    if (cotizandoLaser.value) return 'laser';
    if (cotizandoPlasticaOcular.value) return 'plastica_ocular';
    return 'procedimientos';
});

const normalizar = (texto) =>
    String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()

const entidadesFiltradas = computed(() => {
    const termino = normalizar(buscadorEntidad.value)
    if (!termino) return entidades.value

    return entidades.value.filter((entidad) =>
        normalizar(entidad.nombre).includes(termino)
    )
})

const medicosFiltrados = computed(() => {
    const termino = normalizar(buscadorMedico.value)
    if (!termino) return medicos.value

    return medicos.value.filter((medico) =>
        normalizar(medico.nombre).includes(termino)
    )
})

const consultoriosFiltrados = computed(() => {
    const termino = normalizar(buscadorConsultorio.value)
    if (!termino) return consultorios.value

    return consultorios.value.filter((consultorio) =>
        normalizar(consultorio.nombre).includes(termino) ||
        normalizar(consultorio.codigo).includes(termino)
    )
})

const seleccionarEntidad = (entidad) => {
    paciente.value.entidad_id = Number(entidad.id)
    buscadorEntidad.value = entidad.nombre
    mostrarDropdownEntidad.value = false
    entidadFromQueryIsNA.value = false
}

const handleEntidadInput = () => {
    const termino = String(buscadorEntidad.value || '').trim()
    const entidadSeleccionada = entidades.value.find((e) => Number(e.id) === Number(paciente.value.entidad_id))

    if (!termino) {
        paciente.value.entidad_id = ''
        entidadFromQueryIsNA.value = false
    } else if (entidadFromQueryIsNA.value && termino.toLowerCase() === 'n/a') {
        // Keep the preloaded PARTICULARES entity while the field renders N/A.
    } else if (entidadSeleccionada && normalizar(entidadSeleccionada.nombre) !== normalizar(termino)) {
        paciente.value.entidad_id = ''
        entidadFromQueryIsNA.value = false
    }

    mostrarDropdownEntidad.value = true
}

const seleccionarMedico = (medico) => {
    cotizacion.value.medico_id = Number(medico.id)
    buscadorMedico.value = medico.nombre
    mostrarDropdownMedico.value = false
}

const seleccionarConsultorio = (consultorio) => {
    cotizacion.value.consultorio_id = Number(consultorio.id)
    buscadorConsultorio.value = `${consultorio.nombre} (${consultorio.codigo})`
    mostrarDropdownConsultorio.value = false
}

const seleccionarPrimeraCoincidencia = (tipo) => {
    if (tipo === 'entidad' && entidadesFiltradas.value.length === 1) {
        seleccionarEntidad(entidadesFiltradas.value[0])
        return
    }

    if (tipo === 'medico' && medicosFiltrados.value.length === 1) {
        seleccionarMedico(medicosFiltrados.value[0])
        return
    }

    if (tipo === 'consultorio' && consultoriosFiltrados.value.length === 1) {
        seleccionarConsultorio(consultoriosFiltrados.value[0])
    }
}

const cerrarDropdowns = () => {
    mostrarDropdownEntidad.value = false
    mostrarDropdownMedico.value = false
    mostrarDropdownConsultorio.value = false
}

const handleClickOutsideDropdowns = (event) => {
    const target = event.target

    if (!(target instanceof Element)) return

    if (!target.closest('[data-dropdown="entidad"]')) {
        mostrarDropdownEntidad.value = false
    }

    if (!target.closest('[data-dropdown="medico"]')) {
        mostrarDropdownMedico.value = false
    }

    if (!target.closest('[data-dropdown="consultorio"]')) {
        mostrarDropdownConsultorio.value = false
    }
}

const validarTipoIdentificacion = () => {
    if (!tiposIdentificacion.includes(paciente.value.tipo_identificacion)) {
        paciente.value.tipo_identificacion = tiposIdentificacion[0]
    }
}

const validarTipoGestion = () => {
    if (!tiposGestion.includes(cotizacion.value.tipo_gestion)) {
        cotizacion.value.tipo_gestion = tiposGestion[0]
    }
}

watch(
    [entidades, () => paciente.value.entidad_id],
    () => {
        if (!paciente.value.entidad_id) return
        const entidad = entidades.value.find((e) => Number(e.id) === Number(paciente.value.entidad_id))
        if (!entidad) return

        buscadorEntidad.value = entidad.nombre || buscadorEntidad.value
    },
    { immediate: true }
)

watch(
    [medicos, () => cotizacion.value.medico_id],
    () => {
        const medico = medicos.value.find((m) => Number(m.id) === Number(cotizacion.value.medico_id))
        buscadorMedico.value = medico?.nombre || ''
    },
    { immediate: true }
)

watch(
    [consultorios, () => cotizacion.value.consultorio_id],
    () => {
        const consultorio = consultorios.value.find((c) => Number(c.id) === Number(cotizacion.value.consultorio_id))
        buscadorConsultorio.value = consultorio ? `${consultorio.nombre} (${consultorio.codigo})` : ''
    },
    { immediate: true }
)

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


const paginaResultados = ref(1);
const tamanoPaginaResultados = 5;

const resultadosConIndice = computed(() =>
    resultadosCodigo.value.map((grupo, idx) => ({ ...grupo, __index: idx }))
);

const totalPaginasResultados = computed(() =>
    Math.max(1, Math.ceil(resultadosConIndice.value.length / tamanoPaginaResultados))
);

const paginasResultados = computed(() =>
    Array.from({ length: totalPaginasResultados.value }, (_, i) => i + 1)
);

const resultadosPaginados = computed(() => {
    const inicio = (paginaResultados.value - 1) * tamanoPaginaResultados;
    return resultadosConIndice.value.slice(inicio, inicio + tamanoPaginaResultados);
});

const cambiarPaginaResultados = (pagina) => {
    const total = totalPaginasResultados.value;
    if (pagina < 1 || pagina > total) return;
    paginaResultados.value = pagina;
};

const limpiarSeleccion = () => {
    codigoSeleccionado.value = [];
    seleccionarTodo.value = {};
};

watch(resultadosCodigo, () => {
    paginaResultados.value = 1;
});

const parseQueryValues = (value, separator = ',') => {
    const rawValues = Array.isArray(value) ? value : [value]

    return rawValues
        .flatMap(v => String(v || '').split(separator))
        .map(v => v.trim())
        .filter(Boolean)
}

const normalizarFechaParaApi = (value) => {
    if (!value) return ''

    const texto = String(value).trim()
    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (iso) return texto

    const latam = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (latam) {
        return `${latam[3]}-${latam[2]}-${latam[1]}`
    }

    const parsed = new Date(texto)
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0]
    }

    return ''
}

const cargarCodigosDesdeQuery = async (codes) => {
    const unicos = Array.from(new Set((codes || []).filter(Boolean)))

    for (const code of unicos) {
        const existe = cotizacion.value.items.some((i) => String(i.codigo || '').trim() === code)
        if (existe) {
            continue
        }

        const index = cotizacion.value.items.length
        cotizacion.value.items.push({ codigo: code, nombre: '', lateralidad: '', valor: 0, descuento: 0 })
        await buscarCodigo(code, index)
    }
}

onMounted(async () => {

    try {
        const { data, status, error, refresh, clear } = await useAsyncData(
            'catalogos', () => useSanctumFetch('/api/catalogos')
        );
        if (status.value == 'success') {
            medicos.value = data.value.data.value.medicos
            consultorios.value = data.value.data.value.consultorios
            entidades.value = data.value.data.value.entidades
            polizas.value = data.value.data.value.polizas || []
        }

        if (route.query) {
            fechaOrdenamiento.value = normalizarFechaParaApi(route.query.fecha_ordenamiento)

            if (route.query.numero_identificacion) {
                paciente.value.numero_identificacion = route.query.numero_identificacion
                await buscarPaciente()
            }
            await syncEntidadFromQuery()
            syncMedicoFromQuery()
            syncConsultorioFromQuery()
            syncPolizaFromQuery()

            const codigosDesdeQuery = [
                ...parseQueryValues(route.query.codigos, ','),
                ...parseQueryValues(route.query.codigo, ','),
            ]
            const procedimientosDesdeQuery = parseQueryValues(route.query.procedimientos_formulados, '||')
            procedimientosFormulados.value = Array.from(new Set(procedimientosDesdeQuery))

            if (codigosDesdeQuery.length) {
                await cargarCodigosDesdeQuery(codigosDesdeQuery)
            }
        }

    } catch (err) {
        console.error('❌ Error cargando catálogos:', err)
    } finally {
        extracting.value = false
    }
})

onMounted(() => {
    document.addEventListener('click', handleClickOutsideDropdowns)
})

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutsideDropdowns)
})

const isCodificacion = computed(() => {
    return cotizacion.value.tipo_gestion === 'codificación'
})

const fechaMinimaVigencia = computed(() => new Date().toISOString().split('T')[0])

const polizaSeleccionada = computed(() => {
    const id = cotizacion.value.poliza_id
    if (!id) return null
    return polizas.value.find((poliza) => Number(poliza.id) === Number(id)) || null
})

watch(polizaSeleccionada, (poliza) => {
    cotizacion.value.poliza = poliza || null
    cotizacion.value.valor_poliza = Number(poliza?.valor_poliza || 0)
}, { immediate: true })

const syncEntidadFromQuery = async () => {
    await nextTick()
    const q = String(route.query?.entidad || '').trim()
    if (!entidades.value.length) return

    entidadFromQueryIsNA.value = false
    const idQuery = String(route.query?.entidad_id || '').trim()

    if (idQuery && !Number.isNaN(Number(idQuery))) {
        const matchById = entidades.value.find((e) => Number(e.id) === Number(idQuery))
        if (matchById) {
            paciente.value.entidad_id = Number(matchById.id)
            buscadorEntidad.value = matchById.nombre
            return
        }
    }

    const matchByName = entidades.value.find(
        e => normalizar(e.nombre) === normalizar(q)
    )
    if (matchByName) {
        paciente.value.entidad_id = Number(matchByName.id)
        buscadorEntidad.value = matchByName.nombre
        return
    }

    if (['n/a', 'na'].includes(normalizar(q))) {
        const particulares = entidades.value.find((e) => normalizar(e.nombre) === 'particulares')
            || entidades.value.find((e) => normalizar(e.nombre).includes('particulares'))

        if (particulares) {
            paciente.value.entidad_id = Number(particulares.id)
            entidadFromQueryIsNA.value = true
            buscadorEntidad.value = particulares.nombre || 'PARTICULARES'
        }
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

watch(
    () => [String(route.query?.entidad || ''), String(route.query?.entidad_id || ''), entidades.value.length],
    ([entidadQuery, entidadId, entidadesCount]) => {
        if (!entidadesCount) return
        if (!entidadQuery && !entidadId) return
        syncEntidadFromQuery()
    },
    { immediate: true }
)

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

const syncPolizaFromQuery = () => {
    const q = String(route.query?.poliza_id || '').trim()
    if (!q || !polizas.value.length) return

    const match = polizas.value.find((p) => Number(p.id) === Number(q))
    if (match) {
        cotizacion.value.poliza_id = Number(match.id)
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

        const { data, error } = await useSanctumFetch(
            `/api/codigos/buscar/${codigo}?laser=${cotizandoLaser.value}&plastica_ocular=${cotizandoPlasticaOcular.value}&tipo=${tipoBusquedaCodigo.value}`
        );

        if (!data.value || data.value.length === 0) {
            pushNotification('error', 'Código no encontrado', 'Error');
            return 'not-found';
        }

        if (isCodificacion.value) {
            const primerResultado = data.value[0];

            Object.assign(cotizacion.value.items[index], {
                codigo: primerResultado.protarpro || primerResultado.codigo || codigo,
                nombre: primerResultado.actnom || primerResultado.nombre || '',
                valor: 0,
                concepto: '',
                connom: '',
                descuento: 0
            });

            return 'single';
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
                descuento: 0
            });
            return 'single';
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

            resultadosCodigo.value = Object.values(agrupado);
            itemSeleccionadoIndex.value = index;
            showModal.value = true;
            return 'multiple';
        }
    } catch (err) {
        pushNotification('error', 'Código no encontrado', 'Error');
        console.error("❌ Error buscando código:", err);
        return 'error';
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
        if (tieneHMDQ === false && cotizandoLaser.value === false) {
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
    if (isNaN(numero)) return '0';

    // Mostrar sin decimales y sin coma decimal cuando el valor es entero
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(numero);
}

const formatCurrency = (valor) => {
    const numero = Number(valor) || 0;
    return numero.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

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

const parseNumero = (str) => {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    // eliminar símbolos, espacios y formateo colombiano (puntos miles, coma decimales)
    const cleaned = String(str).replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.\-]/g, '');
    const n = Number(cleaned);
    return isNaN(n) ? 0 : n;
}

const onItemValorInput = (val, index) => {
    const numero = parseNumero(val);
    const item = cotizacion.value.items[index];
    if (!item) return;
    item.valor = numero;
    // recalcular descuento/valor con descuento
    calcularTotal(index);
}

const onInsumoValorInput = (val, index) => {
    const numero = parseNumero(val);
    const insumo = cotizacion.value.insumos[index];
    if (!insumo) return;
    insumo.valor = numero;
}

const onLenteValorInput = (val, index) => {
    const numero = parseNumero(val);
    const lente = cotizacion.value.lentes[index];
    if (!lente) return;
    lente.valor = numero;
}

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

const handleLaserChange = () => {
    // Si se activa láser, desactivar plastica ocular
    if (cotizandoLaser.value) {
        cotizandoPlasticaOcular.value = false;
    }
}

const handlePlasticaChange = () => {
    // Si se activa plastica ocular, desactivar láser
    if (cotizandoPlasticaOcular.value) {
        cotizandoLaser.value = false;
    }
}

const handleLateralidadChange = (index) => {
    const itemActual = cotizacion.value.items[index]
    const codigoActual = String(itemActual?.codigo || '').trim()

    if (codigoActual && itemActual?.lateralidad) {
        cotizacion.value.items.forEach((item, idx) => {
            const codigoItem = String(item?.codigo || '').trim()
            if (idx !== index && codigoItem === codigoActual) {
                item.lateralidad = itemActual.lateralidad
            }
        })
    }

    // Solo aplicar la fórmula si NO está cotizando láser ni plastica ocular
    if (cotizacion.value.tipo_gestion === 'cotización' && !cotizandoLaser.value && !cotizandoPlasticaOcular.value) {
        aplicarFormulaLateralidad();
    }
}

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


// Watcher para vaciar cotizacion.items cuando cotizandoLaser cambie de estado
watch(
    () => cotizandoLaser.value,
    (nuevo, anterior) => {
        // Vaciar items si hay un cambio de estado y hay elementos
        if (anterior !== undefined && cotizacion.value.items.length > 0) {
            cotizacion.value.items = [];
        }
    }
);

// Watcher para vaciar cotizacion.items cuando cotizandoPlasticaOcular cambie de estado
watch(
    () => cotizandoPlasticaOcular.value,
    (nuevo, anterior) => {
        // Vaciar items si hay un cambio de estado y hay elementos
        if (anterior !== undefined && cotizacion.value.items.length > 0) {
            cotizacion.value.items = [];
        }
    }
);

watch(
    () => isCodificacion.value,
    (esCodificacion) => {
        if (esCodificacion) {
            cotizandoLaser.value = false;
            cotizandoPlasticaOcular.value = false;
        }
    }
);

const getApiErrorMessage = (apiError, fallbackMessage) => {
    const data = apiError?.data || {}

    if (data?.errors && typeof data.errors === 'object') {
        const firstFieldErrors = Object.values(data.errors).find((v) => Array.isArray(v) && v.length)
        if (firstFieldErrors) return firstFieldErrors[0]
    }

    return data?.message || apiError?.message || fallbackMessage
}

const validarAntesDeGuardar = () => {
    if (!cotizacion.value.origen) return 'Debes seleccionar el origen.'
    if (!cotizacion.value.tipo_gestion) return 'Debes seleccionar el tipo de gestión.'
    if (!cotizacion.value.medico_id) return 'Debes seleccionar un médico.'
    if (!cotizacion.value.consultorio_id) return 'Debes seleccionar un consultorio.'
    if (!paciente.value.entidad_id) return 'Debes seleccionar una entidad.'

    if (!cotizacion.value.items?.length) return 'Debes agregar al menos un procedimiento.'

    if (!paciente.value.id) {
        if (!paciente.value.tipo_identificacion) return 'El tipo de identificación del paciente es obligatorio.'
        if (!paciente.value.numero_identificacion) return 'El número de identificación del paciente es obligatorio.'
        if (!paciente.value.nombres) return 'El nombre del paciente es obligatorio.'
        if (!paciente.value.apellidos) return 'Los apellidos del paciente son obligatorios.'
    }

    if (isCodificacion.value) {
        if (!codificacion.value.autorizacion) return 'El número de autorización es obligatorio para codificación.'
        if (!codificacion.value.fechaVigencia) return 'La fecha de vigencia es obligatoria para codificación.'
    }

    return null
}

const guardarCotizacion = async () => {
    cerrarDropdowns()
    const errorValidacion = validarAntesDeGuardar()
    if (errorValidacion) {
        pushNotification('error', errorValidacion, 'Validación')
        return
    }

    loading.value = true;
    try {
        let payload = {
            origen: cotizacion.value.origen,
            fecha_ordenamiento: fechaOrdenamiento.value || null,
            fecha_inicio_vigencia: cotizacion.value.fecha_vigencia || null,
            tipo_gestion: cotizacion.value.tipo_gestion,
            medico_id: cotizacion.value.medico_id,
            entidad_id: paciente.value.entidad_id,
            consultorio_id: cotizacion.value.consultorio_id,
            poliza_id: cotizacion.value.poliza_id || null,
            observaciones: cotizacion.value.observaciones,

            // 🔹 Procedimientos
            items: cotizacion.value.items.map(item => ({
                codigo: item.codigo,
                nombre: item.nombre,
                lateralidad: item.lateralidad,
                valor: Number(item.valor_con_descuento || item.valor),
                descuento: Number(item.descuento ?? 0),
                concepto: item.concepto ?? '',
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
                    auxilio_lente: Number(codificacion.value.auxilioLente || 0),
                    pre_anestesia: Number(codificacion.value.preAnestesia),
                    otros: Number(codificacion.value.otros),
                    fecha_vigencia: codificacion.value.fechaVigencia,
                    fecha_autorizacion: codificacion.value.fechaAutorizacion,
                    insumos: Number(totalInsumos.value)
                }
            };
        }

        let result;
        if (props.mode === 'edit') {
            result = await update(route.params.id, payload)
        } else {
            result = await create(payload)
        }

        const apiError = result?.error?.value
        if (apiError) {
            pushNotification('error', getApiErrorMessage(apiError, 'Error al guardar cotización.'), 'Error')
            return
        }

        const apiData = result?.data?.value
        if (!apiData?.success) {
            pushNotification('error', apiData?.message || 'Error al guardar cotización, valida los datos.', 'Error')
            return
        }

        if (props.mode === 'edit') {
            pushNotification('success', `Cotización editada con código:\n${apiData.codigo}`, 'Éxito');
            emit('saved', apiData)
        } else {
            pushNotification('success', `Cotización creada con código:\n${apiData.codigo}`, 'Éxito');
        }

        if (props.mode === 'edit') return

        // Reset
        paciente.value = { tipo_identificacion: '', numero_identificacion: '', nombres: '', apellidos: '', correo: '', telefono: '', entidad_id: '' }
        cotizacion.value = { origen: '', tipo_gestion: '', medico_id: '', consultorio_id: '', observaciones: '', poliza_id: '', poliza: null, valor_poliza: 0, fecha_vigencia: '', items: [], insumos: [], lentes: [] }
        codificacion.value = { autorizacion: '', copago: '', excedenteTope: '', lentes: '', auxilioLente: '', preAnestesia: '', otros: '', fechaVigencia: '', fechaAutorizacion: '' };
        cotizandoLaser.value = false;
        cotizandoPlasticaOcular.value = false;

        const createdId = apiData?.id;
        if (createdId) {
            setTimeout(() => {
                if (isCodificacion.value) {
                    router.push({
                        path: `/cotizacion/imprimir/${createdId}`,
                        query: { paciente: '1', origen: 'codificacion' }
                    });
                    return;
                }

                router.push(`/cotizacion/imprimir/${createdId}`);
            }, 2500);
        }


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
