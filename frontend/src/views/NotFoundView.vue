<template>
  <div>
    <AppNavbar/>
    <div class="mt-[68px] min-h-[70vh] flex items-center justify-center text-center px-6">
      <div>
        <div class="text-7xl mb-4">🥭</div>
        <h1 class="font-serif text-4xl mb-3">Page Not Found</h1>
        <p class="text-gray-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div class="flex gap-3 justify-center">
          <router-link to="/" class="btn btn-primary">Go Home</router-link>
          <router-link to="/shop" class="btn btn-ghost">Shop Now</router-link>
        </div>
      </div>
    </div>
    <AppFooter/>
  </div>
</template>
<script setup>
import AppNavbar from '@/components/layout/AppNavbar.vue'; import AppFooter from '@/components/layout/AppFooter.vue'
</script>
