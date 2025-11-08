<script setup lang="ts">
import { reactive, ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import flightService from '@/services/flight.service';
import bookingService from '@/services/booking.service';
import type {
  FlightDetailInterface,
  BookingPassengerSelectionInput,
  BookingCreateRequest,
} from '@/interfaces';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { useConfirmDialog } from '@/composables/useConfirmDialog';

const route = useRoute();
const router = useRouter();
const { show } = useConfirmDialog();

const passengerLimit = 10;

const flightId = computed(() => route.query.departureFlightId as string | undefined);

const flight = ref<FlightDetailInterface | null>(null);
const loadingFlight = ref(false);
const submitting = ref(false);
const loadError = ref<string | null>(null);
const formError = ref<string | null>(null);

const form = reactive({
  classFlightId: null as number | string | null,
  contactEmail: '',
  contactPhone: '',
  passengerCount: 1,
  passengers: [{ passengerId: '', seatCode: '' }] as BookingPassengerSelectionInput[],
});

const availableClasses = computed(() => flight.value?.classes ?? []);

const syncPassengers = (value: number) => {
  let normalized = Number.isFinite(value) ? Math.trunc(value) : 1;
  normalized = Math.min(Math.max(normalized, 1), passengerLimit);

  if (normalized !== form.passengerCount) {
    form.passengerCount = normalized;
    return;
  }

  while (form.passengers.length < normalized) {
    form.passengers.push({ passengerId: '', seatCode: '' });
  }
  while (form.passengers.length > normalized) {
    form.passengers.pop();
  }
};

watch(
  () => form.passengerCount,
  (value) => {
    syncPassengers(value);
  },
  { immediate: true }
);

const loadFlight = async () => {
  const currentFlightId = flightId.value;
  if (!currentFlightId) {
    loadError.value = 'Missing flight identifier. Please choose a flight first.';
    return;
  }

  loadingFlight.value = true;
  loadError.value = null;
  try {
    const fetchedFlight = await flightService.getFlightById(currentFlightId);
    flight.value = fetchedFlight;
    const [firstAvailableClass] = fetchedFlight.classes;
    if (firstAvailableClass) {
      form.classFlightId = firstAvailableClass.id;
    }
  } catch (err: any) {
    loadError.value = err.response?.data?.message || err.message || 'Unable to load flight data.';
  } finally {
    loadingFlight.value = false;
  }
};

onMounted(loadFlight);
watch(
  () => flightId.value,
  () => {
    if (!loadingFlight.value) {
      loadFlight();
    }
  }
);

const selectedClass = computed(() =>
  availableClasses.value.find((cls) => cls.id === Number(form.classFlightId)) || null
);

const validateForm = (): string | null => {
  if (!flight.value) return 'Flight data is not available yet.';
  if (!form.classFlightId || Number.isNaN(Number(form.classFlightId))) {
    return 'Please select a class for this booking.';
  }
  if (!form.contactEmail.trim()) return 'Contact email is required.';
  if (!form.contactPhone.trim()) return 'Contact phone is required.';
  if (form.passengerCount < 1) return 'At least one passenger is required.';

  for (let i = 0; i < form.passengers.length; i += 1) {
    const passenger = form.passengers[i];
    if (!passenger || !passenger.passengerId.trim() || !passenger.seatCode.trim()) {
      return `Passenger ${i + 1} information is incomplete.`;
    }
  }

  return null;
};

const buildPayload = (): BookingCreateRequest => ({
  flightId: flight.value!.id,
  classFlightId: Number(form.classFlightId),
  contactEmail: form.contactEmail.trim(),
  contactPhone: form.contactPhone.trim(),
  passengerCount: form.passengerCount,
  passengers: form.passengers.map((p) => ({
    passengerId: p.passengerId.trim(),
    seatCode: p.seatCode.trim(),
  })),
});

const handleSubmit = async () => {
  const validationMessage = validateForm();
  if (validationMessage) {
    formError.value = validationMessage;
    return;
  }

  if (!flight.value) {
    formError.value = 'Flight information is missing.';
    return;
  }

  submitting.value = true;
  formError.value = null;

  try {
    const bookings = await bookingService.createBooking(buildPayload());
    const firstBookingId = bookings[0]?.id;

    await show({
      title: 'Booking Created',
      message: firstBookingId
        ? `Booking ${firstBookingId} has been created successfully.`
        : 'Booking created successfully.',
      confirmText: firstBookingId ? 'View Booking' : 'Close',
    });

    if (firstBookingId) {
      router.push({ name: 'booking-detail', params: { id: firstBookingId } });
    } else {
      router.push({ name: 'bookings' });
    }
  } catch (err: any) {
    const message = err.response?.data?.message || err.message || 'Failed to create booking.';
    formError.value = message;
    await show({
      title: 'Create Booking Failed',
      message,
      confirmText: 'Close',
      isDestructive: true,
    });
  } finally {
    submitting.value = false;
  }
};

const handleCancel = () => {
  router.back();
};
</script>

<template>
  <div class="create-booking-page">
    <div class="create-booking-container">
      <nav class="breadcrumb">
        <router-link :to="{ name: 'flights' }">Flights</router-link>
        <span>Create Booking</span>
      </nav>

      <section v-if="loadingFlight" class="state-card">
        <div class="loader"></div>
        <p>Loading flight information...</p>
      </section>

      <section v-else-if="loadError" class="state-card error">
        <p>{{ loadError }}</p>
        <button class="btn btn-secondary" @click="handleCancel">Back</button>
      </section>

      <section v-else-if="flight" class="booking-card">
        <header class="card-header">
          <div>
            <p class="section-label">Booking Flight</p>
            <h1>{{ flight.id }}</h1>
          </div>
          <span class="info-pill">{{ flight.originAirportCode }} → {{ flight.destinationAirportCode }}</span>
        </header>

        <div class="flight-summary">
          <div>
            <span class="label">Departure</span>
            <p>{{ formatDateTime(flight.departureTime) }}</p>
          </div>
          <div>
            <span class="label">Arrival</span>
            <p>{{ formatDateTime(flight.arrivalTime) }}</p>
          </div>
          <div>
            <span class="label">Aircraft</span>
            <p>{{ flight.airplaneModel }}</p>
          </div>
        </div>

        <section class="form-section">
          <h2>Booking Details</h2>
          <div class="form-grid two-col">
            <label class="form-field">
              <span>Class</span>
              <select v-model="form.classFlightId">
                <option disabled :value="null">Select class</option>
                <option v-for="cls in availableClasses" :key="cls.id" :value="cls.id">
                  {{ cls.classType }} — {{ formatCurrency(cls.price) }}
                </option>
              </select>
            </label>
            <label class="form-field">
              <span>Passengers (max {{ passengerLimit }})</span>
              <input type="number" min="1" :max="passengerLimit" v-model.number="form.passengerCount" />
            </label>
          </div>
          <div class="form-grid two-col">
            <label class="form-field">
              <span>Contact Email</span>
              <input type="email" v-model="form.contactEmail" placeholder="passenger@example.com" />
            </label>
            <label class="form-field">
              <span>Contact Phone</span>
              <input type="tel" v-model="form.contactPhone" placeholder="+62-812-1234-5678" />
            </label>
          </div>
        </section>

        <section class="form-section">
          <div class="section-heading">
            <h2>Passenger & Seat Allocation</h2>
            <p>Please provide Passenger ID and Seat Code for each traveler.</p>
          </div>
          <div class="passenger-list">
            <article v-for="(passenger, index) in form.passengers" :key="index" class="passenger-card">
              <div class="passenger-header">
                <span class="pill">Passenger {{ index + 1 }}</span>
              </div>
              <div class="form-grid two-col">
                <label class="form-field">
                  <span>Passenger ID (UUID)</span>
                  <input
                    type="text"
                    v-model="passenger.passengerId"
                    placeholder="11111111-2222-3333-4444-555555555555"
                  />
                </label>
                <label class="form-field">
                  <span>Seat Code</span>
                  <input
                    type="text"
                    v-model="passenger.seatCode"
                    placeholder="GA-ABC-001-EC001"
                  />
                </label>
              </div>
            </article>
          </div>
        </section>

        <p v-if="selectedClass" class="total-hint">
          Estimated total: {{ formatCurrency(selectedClass.price * form.passengerCount) }}
        </p>

        <p v-if="formError" class="form-error">{{ formError }}</p>

        <footer class="actions">
          <button class="btn btn-secondary" @click="handleCancel" :disabled="submitting">Cancel</button>
          <button class="btn btn-primary" @click="handleSubmit" :disabled="submitting">
            <span v-if="submitting" class="inline-loader"></span>
            Create Booking
          </button>
        </footer>
      </section>
    </div>
  </div>
</template>

<style scoped>
.create-booking-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a202c, #2d3748);
  padding: 2rem;
  color: #e2e8f0;
}

