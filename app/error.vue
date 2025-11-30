<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
</script>

<template>
    <div>
        <!-- component -->
        <!-- This is an example component -->
        <div
            class='flex items-center justify-center min-h-screen from-[#233972] via-greeen-300 to-blue-500 bg-gradient-to-br'>
            <div class='w-full max-w-lg px-10 py-8 mx-auto bg-white rounded-lg shadow-xl'>
                <div class='max-w-md mx-auto space-y-6'>

                    <div class="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6">
                        <div class="mx-auto max-w-screen-sm text-center">
                            <h1
                                class="mb-4 text-7xl tracking-tight font-extrabold lg:text-9xl text-primary-600 dark:text-primary-500">
                                {{ error.statusCode }}</h1>
                            <p class="mb-4 text-3xl tracking-tight font-bold text-black md:text-4xl">Internal Server
                                Error.</p>
                            <p class="mb-4 text-lg font-light text-gray-500 dark:text-gray-400">
                                <NuxtLink to="/login" class="bg-[#233972] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#1a2850] transition-colors duration-300">
                                    Go back home
                                </NuxtLink>
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
        
    </div>
</template>
