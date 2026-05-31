<template>
    <div>
        <div class="border border-[#dfdede] rounded-lg shadow-md grid grid-cols-3 gap-4 p-4">
            <div class=" flex flex-col gap-1">
                <label class="font-semibold">Copago:</label>
                <input v-model="copago" placeholder="Valor" class="p-2 border rounded col-span-2" type="text"
                    @blur="handleBlur('copago')" />
            </div>
            <div class=" flex flex-col gap-1">
                <label class="font-semibold">Excedente tope:</label>
                <input v-model="excedenteTope" placeholder="Valor" class="p-2 border rounded col-span-2" type="text"
                    @blur="handleBlur('excedenteTope')" />
            </div>
            <div class=" flex flex-col gap-1">
                <label class="font-semibold">
                    Lente
                    <span class="text-xs text-slate-500 font-normal">
                        ({{ formatearNumero(baseLente) }})
                    </span>
                </label>
                <input v-model="lenteVisible" placeholder="Valor" class="p-2 border rounded col-span-2" type="text"
                    readonly @blur="handleBlur('lentes')" />
            </div>
            <div class=" flex flex-col gap-1">
                <label class="font-semibold">Auxilio de lente:</label>
                <input v-model="auxilioLente" placeholder="Valor" class="p-2 border rounded col-span-2" type="text"
                    @blur="handleBlur('auxilioLente')" />
            </div>
            <div class=" flex flex-col gap-1">
                <label class="font-semibold">Pre-Anestesia:</label>
                <input v-model="preAnestesia" placeholder="Valor" class="p-2 border rounded col-span-2" type="text"
                    @blur="handleBlur('preAnestesia')" />
            </div>
            <div class=" flex flex-col gap-1">
                <label class="font-semibold">Otros:</label>
                <input v-model="otros" placeholder="Valor" class="p-2 border rounded col-span-2" type="text"
                    @blur="handleBlur('otros')" />
            </div>
            <div class="flex flex-col gap-1">
                <label class="font-semibold">Insumos:</label>
                <input :value="formatearNumero(props.insumos || 0)" placeholder="Valor" 
                    class="p-2 border rounded col-span-2 bg-gray-100" type="text" disabled />
            </div>
            <div class="flex flex-col gap-1">
                <label class="font-semibold">Fecha de autorización:</label>
                <input v-model="fechaAutorizacion" type="date" class="p-2 border rounded col-span-2"
                    @change="handleBlur('fechaAutorizacion')" />
            </div>
            <div class="flex flex-col gap-1">
                <label class="font-semibold">Fecha de vigencia:</label>
                <input v-model="fechaVigencia" type="date" :min="fechaMinima" class="p-2 border rounded col-span-2"
                    @change="handleBlur('fechaVigencia')" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, computed, defineEmits } from 'vue';

const emit = defineEmits(['update:valores']);

const props = defineProps({
    lentes: {
        type: Number,
        default: 0
    },
    insumos: {
        type: Number,
        default: 0
    }
});

const formFields = {
    copago: ref(''),
    excedenteTope: ref(''),
    auxilioLente: ref(''),
    preAnestesia: ref(''),
    otros: ref(''),
    fechaVigencia: ref(''),
    fechaAutorizacion: ref('')
};

const lenteVisible = ref('0');

const { copago, excedenteTope, auxilioLente, preAnestesia, otros, fechaVigencia, fechaAutorizacion } = formFields;

const limpiarNumero = (valor) => Number(String(valor ?? '').replace(/[^\d]/g, '')) || 0;

const formatearNumero = (valor) => {
    const numero = limpiarNumero(valor);
    if (numero === 0) return '0';

    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(numero);
};

const baseLente = computed(() => limpiarNumero(props.lentes));

const syncLenteVisible = () => {
    const auxilio = limpiarNumero(auxilioLente.value);
    const neto = Math.max(baseLente.value - auxilio, 0);
    lenteVisible.value = formatearNumero(neto);
};

const fechaMinima = computed(() => {
    const hoy = new Date();
    hoy.setDate(hoy.getDate() + 1); // Suma un día
    return hoy.toISOString().split('T')[0];
});

const handleBlur = (key) => {
    const reactiveRef = formFields[key];
    const dataToSend = {};

    if (key === 'auxilioLente') {
        const auxilioValor = limpiarNumero(reactiveRef.value);
        if (auxilioValor > 0 && baseLente.value === 0) {
            alert('Debes ingresar un lente antes de colocar un auxilio.');
        }
        syncLenteVisible();
    }

    if (key === 'fechaVigencia' || key === 'fechaAutorizacion') {
        dataToSend[key] = reactiveRef.value;
    } else if (reactiveRef && reactiveRef.value) {
        const valorLimpio = String(reactiveRef.value).replace(/[^\d]/g, '');
        reactiveRef.value = formatearNumero(valorLimpio);
    }

    for (const prop in formFields) {
        if (prop === 'fechaVigencia' || prop === 'fechaAutorizacion') {
            dataToSend[prop] = formFields[prop].value;
        } else {
            const cleanedValue = String(formFields[prop].value).replace(/[^\d]/g, '');
            dataToSend[prop] = cleanedValue;
        }
    }

    dataToSend.lentes = String(lenteVisible.value).replace(/[^\d]/g, '');

    emit('update:valores', dataToSend);
};


watch(() => props.lentes, () => {
    syncLenteVisible();
    handleBlur('lentes');
}, { immediate: true })

watch(() => props.insumos, () => {
    // Props se actualizan automáticamente
}, { immediate: true })
</script>