.create-booking-container {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.breadcrumb {
  display: flex;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #a0aec0;
}

.breadcrumb a {
  color: #cbd5e0;
  text-decoration: none;
}

.breadcrumb span::before {
  content: '>';
  margin: 0 0.5rem;
  color: #718096;
}

.booking-card,
.state-card {
  background: #2d3748;
  border-radius: 16px;
  border: 1px solid #4a5568;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
}

.state-card {
  text-align: center;
}

.state-card.error {
  border-color: #c53030;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  color: #a0aec0;
}

.info-pill {
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  background: #4c51bf;
  color: #e9d8fd;
  font-weight: 600;
}

.flight-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  background: #1f2738;
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
}

.label {
  font-size: 0.8rem;
  color: #a0aec0;
}

.form-section {
  margin-bottom: 1.5rem;
  background: #1f2738;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #3b4152;
}

.form-section h2 {
  margin: 0 0 1rem;
  font-size: 1.25rem;
  color: #f7fafc;
}

.section-heading {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1rem;
}

.section-heading p {
  margin: 0;
  color: #a0aec0;
}

.form-grid {
  display: grid;
  gap: 1rem;
}

.form-grid.two-col {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
}

.form-field span {
  color: #cbd5e0;
}

.form-field input,
.form-field select {
  background: #121826;
  border: 1px solid #4a5568;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: #f7fafc;
  font-size: 1rem;
}

.form-field input:focus,
.form-field select:focus {
  outline: none;
  border-color: #805ad5;
  box-shadow: 0 0 0 1px #805ad5; 
}

.passenger-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.passenger-card {
  border: 1px solid #3b4152;
  border-radius: 10px;
  padding: 1rem;
  background: #232b3b;
}

.passenger-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.pill {
  padding: 0.2rem 0.75rem;
  border-radius: 999px;
  background: #4c51bf;
  color: #e9d8fd;
  font-size: 0.85rem;
  font-weight: 600;
}

.total-hint {
  margin: 0 0 1rem;
  font-size: 1rem;
  color: #f7fafc;
  font-weight: 600;
}

.form-error {
  color: #fed7d7;
  background: rgba(197, 48, 48, 0.2);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(229, 62, 62, 0.5);
  margin-bottom: 1rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  border-top: 1px solid #4a5568;
  padding-top: 1.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #6b46c1, #805ad5);
  color: white;
}

.btn-secondary {
  background-color: #4a5568;
  color: #e2e8f0;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loader {
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-top: 4px solid #805ad5;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  margin: 0 auto 1rem;
  animation: spin 1s linear infinite;
}

.inline-loader {
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid #fff;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: inline-block;
  margin-right: 0.5rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
