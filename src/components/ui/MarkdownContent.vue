<script setup lang="ts">
import { marked } from "marked";
import DOMPurify from "dompurify";
import { computedAsync } from "@vueuse/core";

const props = defineProps<{
  content: string;
}>();

const sanitizedHtml = computedAsync(async () => {
  if (!props.content) return "";
  const html = await marked(props.content);
  return DOMPurify.sanitize(html);
});
</script>

<template>
  <div class="prose prose-sm dark:prose-invert max-w-none" v-html="sanitizedHtml" />
</template>
