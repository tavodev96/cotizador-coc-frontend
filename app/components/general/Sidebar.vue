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
      <SidebarLink v-if="hasPermission('seguimiento.ver')" label="Seguimiento" link="/gestion/seguimiento" />
      <SidebarLink v-if="hasPermission('ordenamientos.ver')" label="Ordenamientos" link="/ordenamientos" />
      <SidebarLink v-if="canAccessAutogestion" label="Autogestión" link="/gestion/autogestion" />
    </div>

    <!-- Consultas - Visible si puede ver cotizaciones -->
    <div v-if="canAccessConsultas" class="bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 px-4 py-4">
      <p class="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Consultas</p>
      <SidebarLink v-if="canAccessCotizacionesConsulta" label="Cotizaciones" link="/consultas/cotizaciones" />
      <SidebarLink v-if="canAccessConsultasMedicas" label="Cotizaciones por médico" link="/consultas/medicos" />
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
      <SidebarLink v-if="hasPermission('procedimientos.ver')" label="Procedimientos" link="/tarifas/procedimientos" />
      <SidebarLink v-if="hasPermission('insumos.ver')" label="Insumos" link="/tarifas/insumos" />
      <SidebarLink v-if="hasPermission('lentes.ver')" label="Lentes" link="/tarifas/lentes" />
    </div>

    <!-- Reportes - Visible según permisos de reportes -->
    <div v-if="canAccessReportes" class="bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 px-4 py-4">
      <p class="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Reportes</p>
      <SidebarLink v-if="canAccessReporteCotizaciones" label="Reporte de cotizaciones" link="/reportes/cotizaciones" />
      <SidebarLink v-if="hasPermission('reportes.pgp.ver')" label="Reporte PGP" link="/reportes/pgp" />
      <SidebarLink v-if="canAccessReporteSalesforce" label="Reporte Salesforce" link="/reportes/salesforce" />
    </div>

    <!-- Configuración - Visible si tiene permisos de configuración -->
    <div v-if="canAccessConfiguracion" class="bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 px-4 py-4">
      <p class="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Configuración</p>
      <SidebarLink v-if="canAccessUsuariosConfig" label="Usuarios" link="/configuracion/usuarios" />
      <SidebarLink v-if="canAccessRolesPermisosConfig" label="Roles y permisos" link="/configuracion/roles-permisos" />
      <SidebarLink v-if="hasPermission('configuracion.correo.ver') || isSuperAdmin" label="Correo" link="/configuracion/correo" />
      <SidebarLink v-if="hasPermission('configuracion.pgp.editar')" label="Datos de impresión PGP" link="/configuracion/pgp" />
      <SidebarLink v-if="hasPermission('configuracion.maestros.ver') || isSuperAdmin" label="Maestros" link="/configuracion/maestros" />
      <SidebarLink v-if="canAccessFormularioCampos" label="Campos de formulario" link="/configuracion/formulario-campos" />
      <SidebarLink v-if="canAccessPowerBi" label="Integración Power BI" link="/configuracion/power-bi" />
      <SidebarLink v-if="hasPermission('configuracion.errores.ver') || isSuperAdmin" label="Errores del sistema" link="/configuracion/errores-sistema" />
      <SidebarLink v-if="isSuperAdmin" label="Sincronización Informix" link="/configuracion/sincronizacion" />
      <SidebarLink v-if="hasPermission('integraciones.salesforce.ver_logs') || isSuperAdmin" label="Integración Salesforce" link="/configuracion/integraciones-salesforce" />
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
  ensureUserPermissions(true)
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
  return hasAnyPermission(['cotizar.crear', 'seguimiento.ver', 'ordenamientos.ver', 'autogestion.ver'])
})

const canAccessAutogestion = computed(() => {
  return hasPermission('autogestion.ver') || isAdmin.value || isSuperAdmin.value
})

const canAccessConsultas = computed(() => {
  return canAccessCotizacionesConsulta.value || canAccessConsultasMedicas.value
})

const canAccessCotizacionesConsulta = computed(() => {
  if (hasRole('asesor_pgp')) return hasPermission('consultas.cotizaciones.ver')
  return hasAnyPermission(['cotizar.ver', 'consultas.cotizaciones.ver']) || hasRole('cajero') || hasRole('Cajero') || isAdmin.value || isSuperAdmin.value
})

const canAccessConsultasMedicas = computed(() => {
  return hasPermission('consultas.medicos.ver') || isAdmin.value || isSuperAdmin.value
})

// Verificar si puede acceder a tarifas
const canAccessTarifas = computed(() => {
  return hasAnyPermission(['procedimientos.ver', 'insumos.ver', 'lentes.ver'])
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
  return isConfigAdmin.value || hasAnyPermission(['configuracion.errores.ver', 'configuracion.correo.ver', 'configuracion.pgp.editar', 'configuracion.modulos', 'configuracion.permisos', 'reportes.cotizaciones.exportar'])
})

const canAccessFormularioCampos = computed(() => {
  return isSuperAdmin.value || isAdmin.value
})

const canAccessPowerBi = computed(() => {
  return hasPermission('reportes.cotizaciones.exportar') || isAdmin.value || isSuperAdmin.value
})

const canAccessUsuariosConfig = computed(() => {
  return isConfigAdmin.value
})

const canAccessRolesPermisosConfig = computed(() => {
  return isConfigAdmin.value
})

const canAccessReportes = computed(() => {
  return hasAnyPermission(['reportes.ver', 'reportes.cotizaciones.ver', 'reportes.pgp.ver', 'reportes.salesforce.ver']) || isAdmin.value || isSuperAdmin.value
})

const canAccessReporteCotizaciones = computed(() => {
  return hasPermission('reportes.cotizaciones.ver') || isAdmin.value || isSuperAdmin.value
})

const canAccessReporteSalesforce = computed(() => {
  return hasPermission('reportes.salesforce.ver')
})
</script>
