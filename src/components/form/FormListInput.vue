<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  label?: string,
  type: "text" | "email" | "url" | "date" | "number",
  required?: boolean,
  placeholder?: string,
  itemLabel?: string, // Optional label for each item
  minItems?: number,   // Minimum number of items (default 0)
  maxItems?: number    // Maximum number of items (optional)
}>();

const items = defineModel<string[]>({ required: true });

// Internal unique IDs for each item, not exposed to consumer
const itemIds = ref<string[]>([]);

// Sync itemIds with items length
function syncIds() {
  // Add IDs for new items
  while (itemIds.value.length < items.value.length) {
    itemIds.value.push(crypto.randomUUID());
  }
  // Remove IDs for removed items
  while (itemIds.value.length > items.value.length) {
    itemIds.value.pop();
  }
}

watch(items, () => {
  syncIds();
}, { immediate: true });

function addItem() {
  if (props.maxItems !== undefined && items.value.length >= props.maxItems) return;
  items.value = [...items.value, ""];
  itemIds.value.push(crypto.randomUUID());
}

function removeItem(idx: number) {
  if (props.minItems !== undefined && items.value.length <= props.minItems) return;
  items.value = items.value.filter((_, i) => i !== idx);
  itemIds.value = itemIds.value.filter((_, i) => i !== idx);
}
</script>

<template>
  <div>
    <label v-if="label" class="block mb-2 text-sm font-medium text-gray-800 dark:text-gray-200">{{ label }}</label>
    <div class="flex flex-col gap-2">
      <div
        v-for="(id, idx) in itemIds"
        :key="id"
        class="flex items-center gap-2 group"
      >
        <input
          :type="type"
          :placeholder="placeholder ?? itemLabel"
          :required="required"
          v-model="items[idx]"
          class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-md focus:ring-orange-400 focus:border-orange-400 block w-full px-2 py-1 dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-400 dark:focus:border-orange-400 transition shadow-none"
        />
        <button
          type="button"
          class="opacity-70 hover:opacity-100 text-xs px-2 py-1 rounded transition text-gray-500 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
          @click="removeItem(idx)"
          :disabled="minItems !== undefined && items.length <= minItems"
          aria-label="Remove"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <button
        type="button"
        class="self-start mt-1 text-xs px-3 py-1 rounded bg-gray-100 hover:bg-orange-100 text-orange-700 border border-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-orange-300 dark:hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex gap-3"
        @click="addItem"
        :disabled="maxItems !== undefined && items.length >= maxItems"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add
      </button>
    </div>
  </div>
</template>
