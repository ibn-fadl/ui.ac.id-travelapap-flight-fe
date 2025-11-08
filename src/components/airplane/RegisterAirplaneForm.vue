<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAirlineStore } from '@/stores/airline.store';

const airlineStore = useAirlineStore();

// Form state
const airlineId = ref('');
const model = ref('');
const seatCapacity = ref<number | null>(null);
const manufactureYear = ref<number | null>(null);

// Validation state
const errors = ref<{ [key: string]: string }>({});

onMounted(() => {
  if (airlineStore.airlines.length === 0) {
    airlineStore.fetchAirlines();
  }
});

const validateForm = (): boolean => {
  errors.value = {};
  if (!airlineId.value) errors.value.airlineId = 'Airline is required.';
  if (!model.value) errors.value.model = 'Aircraft model is required.';
  if (!seatCapacity.value || seatCapacity.value <= 0) {
    errors.value.seatCapacity = 'Seat capacity must be greater than 0.';
  }
  if (!manufactureYear.value) {
    errors.value.manufactureYear = 'Manufacture year is required.';
  } else if (manufactureYear.value < 1900 || manufactureYear.value > new Date().getFullYear()) {
    errors.value.manufactureYear = `Year must be between 1900 and ${new Date().getFullYear()}.`;
  }
  return Object.keys(errors.value).length === 0;
};

const emit = defineEmits(['submit', 'cancel']);

const handleSubmit = () => {
  if (validateForm()) {
    emit('submit', {
      airlineId: airlineId.value,
      model: model.value,
      seatCapacity: seatCapacity.value!,
      manufactureYear: manufactureYear.value!,
    });
  }
};

const resetForm = () => {
  airlineId.value = '';
  model.value = '';
  seatCapacity.value = null;
  manufactureYear.value = null;
  errors.value = {};
};

// Expose the resetForm method to the parent
defineExpose({
  resetForm,
  handleSubmit,
});
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div class="form-grid">
      <!-- Airline -->
      <div class="form-group">
        <label for="airlineId">Airline</label>
        <select id="airlineId" v-model="airlineId" :class="{ 'is-invalid': errors.airlineId }" :disabled="airlineStore.loading">
          <option v-if="airlineStore.loading" disabled value="">Loading airlines...</option>
          <option v-else disabled value="">Select an airline</option>
          <option v-for="airline in airlineStore.airlines" :key="airline.id" :value="airline.id">
            {{ airline.name }} ({{ airline.id }})
          </option>
        </select>
        <small v-if="errors.airlineId" class="error-text">{{ errors.airlineId }}</small>
        <small v-if="airlineStore.error" class="error-text">{{ airlineStore.error }}</small>
      </div>

      <!-- Model -->
      <div class="form-group">
        <label for="model">Aircraft Model</label>
        <input type="text" id="model" v-model="model" placeholder="e.g., Boeing 737-800" :class="{ 'is-invalid': errors.model }" />
        <small v-if="errors.model" class="error-text">{{ errors.model }}</small>
      </div>

      <!-- Seat Capacity -->
      <div class="form-group">
        <label for="seatCapacity">Seat Capacity</label>
        <input type="number" id="seatCapacity" v-model.number="seatCapacity" placeholder="e.g., 189" :class="{ 'is-invalid': errors.seatCapacity }" />
        <small v-if="errors.seatCapacity" class="error-text">{{ errors.seatCapacity }}</small>
      </div>

      <!-- Manufacture Year -->
      <div class="form-group">
        <label for="manufactureYear">Manufacture Year</label>
        <input type="number" id="manufactureYear" v-model.number="manufactureYear" placeholder="e.g., 2021" :class="{ 'is-invalid': errors.manufactureYear }" />
        <small v-if="errors.manufactureYear" class="error-text">{{ errors.manufactureYear }}</small>
      </div>
    </div>
  </form>
</template>

<style scoped>
/* Styles copied from RegisterAirplaneView, can be adjusted if needed */
.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #cbd5e0;
}

.form-group input,
.form-group select {
  background-color: #1a202c;
  color: #e2e8f0;
  border: 1px solid #4a5568;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #805ad5;
  box-shadow: 0 0 0 3px rgba(128, 90, 213, 0.3);
}

.form-group input.is-invalid,
.form-group select.is-invalid {
  border-color: #c53030;
}

.error-text {
  color: #f56565;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}
</style>
