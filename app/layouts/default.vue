<template>
  <div class="bg-sky-50 min-h-screen">
    <GeneralNavbar />
    <div class="flex flex-row pt-24 px-10 pb-4">
      <GeneralSidebar />
      <div class="w-10/12">
        <slot />
      </div>
    </div>
  </div>
</template>