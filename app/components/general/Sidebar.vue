<template>
  <div class="w-2/12 mr-6">
    <div class="bg-white rounded-xl shadow-lg mb-6 px-6 py-4">
      <SidebarLink label="Inicio" link="/admin/dashboard" />
    </div>
    <div class="bg-white rounded-xl shadow-lg mb-6 px-6 py-4">
      <SidebarLink label="Cotizar" link="/gestion/cotizacion" />
      <SidebarLink label="Seguimiento" link="/gestion/seguimiento" />
      <SidebarLink label="Ordenamientos" link="/ordenamientos" />
    </div>
    <div class="bg-white rounded-xl shadow-lg mb-6 px-6 py-4">
      <SidebarLink label="Cotizaciones" link="/consultas/cotizaciones" />
    </div>
    <div class="bg-white rounded-xl shadow-lg mb-6 px-6 py-4">
      <SidebarLink label="Procedimientos" link="/tarifas/procedimientos" />
      <SidebarLink label="Insumos" link="/tarifas/insumos" />
      <SidebarLink label="Lentes" link="/tarifas/lentes" />
      <!-- <SidebarLink label="Settings" link="/settings" /> -->
    </div>
    <div class="bg-white rounded-xl shadow-lg mb-6 px-6 py-4">
      <!-- <SidebarLink label="Settings" link="/settings" /> -->
      <SidebarLink label="Cerrar sesión" link="/logout" />
    </div>
  </div>
</template>

<script setup>
import SidebarLink from './SidebarLink.vue'
</script>
