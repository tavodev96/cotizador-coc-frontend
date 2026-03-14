<template>
  <header class="fixed top-0 inset-x-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur px-4 md:px-6 xl:px-8">
    <div class="max-w-[1600px] mx-auto flex items-center justify-between py-3">
      <div class="font-bold text-indigo-900 text-xl flex items-center gap-3">
        <img
          src="/img/logo_clinica_oftalmologia.png"
          class="w-36 md:w-40"
          alt="Clínica de Oftalmología"
          loading="eager"
          fetchpriority="high"
          decoding="sync"
        >
      </div>
      <div class="flex items-center gap-3 text-slate-500">
        <div class="hidden md:block text-right">
          <p class="text-sm font-medium text-slate-700">Sistema de cotización</p>
          <p class="text-xs text-slate-500">Gestión clínica</p>
        </div>
        <div class="bg-center bg-cover bg-no-repeat rounded-full inline-block h-11 w-11 ring-2 ring-slate-200"
          style="background-image: url(/img/user.png)">
        </div>
      </div>
    </div>
  </header>
</template>
