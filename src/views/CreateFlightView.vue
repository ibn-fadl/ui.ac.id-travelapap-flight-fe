<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type {
  AirlineInterface,
  AirplaneInterface,
  FlightClassItemRequestDTO,
  FlightCreateRequestDTO
} from '@/interfaces';
import airlineService from '@/services/airline.service';
import airplaneService from '@/services/airplane.service';
import flightService from '@/services/flight.service';
import { useFlightStore } from '@/stores/flight.store';

// --- State Management ---
const router = useRouter();
const flightStore = useFlightStore();

const form = ref({
  airlineId: '',
  airplaneId: '',
  terminal: '',
  gate: '',
  baggageAllowance: 20,
  facilities: '',
  originAirportCode: '',
  destinationAirportCode: '',
  departureTime: '',
  arrivalTime: '',
  classes: [
    { classType: 'Economy', seatCapacity: 100, price: 500000 },
    { classType: 'Business', seatCapacity: 20, price: 1500000 }
  ] as FlightClassItemRequestDTO[]
});

const airlines = ref<AirlineInterface[]>([]);
const airplanes = ref<AirplaneInterface[]>([]);
const airports = ref<string[]>([]);

const pageLoading = ref(true);
const isSubmitting = ref(false);
const error = ref<string | null>(null);
const validationErrors = ref<Record<string, string>>({});

// --- Data Loading ---
onMounted(async () => {
  pageLoading.value = true;
  try {
    const [airlinesData, airplanesData] = await Promise.all([
      airlineService.getAllAirlines(),
      airplaneService.getAllAirplanes()
    ]);
    airlines.value = airlinesData;
    airplanes.value = airplanesData;

    // Derive airports from existing flights as a fallback
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
    error.value = `Failed to load initial data: ${e.message}`;
  } finally {
    pageLoading.value = false;
  }
});

// --- Computed Properties ---
const filteredAirplanes = computed(() => {
  if (!form.value.airlineId) {
    return [];
  }
  return airplanes.value.filter(plane => plane.airlineId === form.value.airlineId);
});

const selectedAirplaneDetails = computed(() => {
  return airplanes.value.find(plane => plane.id === form.value.airplaneId);
});

const totalClassCapacity = computed(() => {
  return form.value.classes.reduce((total, c) => total + (Number(c.seatCapacity) || 0), 0);
});

const isFormValid = computed(() => {
  const errors: Record<string, string> = {};
  
  // Basic Info
  if (!form.value.airlineId) errors.airlineId = 'Airline is required.';
  if (!form.value.airplaneId) errors.airplaneId = 'Airplane is required.';
  if (!form.value.terminal.trim()) errors.terminal = 'Terminal is required.';
  if (!form.value.gate.trim()) errors.gate = 'Gate is required.';
  if (form.value.baggageAllowance <= 0) errors.baggageAllowance = 'Baggage allowance must be positive.';

  // Route Info
  if (!form.value.originAirportCode) errors.origin = 'Origin is required.';
  if (!form.value.destinationAirportCode) errors.destination = 'Destination is required.';
  if (form.value.originAirportCode && form.value.originAirportCode === form.value.destinationAirportCode) {
    errors.destination = 'Destination cannot be the same as origin.';
  }
  if (!form.value.departureTime) errors.departureTime = 'Departure time is required.';
  if (!form.value.arrivalTime) errors.arrivalTime = 'Arrival time is required.';
  if (form.value.departureTime && form.value.arrivalTime && new Date(form.value.arrivalTime) <= new Date(form.value.departureTime)) {
    errors.arrivalTime = 'Arrival time must be after departure time.';
  }

  // Class Config
  if (form.value.classes.length === 0) {
    errors.classes = 'At least one flight class is required.';
  }
  form.value.classes.forEach((c, index) => {
    if (!c.classType) errors[`classType_${index}`] = 'Type is required.';
    if (!c.seatCapacity || c.seatCapacity <= 0) errors[`seatCapacity_${index}`] = 'Capacity must be > 0.';
    if (!c.price || c.price <= 0) errors[`price_${index}`] = 'Price must be > 0.';
  });
  if (selectedAirplaneDetails.value && totalClassCapacity.value > selectedAirplaneDetails.value.seatCapacity) {
    errors.totalCapacity = `Total class capacity (${totalClassCapacity.value}) cannot exceed airplane capacity (${selectedAirplaneDetails.value.seatCapacity}).`;
  }

  validationErrors.value = errors;
  return Object.keys(errors).length === 0;
});

