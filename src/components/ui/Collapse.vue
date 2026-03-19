<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ label: string; defaultActive?: boolean }>()

const active = ref(props.defaultActive ?? false)
</script>

<template>
  <div>
    <h2>
      <button
        type="button" @click="active = !active"
        class="flex items-center justify-between w-full p-5 font-medium rtl:text-right border focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 gap-3 transition-colors rounded-xl mb-3"
        :class="active
            ? 'border-gray-200 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
            : 'border-gray-200 text-gray-500 dark:text-gray-400'">
        <span>{{ label }}:</span>
        <svg
          class="w-3 h-3 shrink-0 transition-transform"
          :class="active ? '' : 'rotate-180'"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 10 6"
        >
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5 5 1 1 5"/>
        </svg>
      </button>
    </h2>
    <!-- content -->
    <transition name="collapse">
      <div v-show="active" class="overflow-hidden">
        <slot />
      </div>
    </transition>
  </div>
</template>

<style scoped>
.collapse-enter-active,
.collapse-leave-active {
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
}
.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  max-height: 500px;
  opacity: 1;
}
</style>
