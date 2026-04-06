<script setup lang="ts">
const show = defineModel<boolean>("show", {
  default: false
});

const props = defineProps<{
  title: string,
  message: string,
  confirmText?: string,
  cancelText?: string
}>();

const emit = defineEmits<{
  (e: 'confirm'): void,
  (e: 'cancel'): void
}>();

function handleConfirm() {
  emit('confirm');
  show.value = false;
}

function handleCancel() {
  emit('cancel');
  show.value = false;
}
</script>

<template>
  <dialog :open="show" tabindex="-1" class="overflow-y-auto overflow-x-hidden fixed inset-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full bg-gray-300/75 dark:bg-gray-900/75">
    <div class="relative p-4 w-full max-w-md max-h-full left-1/2 top-1/2 -translate-1/2">
      <div class="relative bg-white rounded-lg dark:bg-gray-700 shadow-lg">
        <div class="flex items-center justify-between p-4 border-b rounded-t dark:border-gray-600 border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ title }}
          </h3>
          <button type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" @click="handleCancel">
            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
            </svg>
          </button>
        </div>
        <div class="p-4">
          <p class="text-gray-700 dark:text-gray-300">{{ message }}</p>
        </div>
        <div class="flex items-center gap-3 p-4 border-t border-gray-200 dark:border-gray-600">
          <button @click="handleConfirm" class="text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800">
            {{ confirmText || 'Confirm' }}
          </button>
          <button @click="handleCancel" class="text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">
            {{ cancelText || 'Cancel' }}
          </button>
        </div>
      </div>
    </div>
  </dialog>
</template>
