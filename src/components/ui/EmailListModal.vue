<script setup lang="ts">
import FormInput from '../form/FormInput.vue';
import FormListInput from '../form/FormListInput.vue';

const show = defineModel<boolean>("show", {
  default: false
});

const emails = defineModel<string[]>("emails", {
  default: []
});

const props = defineProps<{
  title: string,
  editable?: boolean,
  name?: string
}>();

const emit = defineEmits<{
  (e: 'save', data: { name: string, emails: string[] }): void
}>();

const localName = defineModel<string>("name", { default: "" });

function handleSave() {
  if (props.editable) {
    emit('save', { name: localName.value, emails: emails.value });
  }
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
          <button type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" @click="show = false">
            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
            </svg>
          </button>
        </div>
        <div class="p-4">
          <div v-if="!editable">
            <div v-if="emails.length" class="text-sm space-y-1 max-h-96 overflow-y-auto">
              <div v-for="email in emails" :key="email" class="text-gray-700 dark:text-gray-300 py-1 border-b border-gray-100 dark:border-gray-600 last:border-0">
                {{ email }}
              </div>
            </div>
            <p v-else class="text-gray-500 italic">No emails in this list</p>
          </div>
          <div v-else>
            <FormInput v-model="localName" label="List Name" type="text" required class="mb-3" />
            <FormListInput v-model="emails" type="email" item-label="Email address" :min-items="1" />
          </div>
        </div>
        <div class="flex items-center gap-3 p-4 border-t border-gray-200 dark:border-gray-600">
          <button v-if="!editable" @click="show = false" class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-none focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800">
            Close
          </button>
          <template v-else>
            <button @click="handleSave" class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-none focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800">
              Save
            </button>
            <button @click="show = false" class="text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">
              Cancel
            </button>
          </template>
        </div>
      </div>
    </div>
  </dialog>
</template>
