<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type {
  AirlineInterface,
  AirplaneInterface,
  FlightClassItemRequestDTO,
  FlightUpdateRequestDTO,
  FlightDetailInterface
} from '@/interfaces';
import airlineService from '@/services/airline.service';
import airplaneService from '@/services/airplane.service';
import flightService from '@/services/flight.service';
import { useFlightStore } from '@/stores/flight.store';

// --- State Management ---
const route = useRoute();
const router = useRouter();
const flightStore = useFlightStore();
const flightId = route.params.id as string;

const form = ref<Partial<FlightUpdateRequestDTO>>({
  terminal: '',
  gate: '',
  baggageAllowance: 20,
  facilities: '',
  departureTime: '',
  arrivalTime: '',
  classes: [] as FlightClassItemRequestDTO[]
});

const originalFlight = ref<FlightDetailInterface | null>(null);
const airlines = ref<AirlineInterface[]>([]);
const airplanes = ref<AirplaneInterface[]>([]);
const airports = ref<string[]>([]);

const pageLoading = ref(true);
const isSubmitting = ref(false);
const error = ref<string | null>(null);
const validationErrors = ref<Record<string, string>>({});

const toLocalISOString = (dateString: string) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date string provided');
    }
    // getTimezoneOffset returns the difference in minutes between UTC and local time.
    // We need to subtract this offset to get the correct local time.
    const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
    const localTime = new Date(date.getTime() - tzOffset);
    // .toISOString() returns a string in Z-format (UTC), so we slice it.
    return localTime.toISOString().slice(0, 16);
  } catch (error) {
    console.error('Error converting date to local ISO string:', error);
    return ''; // Return a fallback value
  }
};

// --- Data Loading ---
onMounted(async () => {
  pageLoading.value = true;
  try {
    const flightData = await flightService.getFlightById(flightId);
    originalFlight.value = flightData;

    // Pre-populate the form with existing data
    form.value = {
      departureTime: toLocalISOString(flightData.departureTime), // Format for datetime-local
      arrivalTime: toLocalISOString(flightData.arrivalTime),
      terminal: flightData.terminal,
      gate: flightData.gate,
      baggageAllowance: flightData.baggageAllowance,
      facilities: flightData.facilities,
      classes: flightData.classes.map(c => ({
        classType: c.classType,
        seatCapacity: c.seatCapacity,
        price: c.price
      }))
    };

    // Load related data for context (even if disabled)
    const [airlinesData, airplanesData] = await Promise.all([
      airlineService.getAllAirlines(),
      airplaneService.getAllAirplanes()
    ]);
    airlines.value = airlinesData;
    airplanes.value = airplanesData;

    if (flightStore.flights.length === 0) {
      await flightStore.fetchFlights();
    }
    const airportSet = new Set<string>();
    flightStore.flights.forEach(flight => {
      airportSet.add(flight.originAirportCode);
      airportSet.add(flight.destinationAirportCode);
    });
    airports.value = Array.from(airportSet).sort();

  } catch (e: any) {
    error.value = `Failed to load flight data: ${e.message}`;
  } finally {
    pageLoading.value = false;
  }
});

// --- Computed Properties ---
const totalClassCapacity = computed(() => {
  return form.value.classes?.reduce((total, c) => total + (Number(c.seatCapacity) || 0), 0) || 0;
});

