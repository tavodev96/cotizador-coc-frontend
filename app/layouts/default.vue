<script setup>
const nuxtApp = useNuxtApp()
const routeLoading = ref(false)
const { user } = useSanctumAuth()
const { status: syncStatus, fetchStatus, lastCompletedAt, abortSync, runningAction } = useSyncManagement()

const abortar = async () => {
  await abortSync()
}

const showCompletionNotice = ref(false)
let syncPollTimer = null
let completionTimer = null

const stopSyncPolling = () => {
  if (syncPollTimer) {
    clearInterval(syncPollTimer)
    syncPollTimer = null
  }
}

useHead({
  link: [
    { rel: 'preload', href: '/img/logo_clinica_oftalmologia.png', as: 'image' }
  ]
})

nuxtApp.hook('page:start', () => {
  routeLoading.value = true
})

nuxtApp.hook('page:finish', () => {
  routeLoading.value = false
})

nuxtApp.hook('page:error', () => {
  routeLoading.value = false
})

const startSyncPolling = async () => {
  await fetchStatus()

  if (!syncStatus.value.running) {
    stopSyncPolling()
    return
  }

  stopSyncPolling()
  syncPollTimer = setInterval(() => {
    fetchStatus()
  }, 8000)
}

watch(
  () => syncStatus.value.running,
  (isRunning) => {
    if (isRunning) {
      startSyncPolling()
      return
    }

    stopSyncPolling()
  }
)

watch(
  () => syncStatus.value.finished_at,
  (finishedAt) => {
    if (!finishedAt || syncStatus.value.running) {
      return
    }

    if (lastCompletedAt.value === finishedAt) {
      return
    }

    lastCompletedAt.value = finishedAt
    showCompletionNotice.value = true

    if (completionTimer) {
      clearTimeout(completionTimer)
    }

    completionTimer = setTimeout(() => {
      showCompletionNotice.value = false
    }, 9000)
  }
)

onMounted(async () => {
  if (!user.value) {
    return
  }

  await startSyncPolling()
})

onBeforeUnmount(() => {
  stopSyncPolling()

  if (completionTimer) {
    clearTimeout(completionTimer)
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <div
      v-if="syncStatus.running"
      class="fixed inset-0 z-[60] bg-black/35 backdrop-blur-[1px]"
    >
      <div class="absolute top-5 left-1/2 -translate-x-1/2 w-[92%] max-w-3xl rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 shadow-lg">
        <div class="flex items-start justify-between gap-4">
          <p class="text-sm font-semibold uppercase tracking-wide">Actualización en curso</p>
          <button
            class="shrink-0 h-8 px-3 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="runningAction"
            @click="abortar"
          >
            Forzar detención
          </button>
        </div>
        <p class="mt-1 text-sm">
          {{ syncStatus.message || 'Se está ejecutando una sincronización de información.' }}
        </p>
        <p class="mt-1 text-xs text-amber-800">
          Por favor no use la herramienta hasta que finalice el proceso.
        </p>
        <p class="mt-2 text-xs text-amber-800">
          Progreso: {{ syncStatus.progress.percent }}% · Paso: {{ syncStatus.progress.current_step || '-' }}
        </p>
      </div>
    </div>

    <div
      v-else-if="showCompletionNotice"
      class="fixed top-5 left-1/2 -translate-x-1/2 z-[55] w-[92%] max-w-3xl rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900 shadow-lg"
    >
      <p class="text-sm font-semibold uppercase tracking-wide">Actualización finalizada</p>
      <p class="mt-1 text-sm">
        {{ syncStatus.last_error ? 'La sincronización terminó con novedades. Revise con superadmin.' : 'La información se actualizó correctamente. Puede continuar usando el sistema.' }}
      </p>
    </div>

    <GeneralNavbar />
    <div class="flex flex-col lg:flex-row gap-6 pt-24 px-4 md:px-6 xl:px-8 pb-6 max-w-[1600px] mx-auto">
      <LazyGeneralSidebar />
      <main class="flex-1 min-w-0">
        <Transition name="shell-fade" mode="out-in">
          <div v-if="routeLoading" key="default-shell" class="space-y-4 animate-pulse">
            <div class="h-8 w-1/3 bg-slate-200 rounded-lg"></div>
            <div class="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              <div class="h-10 w-full bg-slate-100 rounded-lg"></div>
              <div class="h-10 w-5/6 bg-slate-100 rounded-lg"></div>
              <div class="h-10 w-4/6 bg-slate-100 rounded-lg"></div>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              <div class="h-5 w-1/4 bg-slate-200 rounded"></div>
              <div class="h-24 w-full bg-slate-100 rounded-xl"></div>
            </div>
          </div>

          <div v-else key="default-content">
            <slot />
          </div>
        </Transition>
      </main>
    </div>
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