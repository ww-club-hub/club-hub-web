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

function handlePaste(event: ClipboardEvent, idx: number) {
  const pastedText = event.clipboardData?.getData('text');
  if (!pastedText) return;
  
  // Split by newlines, commas, tabs, or semicolons
  const pastedItems = pastedText
    .split(/[\n\r\t,;]+/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
  
  // If more than one item was pasted, handle as bulk paste
  if (pastedItems.length > 1) {
    event.preventDefault();
    
    // Replace current item with first pasted item
    items.value[idx] = pastedItems[0];
    
    // Insert remaining items after current position
    const before = items.value.slice(0, idx + 1);
    const after = items.value.slice(idx + 1);
    const newItems = [...before, ...pastedItems.slice(1), ...after];
    
    // Respect maxItems limit
    if (props.maxItems !== undefined) {
      items.value = newItems.slice(0, props.maxItems);
    } else {
      items.value = newItems;
    }
  }
  // For single item paste, let default behavior handle it
}
</script>

<template>
  <div>
    <label v-if="label" class="block mb-2 text-sm font-medium text-gray-800 dark:text-gray-200">{{ label }}</label>
    <div class="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 focus-within:ring-orange-500 focus-within:border-orange-500 focus-within:ring-1 transition">
      <!-- Email list items -->
      <div class="max-h-96 overflow-y-auto">
        <div
          v-for="(id, idx) in itemIds"
          :key="id"
          class="flex items-center group border-b border-gray-200 dark:border-gray-600 last:border-0 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
        >
          <input
            :type="type"
            :placeholder="placeholder ?? itemLabel"
            :required="required"
            v-model="items[idx]"
            @paste="handlePaste($event, idx)"
            class="flex-1 bg-transparent border-none text-gray-900 text-sm px-3 py-2.5 focus:outline-none focus:ring-0 dark:text-white dark:placeholder-gray-400"
          />
          <button
            type="button"
            class="opacity-0 group-hover:opacity-70 hover:opacity-100! text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 disabled:opacity-0 disabled:cursor-not-allowed transition px-3"
            @click="removeItem(idx)"
            :disabled="minItems !== undefined && items.length <= minItems"
            aria-label="Remove"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
              <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Add button -->
      <button
        type="button"
        class="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
        @click="addItem"
        :disabled="maxItems !== undefined && items.length >= maxItems"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <span>Add {{ itemLabel || 'item' }}</span>
      </button>
    </div>
    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Tip: Paste multiple items from a spreadsheet</p>
  </div>
</template>
