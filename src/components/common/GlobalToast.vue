<script setup lang="ts">
import { computed } from 'vue';
import { useToast } from '@/composables/useToast';

const { state } = useToast();

const toastTypeClass = computed(() => {
  if (state.type === 'error') {
    return 'toast-error';
  }
  if (state.type === 'info') {
    return 'toast-info';
  }
  return 'toast-success';
});
</script>

<template>
  <transition name="toast">
    <div v-if="state.visible" class="global-toast" :class="toastTypeClass">
      <p>{{ state.message }}</p>
    </div>
  </transition>
</template>

<style scoped>
.global-toast {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  padding: 0.9rem 1.4rem;
  border-radius: 12px;
  color: #f7fafc;
  font-weight: 600;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35);
  z-index: 1000;
  min-width: 220px;
  max-width: 320px;
}

.toast-success {
  background: linear-gradient(135deg, #48bb78, #38a169);
}

.toast-error {
  background: linear-gradient(135deg, #f56565, #c53030);
}

.toast-info {
  background: linear-gradient(135deg, #63b3ed, #4299e1);
}

.toast-enter-active,
.toast-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>
