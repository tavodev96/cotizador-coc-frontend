<template>
  <div class="flex flex-row">
          <DashboardWelcomeCard />
          <DashboardInboxCard />
        </div>
        <!-- <div class="flex flex-row h-64 mt-6 space-x-6">
          <DashboardStatCard>a</DashboardStatCard>
          <DashboardStatCard>b</DashboardStatCard>
          <DashboardStatCard>c</DashboardStatCard>
        </div> -->
</template>

<script setup>
definePageMeta({
  layout: 'default',
  middleware: ['sanctum:auth']
})
</script>