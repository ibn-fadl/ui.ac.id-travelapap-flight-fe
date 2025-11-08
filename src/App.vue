<script setup lang="ts">
import { RouterView } from 'vue-router'
import VNavbar from './components/layout/VNavbar.vue'
import Modal from './components/common/CommonModal.vue';
import GlobalToast from './components/common/GlobalToast.vue';
import { useConfirmDialog } from './composables/useConfirmDialog';

const { isVisible, options, onConfirm, onCancel } = useConfirmDialog();
</script>

<template>
  <div class="app-wrapper">
    <VNavbar />
    <main class="main-content">
      <RouterView />
    </main>

    <Modal :show="isVisible" @close="onCancel">
      <template #header>
        <h2>{{ options.title }}</h2>
      </template>
      <template #body>
        <p>{{ options.message }}</p>
      </template>
      <template #footer>
        <button v-if="options.cancelText" class="btn btn-secondary" @click="onCancel">{{ options.cancelText }}</button>
        <button class="btn" :class="[options.isDestructive ? 'btn-danger' : 'btn-primary']" @click="onConfirm">{{ options.confirmText }}</button>
      </template>
    </Modal>

    <GlobalToast />
  </div>
</template>

<style scoped>
.app-wrapper {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a202c, #2d3748);
  color: #e2e8f0;
}

.main-content {
  padding: 104px 2rem 2rem; /* 80px navbar height + 24px gap */
  max-width: 1400px;
  margin: 0 auto;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: 1px solid transparent;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #6b46c1, #805ad5);
  color: white;
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }

.btn-danger {
  background-color: #dd6b20;
  color: white;
}
.btn-danger:hover:not(:disabled) { background-color: #c05621; }

.btn-secondary {
  background-color: #4a5568;
  color: #e2e8f0;
}
.btn-secondary:hover:not(:disabled) { background-color: #718096; }
</style>
