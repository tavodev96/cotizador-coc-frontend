<template>
    <div class="font-sans text-slate-900 antialiased min-h-screen flex items-center justify-center px-4 py-8">
        <div class="w-full max-w-5xl grid lg:grid-cols-2 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <Notivue v-slot="item">
                <Notification :item="item" :icons="filledIcons" class="text-2xl" />
            </Notivue>
            <div class="hidden lg:flex flex-col justify-between bg-gradient-to-br from-indigo-800 to-slate-900 p-10 text-white">
                <div>
                    <a href="/">
                        <img src="/img/logo_clinica_oftalmologia.png" class="w-56" alt="Clínica_de_oftalmologia_de_Cali">
                    </a>
                </div>
                <div>
                    <h1 class="text-3xl font-semibold mb-3">Bienvenido</h1>
                    <p class="text-slate-200">Accede para gestionar cotizaciones, seguimiento, tarifas y programación en una sola plataforma.</p>
                </div>
            </div>

            <div class="w-full px-6 md:px-10 py-10 flex flex-col justify-center">
                <form @submit.prevent="submit">

                    <div class="pb-8 text-center lg:text-left">
                        <span class="text-3xl font-semibold text-slate-900">Inicio de sesión</span>
                        <p class="mt-2 text-slate-500">Ingresa tus credenciales para continuar.</p>
                    </div>

                    <div>
                        <label class="block font-medium text-sm text-slate-700 mb-1" for="email" value="Email" />
                        <input type='email' name='email' placeholder='Email'
                            class="w-full h-11 rounded-xl px-4 border border-slate-300 text-sm bg-white"
                            v-model="obj.email" />
                    </div>


                    <div class="mt-4">
                        <label class="block font-medium text-sm text-slate-700 mb-1" for="password" value="Password" />
                        <div class="relative">
                            <input id="password" type="password" name="password" placeholder="Password"
                                ref="passwordInputRef" required autocomplete="current-password"
                                class='w-full h-11 rounded-xl px-4 border border-slate-300 text-sm bg-white'
                                v-model="obj.password">

                            <div class="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                                <button type="button" @click="passwordInput"
                                    class="text-gray-500 focus:outline-none focus:text-gray-600 hover:text-gray-600">
                                    <nuxt-icon name="password" filled />
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- <div class="block mt-4">
                            <label for="remember_me" class="flex items-center">
                                <input type="checkbox" id="remember_me" name="remember" class = 'rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500']) !!}>
                                <span class="ms-2 text-sm text-gray-600">Remember Me</span>
                            </label>
                        </div> -->

                    <div class="flex items-center justify-end mt-6">
                        <!-- <a class="hover:underline text-sm text-gray-600 hover:text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" href="{{ route('password.request') }}">
                                    Forgot your password?
                                </a> -->

                        <button type="submit" v-if="!validatingCredentials"
                            class='inline-flex items-center h-11 px-6 bg-indigo-700 border border-transparent rounded-xl font-semibold text-sm text-white uppercase tracking-widest hover:bg-indigo-800 focus:outline-none transition ease-in-out duration-150'>
                            Acceder
                        </button>

                        <div v-else class="flex justify-center items-center">
                            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg"
                                fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                </path>
                            </svg>
                            <span class="text-slate-700">Analizando credenciales...</span>
                        </div>
                    </div>
                </form>

                <div v-if="errorMessages" class="mt-4 text-red-500 text-sm text-center" v-html="errorMessages"></div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { Notivue, Notification, filledIcons } from 'notivue'

definePageMeta({
    layout: false,
});

const { login } = useSanctumAuth()

const obj = ref({});
const errorMessages = ref('');
const validatingCredentials = ref(false);

const submit = async () => {
    validatingCredentials.value = true;
    errorMessages.value = '';
    
    const credentials = {
        email: obj.value.email,
        password: obj.value.password,
    }

    try {
        await login(credentials)
    } catch (error) {
        console.log(error.response._data.errors);

        const errors = error.response._data.errors;

        if (errors) {
            pushNotification('error', 'Estas credenciales no coinciden con nuestros registros.', 'Error de autenticación')
        }
    } finally {
        validatingCredentials.value = false;
        obj.value = { email: '', password: '' }
    }
}

const passwordInputRef = ref(null)

const passwordInput = () => {
    const inputElement = passwordInputRef.value
    if (inputElement) {
        if (inputElement.type === 'password') {
            inputElement.type = 'text'
        } else {
            inputElement.type = 'password'
        }
    }
}

const pushNotification = (type, message, title) => {
    push[type]({
        title: title,
        message: message,
        ariaRole: 'alert'
    })
}
</script>

<style>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>