<template>
  <a :href="link" class="flex justify-between items-center text-gray-600 hover:text-black my-2 w-full">
    {{ label }}
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
      <path fill="#888888"
        d="M12.6 12L8.7 8.1q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.6 4.6q.15.15.213.325t.062.375t-.062.375t-.213.325l-4.6 4.6q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7z" />
    </svg>
  </a>
</template>

<script setup>
defineProps({ label: String, link: String })
</script>
