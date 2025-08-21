<template>
    <div class="font-sans text-gray-900 antialiased">
        <div class="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0">
            <div class="mb-4">
                <a href="/">
                    <img src="/img/logo_clinica_oftalmologia.png" class="w-64" alt="Clínica_de_oftalmologia_de_Cali">
                </a>
            </div>

            <div class="w-full sm:max-w-md mt-6 px-6 py-4 bg-[#162983] shadow-md overflow-hidden sm:rounded-lg">
                <form @submit.prevent="submit">

                    <div class="pt-4 pb-6">
                        <center>
                            <span class="text-2xl font-semibold text-[#ffffff]">Inicio de sesión</span>
                        </center>
                    </div>

                    <div>
                        <label class="block font-medium text-sm text-gray-700" for="email" value="Email" />
                        <input type='email' name='email' placeholder='Email'
                            class="w-full rounded-md py-2.5 px-4 border text-sm outline-[#1f2937]"
                            v-model="obj.email" />
                    </div>


                    <div class="mt-4">
                        <label class="block font-medium text-sm text-gray-700" for="password" value="Password" />
                        <div class="relative">
                            <input id="password" type="password" name="password" placeholder="Password"
                                ref="passwordInputRef" required autocomplete="current-password"
                                class='w-full rounded-md py-2.5 px-4 border text-sm outline-[#1f2937]'
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

                    <div class="flex items-center justify-end mt-4">
                        <!-- <a class="hover:underline text-sm text-gray-600 hover:text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" href="{{ route('password.request') }}">
                                    Forgot your password?
                                </a> -->

                        <button type="submit"
                            class='inline-flex items-center px-6 py-2 bg-[#1f2937] border border-transparent rounded-md font-semibold text-base text-white uppercase tracking-widest hover:bg-zinc-900 focus:bg-gray-700 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150'>
                            Acceder
                        </button>

                    </div>

                </form>
            </div>
        </div>
    </div>
</template>

<script setup>
definePageMeta({
  layout: false,
});

const { login } = useSanctumAuth()

const obj = ref({});

const submit = async () => {
    const credentials = {
        email: obj.value.email,
        password: obj.value.password,
    }

    await login(credentials)
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

</script>