// --- Methods ---
const addClass = () => {
  form.value.classes.push({ classType: 'Economy', seatCapacity: 0, price: 0 });
};

const removeClass = (index: number) => {
  form.value.classes.splice(index, 1);
};

const handleCancel = () => {
  router.push('/flights');
};

const handleSubmit = async () => {
  if (!isFormValid.value) {
    error.value = "Please fix the errors before submitting.";
    return;
  }
  isSubmitting.value = true;
  error.value = null;

  const payload: FlightCreateRequestDTO = {
    ...form.value,
    departureTime: new Date(form.value.departureTime).toISOString(),
    arrivalTime: new Date(form.value.arrivalTime).toISOString(),
    baggageAllowance: Number(form.value.baggageAllowance),
    classes: form.value.classes.map(c => ({
      ...c,
      seatCapacity: Number(c.seatCapacity),
      price: Number(c.price)
    }))
  };

  try {
    const newFlight = await flightService.createFlight(payload);
    // Invalidate store cache
    flightStore.fetchFlights(); 
    // TODO: Add a success toast notification
    router.push({ name: 'flight-detail', params: { id: newFlight.id } });
  } catch (err: any) {
    error.value = err.response?.data?.message || 'An unknown error occurred during flight creation.';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="create-flight-page">
    <header class="page-header">
      <h1>Create New Flight</h1>
    </header>

    <div v-if="pageLoading" class="loader-container">
      <div class="loader"></div>
      <p>Loading form...</p>
    </div>

    <div v-else>
      <form @submit.prevent="handleSubmit" class="form-container">
        <!-- Basic Information -->
        <div class="form-card">
          <h2>Basic Information</h2>
          <div class="form-grid">
            <div class="form-group">
              <label for="airline">Airline</label>
              <select id="airline" v-model="form.airlineId" class="form-input">
                <option disabled value="">Select an Airline</option>
                <option v-for="airline in airlines" :key="airline.id" :value="airline.id">{{ airline.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label for="airplane">Airplane</label>
              <select id="airplane" v-model="form.airplaneId" class="form-input" :disabled="!form.airlineId">
                <option disabled value="">Select an Airplane</option>
                <option v-for="plane in filteredAirplanes" :key="plane.id" :value="plane.id">{{ plane.model }} ({{ plane.id }})</option>
              </select>
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

        <!-- Route Information -->
        <div class="form-card">
          <h2>Route Information</h2>
          <div class="form-grid">
            <div class="form-group">
              <label for="origin">Origin Airport</label>
              <select id="origin" v-model="form.originAirportCode" class="form-input">
                <option disabled value="">Select Origin</option>
                <option v-for="airport in airports" :key="airport" :value="airport">{{ airport }}</option>
              </select>
            </div>
            <div class="form-group">
              <label for="destination">Destination Airport</label>
              <select id="destination" v-model="form.destinationAirportCode" class="form-input">
                <option disabled value="">Select Destination</option>
                <option v-for="airport in airports" :key="airport" :value="airport">{{ airport }}</option>
              </select>
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
            <button type="button" @click="removeClass(index)" class="btn-remove" :disabled="form.classes.length === 1">Remove</button>
          </div>
          <button type="button" @click="addClass" class="btn-add-class">Add Class</button>
          <div class="capacity-summary">
            <span>Total Class Capacity: <strong>{{ totalClassCapacity }}</strong></span>
            <span v-if="selectedAirplaneDetails">Airplane Capacity Limit: <strong>{{ selectedAirplaneDetails.seatCapacity }}</strong></span>
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
            <span v-if="isSubmitting">Creating...</span>
            <span v-else>Create Flight</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.create-flight-page {
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
