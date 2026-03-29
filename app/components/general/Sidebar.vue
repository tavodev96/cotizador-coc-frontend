<template>
  <aside class="w-full lg:w-[280px] xl:w-[300px] shrink-0">
    <!-- Inicio - Siempre visible para usuarios autenticados -->
    <div class="bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 px-4 py-4">
      <SidebarLink label="Inicio" link="/admin/dashboard" />
    </div>

    <!-- Gestión - Visible si tiene permisos de cotizaciones -->
    <div v-if="canAccessGestion" class="bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 px-4 py-4">
      <p class="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Gestión</p>
      <SidebarLink v-if="hasPermission('cotizar.crear')" label="Cotizar" link="/gestion/cotizacion" />
      <SidebarLink v-if="hasPermission('cotizar.ver')" label="Seguimiento" link="/gestion/seguimiento" />
      <SidebarLink v-if="hasPermission('cotizar.ver')" label="Ordenamientos" link="/ordenamientos" />
    </div>

    <!-- Consultas - Visible si puede ver cotizaciones -->
    <div v-if="hasPermission('cotizar.ver')" class="bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 px-4 py-4">
      <p class="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Consultas</p>
      <SidebarLink label="Cotizaciones" link="/consultas/cotizaciones" />
    </div>

    <!-- Cirugía - Visible según permisos de programación/cirugía -->
    <div v-if="canAccessCirugia" class="bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 px-4 py-4">
      <p class="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Cirugía</p>
      <SidebarLink v-if="canAccessProgramacion" label="Programación" link="/programacion" />
      <SidebarLink v-if="canAccessProcedimientosCirugia" label="Procedimientos" link="/programacion/procedimientos" />
    </div>

    <!-- Tarifas - Visible si tiene permisos de tarifas -->
    <div v-if="canAccessTarifas" class="bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 px-4 py-4">
      <p class="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Tarifas</p>
      <SidebarLink label="Procedimientos" link="/tarifas/procedimientos" />
      <SidebarLink label="Insumos" link="/tarifas/insumos" />
      <SidebarLink label="Lentes" link="/tarifas/lentes" />
    </div>

    <!-- Reportes - Visible según permisos de reportes -->
    <div v-if="canAccessReportes" class="bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 px-4 py-4">
      <p class="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Reportes</p>
      <SidebarLink v-if="canAccessReporteCotizaciones" label="Reporte de cotizaciones" link="/reportes/cotizaciones" />
    </div>

    <!-- Configuración - Visible si tiene permisos de configuración -->
    <div v-if="canAccessConfiguracion" class="bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 px-4 py-4">
      <p class="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Configuración</p>
      <SidebarLink v-if="canAccessUsuariosConfig" label="Usuarios" link="/configuracion/usuarios" />
      <SidebarLink v-if="canAccessRolesPermisosConfig" label="Roles y permisos" link="/configuracion/roles-permisos" />
      <SidebarLink v-if="hasPermission('configuracion.errores.ver') || isSuperAdmin" label="Errores del sistema" link="/configuracion/errores-sistema" />
      <SidebarLink v-if="isSuperAdmin" label="Sincronización Informix" link="/configuracion/sincronizacion" />
    </div>

    <!-- Cerrar sesión - Siempre visible -->
    <div class="bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 px-4 py-4">
      <SidebarLink label="Cerrar sesión" link="/logout" />
    </div>
  </aside>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import SidebarLink from './SidebarLink.vue'

const { ensureUserPermissions, hasPermission, hasAnyPermission, hasRole } = useUserPermissions()

// Recargar permisos y roles al montar el componente
onMounted(async () => {
  ensureUserPermissions()
})

// Verificar si es administrador por rol
const isAdmin = computed(() => {
  return hasRole('Admin') || hasRole('administrador') || hasRole('admin')
})

const isSuperAdmin = computed(() => {
  return hasRole('superadmin') || hasRole('Superadmin')
})

const isConfigAdmin = computed(() => {
  return isAdmin.value || isSuperAdmin.value
})

// Verificar si puede acceder a la sección de cotizaciones
const canAccessGestion = computed(() => {
  return hasAnyPermission(['cotizar.crear', 'cotizar.ver', 'cotizar.editar'])
})

// Verificar si puede acceder a tarifas
const canAccessTarifas = computed(() => {
  return hasAnyPermission(['procedimientos.ver', 'insumos.ver', 'lentes.ver']) || isAdmin.value
})

// Verificar si puede acceder a programación/cirugía
const canAccessProgramacion = computed(() => {
  return hasPermission('programacion.ver') || isAdmin.value || isSuperAdmin.value
})

const canAccessProcedimientosCirugia = computed(() => {
  return hasPermission('programacion.procedimientos.ver') || isAdmin.value || isSuperAdmin.value
})

const canAccessCirugia = computed(() => {
  return canAccessProgramacion.value || canAccessProcedimientosCirugia.value
})

const canAccessConfiguracion = computed(() => {
  return isConfigAdmin.value || hasPermission('configuracion.errores.ver')
})

const canAccessUsuariosConfig = computed(() => {
  return isConfigAdmin.value
})

const canAccessRolesPermisosConfig = computed(() => {
  return isConfigAdmin.value
})

const canAccessReportes = computed(() => {
  return hasAnyPermission(['reportes.ver', 'reportes.cotizaciones.ver']) || isAdmin.value || isSuperAdmin.value
})

const canAccessReporteCotizaciones = computed(() => {
  return hasPermission('reportes.cotizaciones.ver') || isAdmin.value || isSuperAdmin.value
})
</script>
