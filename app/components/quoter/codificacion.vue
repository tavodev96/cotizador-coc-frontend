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
                <label class="font-semibold">Lente:</label>
                <input v-model="lentes" placeholder="Valor" class="p-2 border rounded col-span-2" type="text"
                    @blur="handleBlur('lentes')" />
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
                <label class="font-semibold">Fecha de vigencia:</label>
                <input v-model="fechaVigencia" type="date" :min="fechaMinima" class="p-2 border rounded col-span-2"
                    @change="handleBlur('fechaVigencia')" />
            </div>
            <div class="flex flex-col gap-1">
                <label class="font-semibold">Fecha de autorización:</label>
                <input v-model="fechaAutorizacion" type="date" :min="fechaMinima" class="p-2 border rounded col-span-2"
                    @change="handleBlur('fechaAutorizacion')" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, defineEmits } from 'vue';

const emit = defineEmits(['update:valores']);

const props = defineProps({
    lentes: String,
    insumos: Number
});

const values = {
    copago: ref(''),
    excedenteTope: ref(''),
    lentes: ref(props.lentes),
    preAnestesia: ref(''),
    otros: ref(''),
    fechaVigencia: ref(''),
    insumos: ref(props.insumos || 0),
    fechaAutorizacion: ref('')
};

const { copago, excedenteTope, lentes, preAnestesia, otros, fechaVigencia, insumos, fechaAutorizacion } = values;

const formatearNumero = (valor) => {
    const valorLimpio = String(valor).replace(/[^\d]/g, '');
    const numero = Number(valorLimpio);
    if (isNaN(numero) || numero === 0) return '0';

    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(numero);
};

const fechaMinima = computed(() => {
    const hoy = new Date();
    hoy.setDate(hoy.getDate() + 1); // Suma un día
    return hoy.toISOString().split('T')[0];
});

const handleBlur = (key) => {
    const reactiveRef = values[key];
    const dataToSend = {};

    if (key === 'fechaVigencia' || key === 'fechaAutorizacion') {
        dataToSend[key] = reactiveRef.value;
    } else if (reactiveRef && reactiveRef.value) {
        const valorLimpio = String(reactiveRef.value).replace(/[^\d]/g, '');
        reactiveRef.value = formatearNumero(valorLimpio);
    }

    for (const prop in values) {
        if (prop === 'fechaVigencia' || prop === 'fechaAutorizacion') {
            dataToSend[prop] = values[prop].value;
        } else if (prop === 'insumos') {
            // No enviar insumos ya que es de solo lectura
            continue;
        } else {
            const cleanedValue = String(values[prop].value).replace(/[^\d]/g, '');
            dataToSend[prop] = cleanedValue;
        }
    }

    emit('update:valores', dataToSend);
};


watch(() => props.lentes, (newValue) => {
    lentes.value = newValue;
    handleBlur('lentes');
}, { immediate: true })

watch(() => props.insumos, (newValue) => {
    insumos.value = newValue;
    handleBlur('insumos');
}, { immediate: true })
</script>