<script setup>
const nuxtApp = useNuxtApp()
const routeLoading = ref(false)

nuxtApp.hook('page:start', () => {
    routeLoading.value = true
})

nuxtApp.hook('page:finish', () => {
    routeLoading.value = false
})

nuxtApp.hook('page:error', () => {
    routeLoading.value = false
})
</script>

<template>
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-slate-900">
        <Transition name="shell-fade" mode="out-in">
            <div v-if="routeLoading" key="public-shell" class="max-w-5xl mx-auto px-4 py-8 space-y-4 animate-pulse">
                <div class="h-10 w-56 bg-slate-200 rounded-lg"></div>
                <div class="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                    <div class="h-10 w-full bg-slate-100 rounded-lg"></div>
                    <div class="h-10 w-full bg-slate-100 rounded-lg"></div>
                    <div class="h-10 w-1/3 bg-slate-200 rounded-lg"></div>
                </div>
            </div>

            <div v-else key="public-content">
                <slot />
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.shell-fade-enter-active,
.shell-fade-leave-active {
    transition: opacity 180ms ease;
}

.shell-fade-enter-from,
.shell-fade-leave-to {
    opacity: 0;
}
</style>