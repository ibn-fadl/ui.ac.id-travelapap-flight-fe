<script setup lang="ts">
import type { FlightInterface } from '@/interfaces';

defineProps<{
  departureFlight: FlightInterface | null;
  returnFlight: FlightInterface | null;
  isProceedDisabled: boolean;
}>();

const emit = defineEmits(['proceed', 'clear']);
</script>

<template>
  <div class="selection-banner">
    <div class="selection-details">
      <div class="flight-leg">
        <span class="leg-title">Departure</span>
        <span class="leg-value">{{ departureFlight?.id || 'Not Selected' }}</span>
      </div>
      <div class="separator">→</div>
      <div class="flight-leg">
        <span class="leg-title">Return</span>
        <span class="leg-value">{{ returnFlight?.id || 'Not Selected' }}</span>
      </div>
    </div>
    <div class="selection-actions">
      <button class="btn btn-secondary" @click="emit('clear')">Clear</button>
      <button class="btn btn-primary" @click="emit('proceed')" :disabled="isProceedDisabled">
        Proceed to Booking
      </button>
    </div>
  </div>
</template>

<style scoped>
.selection-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #2d3748;
  border: 1px solid #805ad5;
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 5px 15px rgba(128, 90, 213, 0.2);
}

.selection-details {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.flight-leg {
  display: flex;
  flex-direction: column;
}

.leg-title {
  font-size: 0.9rem;
  color: #a0aec0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.leg-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: #ffffff;
}

.separator {
  font-size: 1.5rem;
  color: #718096;
}

.selection-actions {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: 1px solid transparent;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #6b46c1, #805ad5);
  color: white;
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }

.btn-secondary {
  background-color: #4a5568;
  color: #e2e8f0;
}
.btn-secondary:hover { background-color: #718096; }
</style>