const isFormValid = computed(() => {
  const errors: Record<string, string> = {};
  
  if (!form.value.terminal?.trim()) errors.terminal = 'Terminal is required.';
  if (!form.value.gate?.trim()) errors.gate = 'Gate is required.';
  if (form.value.baggageAllowance && form.value.baggageAllowance <= 0) errors.baggageAllowance = 'Baggage allowance must be positive.';

  if (!form.value.departureTime) errors.departureTime = 'Departure time is required.';
  if (!form.value.arrivalTime) errors.arrivalTime = 'Arrival time is required.';
  if (form.value.departureTime && form.value.arrivalTime && new Date(form.value.arrivalTime) <= new Date(form.value.departureTime)) {
    errors.arrivalTime = 'Arrival time must be after departure time.';
  }

  if (!form.value.classes || form.value.classes.length === 0) {
    errors.classes = 'At least one flight class is required.';
  }
  form.value.classes?.forEach((c, index) => {
    if (!c.classType) errors[`classType_${index}`] = 'Type is required.';
    if (!c.seatCapacity || c.seatCapacity <= 0) errors[`seatCapacity_${index}`] = 'Capacity must be > 0.';
    if (!c.price || c.price <= 0) errors[`price_${index}`] = 'Price must be > 0.';
  });
  if (originalFlight.value && totalClassCapacity.value > originalFlight.value.airplane.seatCapacity) {
    errors.totalCapacity = `Total class capacity (${totalClassCapacity.value}) cannot exceed airplane capacity (${originalFlight.value.airplane.seatCapacity}).`;
  }

  validationErrors.value = errors;
  return Object.keys(errors).length === 0;
});

// --- Methods ---
const addClass = () => {
  form.value.classes?.push({ classType: 'Economy', seatCapacity: 0, price: 0 });
};

const removeClass = (index: number) => {
  form.value.classes?.splice(index, 1);
};

const handleCancel = () => {
  router.go(-1);
};

const handleSubmit = async () => {
  if (!isFormValid.value) {
    error.value = "Please fix the errors before submitting.";
    return;
  }
  isSubmitting.value = true;
  error.value = null;

  const payload: FlightUpdateRequestDTO = {
    ...form.value,
    departureTime: new Date(form.value.departureTime!).toISOString(),
    arrivalTime: new Date(form.value.arrivalTime!).toISOString(),
    baggageAllowance: Number(form.value.baggageAllowance),
    classes: form.value.classes?.map(c => ({
      ...c,
      seatCapacity: Number(c.seatCapacity),
      price: Number(c.price)
    }))
  };

  try {
    const updatedFlight = await flightService.updateFlight(flightId, payload);
    flightStore.fetchFlights(); // Invalidate cache
    router.push({ name: 'flight-detail', params: { id: updatedFlight.id } });
  } catch (err: any) {
    error.value = err.response?.data?.message || 'An unknown error occurred during flight update.';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="update-flight-page">
    <header class="page-header">
      <h1>Update Flight {{ flightId }}</h1>
    </header>

    <div v-if="pageLoading" class="loader-container">
      <div class="loader"></div>
      <p>Loading form...</p>
    </div>
    
    <div v-else-if="!originalFlight" class="alert alert-danger">
        Could not load flight data. {{ error }}
    </div>

    <div v-else>
      <form @submit.prevent="handleSubmit" class="form-container">
        <!-- Basic Information (Read-only) -->
        <div class="form-card">
          <h2>Basic Information</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Airline</label>
              <input type="text" class="form-input" :value="originalFlight.airline.name" disabled />
            </div>
            <div class="form-group">
              <label>Airplane</label>
              <input type="text" class="form-input" :value="`${originalFlight.airplane.model} (${originalFlight.airplane.id})`" disabled />
            </div>
            <div class="form-group">
              <label for="terminal">Terminal</label>
              <input type="text" id="terminal" v-model="form.terminal" class="form-input" />
            </div>
            <div class="form-group">
              <label for="gate">Gate</label>
              <input type="text" id="gate" v-model="form.gate" class="form-input" />
            </div>
            <div class="form-group">
              <label for="baggage">Baggage Allowance (kg)</label>
              <input type="number" id="baggage" v-model.number="form.baggageAllowance" class="form-input" />
            </div>
            <div class="form-group">
              <label for="facilities">Facilities</label>
              <input type="text" id="facilities" v-model="form.facilities" class="form-input" placeholder="e.g., WiFi, Meals" />
            </div>
          </div>
        </div>

        <!-- Route Information (Read-only Origin/Destination) -->
        <div class="form-card">
          <h2>Route & Schedule</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Origin Airport</label>
              <input type="text" class="form-input" :value="originalFlight.originAirportCode" disabled />
            </div>
            <div class="form-group">
              <label>Destination Airport</label>
              <input type="text" class="form-input" :value="originalFlight.destinationAirportCode" disabled />
            </div>
            <div class="form-group">
              <label for="departure">Departure Time</label>
              <input type="datetime-local" id="departure" v-model="form.departureTime" class="form-input" />
            </div>
            <div class="form-group">
              <label for="arrival">Arrival Time</label>
              <input type="datetime-local" id="arrival" v-model="form.arrivalTime" class="form-input" />
            </div>
          </div>
        </div>

        <!-- Class Configuration -->
        <div class="form-card">
          <h2>Class Configuration</h2>
          <div v-for="(c, index) in form.classes" :key="index" class="class-row">
            <select v-model="c.classType" class="form-input">
              <option>Economy</option>
              <option>Business</option>
              <option>First</option>
            </select>
            <input type="number" v-model.number="c.seatCapacity" placeholder="Capacity" class="form-input" />
            <input type="number" v-model.number="c.price" placeholder="Price (IDR)" class="form-input" />
            <button type="button" @click="removeClass(index)" class="btn-remove" :disabled="form.classes && form.classes.length === 1">Remove</button>
          </div>
          <button type="button" @click="addClass" class="btn-add-class">Add Class</button>
          <div class="capacity-summary">
            <span>Total Class Capacity: <strong>{{ totalClassCapacity }}</strong></span>
            <span>Airplane Capacity Limit: <strong>{{ originalFlight.airplane.seatCapacity }}</strong></span>
          </div>
        </div>
        
        <div v-if="Object.keys(validationErrors).length > 0" class="validation-summary">
          <h3>Please correct the following errors:</h3>
          <ul>
            <li v-for="(msg, key) in validationErrors" :key="key">{{ msg }}</li>
          </ul>
        </div>

        <div v-if="error" class="alert alert-danger">
          {{ error }}
        </div>

        <div class="form-footer">
          <button type="button" class="btn btn-secondary" @click="handleCancel">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="!isFormValid || isSubmitting">
            <span v-if="isSubmitting">Updating...</span>
            <span v-else>Update Flight</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.update-flight-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a202c, #2d3748);
  padding: 2rem;
  color: #e2e8f0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #ffffff;
}

.loader-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  background: #2d3748;
  border-radius: 12px;
  border: 1px solid #4a5568;
  color: #a0aec0;
  flex-grow: 1;
}

