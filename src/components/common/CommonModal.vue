<script setup lang="ts">
defineProps({
  show: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(['close']);

const close = () => {
  emit('close');
};
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay" @click.self="close">
      <div class="modal-container">
        <header class="modal-header">
          <slot name="header">Default Header</slot>
          <button class="close-button" @click="close">&times;</button>
        </header>
        <main class="modal-body">
          <slot name="body">Default Body</slot>
        </main>
        <footer class="modal-footer">
          <slot name="footer">
            <!-- Default footer can be empty or have a default button -->
          </slot>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.modal-container {
  background: #2d3748;
  color: #e2e8f0;
  border-radius: 12px;
  border: 1px solid #4a5568;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #4a5568;
}

.modal-header :slotted(h2) {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  line-height: 1;
  color: #a0aec0;
  cursor: pointer;
  transition: color 0.2s;
}

.close-button:hover {
  color: #fff;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #4a5568;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

/* Transition styles */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-container,
.modal-fade-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-fade-enter-from .modal-container,
.modal-fade-leave-to .modal-container {
  transform: scale(0.95);
}
</style>
