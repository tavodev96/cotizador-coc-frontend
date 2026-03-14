<template>
  <a :href="link" class="group flex justify-between items-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 my-1 w-full px-3 py-2 rounded-lg transition-colors">
    <span class="font-medium text-sm">{{ label }}</span>
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="transition-transform group-hover:translate-x-0.5">
      <path fill="currentColor"
        d="M12.6 12L8.7 8.1q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.6 4.6q.15.15.213.325t.062.375t-.062.375t-.213.325l-4.6 4.6q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7z" />
    </svg>
  </a>
</template>

<script setup>
defineProps({ label: String, link: String })
</script>
