<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-8">
    <div class="max-w-md w-full text-center px-6 py-10 bg-white border border-slate-200 rounded-3xl shadow-sm">
      <div class="mb-8">
        <div class="text-6xl font-bold text-red-500 mb-4">403</div>
        <h1 class="text-3xl font-bold text-slate-900 mb-2">
          Acceso Denegado
        </h1>
        <p class="text-slate-600 mb-8">
          No tienes permisos para acceder a esta página.
        </p>
      </div>

      <div class="space-y-4">
        <nuxt-link 
          to="/admin/dashboard" 
          class="inline-block bg-indigo-700 text-white px-6 py-3 rounded-xl hover:bg-indigo-800 transition"
        >
          Volver al Dashboard
        </nuxt-link>
        
        <div>
          <button 
            @click="goBack" 
            class="text-slate-600 hover:text-slate-900 transition"
          >
            Regresar a la página anterior
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: false,
})

const router = useRouter()

const goBack = () => {
  router.back()
}
</script>
