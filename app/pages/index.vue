<template>
    <div class="min-h-screen flex items-center justify-center px-4 py-8">
        <div class="w-full max-w-6xl bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden grid lg:grid-cols-2">
            <div class="hidden lg:block relative min-h-[640px] bg-slate-100">
                <img src="/img/clinicaofta.png"
                    alt="Clínica" class="object-cover w-full h-full">
                <div class="absolute inset-0 bg-gradient-to-tr from-slate-950/55 via-indigo-900/30 to-transparent"></div>
            </div>
            <div class="py-12 px-8 md:px-12 lg:px-14 flex flex-col justify-center">
                <div class="mb-8">
                    <p class="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600 mb-3">Clínica de Oftalmología</p>
                    <h1 class="text-3xl font-semibold text-slate-900 mb-2">Sistema de información</h1>
                    <p class="text-slate-600">Accede a tu cuenta para gestionar cotizaciones, consultas y seguimiento.</p>
                </div>

                <div>
                    <a href="/login"
                        class="inline-flex justify-center items-center h-12 px-6 rounded-xl bg-indigo-700 text-white font-semibold hover:bg-indigo-800 transition-colors duration-200">
                        Gestión Barra SAI</a>
                </div>

                <div class="mt-8 text-center md:text-left">
                    <a href="#" class="hover:underline inline-flex items-center gap-1 text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                            viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE -->
                            <path fill="#000000"
                                d="M11.95 18q.525 0 .888-.363t.362-.887t-.362-.888t-.888-.362t-.887.363t-.363.887t.363.888t.887.362m-.9-3.85h1.85q0-.825.188-1.3t1.062-1.3q.65-.65 1.025-1.238T15.55 8.9q0-1.4-1.025-2.15T12.1 6q-1.425 0-2.312.75T8.55 8.55l1.65.65q.125-.45.563-.975T12.1 7.7q.8 0 1.2.438t.4.962q0 .5-.3.938t-.75.812q-1.1.975-1.35 1.475t-.25 1.825M12 22q-2.075 0-3.9-.787t-3.175-2.138T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m0-8" />
                        </svg>
                        <span class="text-slate-700">Necesito ayuda</span>
                    </a>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup>
definePageMeta({
    layout: 'public'
})
</script>