.loader {
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border-top: 4px solid #805ad5;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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
.btn-secondary:hover:not(:disabled) { background-color: #718096; }

.form-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-card {
  background: #2d3748;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #4a5568;
}

.form-card h2 {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #cbd5e0;
  border-bottom: 1px solid #4a5568;
  padding-bottom: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #a0aec0;
}

.form-input {
  background-color: #1a202c;
  color: #e2e8f0;
  border: 1px solid #4a5568;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
}
.form-input:focus {
  outline: none;
  border-color: #805ad5;
  box-shadow: 0 0 0 2px rgba(128, 90, 213, 0.5);
}
.form-input:disabled {
    background-color: #2d3748;
    cursor: not-allowed;
    opacity: 0.7;
}

.class-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}

.btn-remove {
  background-color: #c53030;
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
}
.btn-remove:hover:not(:disabled) { background-color: #9b2c2c; }

.btn-add-class {
  background-color: #38a169;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 1rem;
}
.btn-add-class:hover { background-color: #2f855a; }

.capacity-summary {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #4a5568;
  display: flex;
  justify-content: space-between;
  font-size: 1.1rem;
  color: #cbd5e0;
}

.validation-summary {
  background-color: rgba(224, 49, 49, 0.2);
  border: 1px solid #c53030;
  padding: 1.5rem;
  border-radius: 8px;
  color: #fed7d7;
}
.validation-summary h3 {
  margin-top: 0;
  margin-bottom: 1rem;
}
.validation-summary ul {
  margin: 0;
  padding-left: 1.5rem;
}

.alert-danger {
  background-color: #c53030;
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.form-footer {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #4a5568;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
</style>
