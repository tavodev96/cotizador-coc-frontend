<template>
  <div class="w-2/12 mr-6">
    <div class="bg-white rounded-xl shadow-lg mb-6 px-6 py-4">
      <SidebarLink label="Inicio" link="/admin/dashboard" />
      <SidebarLink label="Cotizar" link="/gestion/cotizacion" />
      <SidebarLink label="Seguimiento" link="/gestion/seguimiento" />
    </div>
    <div class="bg-white rounded-xl shadow-lg mb-6 px-6 py-4">
      <SidebarLink label="Ordenamientos" link="/ordenamientos" />
      <SidebarLink label="Tarifas" link="/tarifas" />
      <SidebarLink label="Insumos" link="/insumos" />
      <SidebarLink label="Lentes" link="/lentes" />
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
