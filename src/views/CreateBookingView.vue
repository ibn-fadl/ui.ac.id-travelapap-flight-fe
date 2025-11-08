<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import flightService from '@/services/flight.service';
import bookingService from '@/services/booking.service';
import { useBookingStore } from '@/stores/booking.store';
import { useToast } from '@/composables/useToast';
import type {
  FlightDetailInterface,
  BookingPassengerSelectionInput,
  BookingCreateRequest,
  SeatInterface,
  PassengerInterface,
} from '@/interfaces';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import passengerService from '@/services/passenger.service';

const route = useRoute();
const router = useRouter();
const bookingStore = useBookingStore();
const { showToast } = useToast();

const steps = [
  {
    id: 'contact',
    label: 'Contact & Passengers',
    description: 'Share the contact info and headcount for this booking.',
  },
  {
    id: 'select-passengers',
    label: 'Select Passengers',
    description: 'Pick each traveler from the passenger directory or paste a UUID.',
  },
  {
    id: 'select-class',
    label: 'Select Flight Class',
    description: 'Choose the class that can accommodate everyone.',
  },
  {
    id: 'select-seats',
    label: 'Select Seats',
    description: 'Reserve available seats for every passenger.',
  },
  {
    id: 'review',
    label: 'Review & Confirm',
    description: 'Verify everything before creating the booking.',
  },
] as const;

const passengerDatalistId = 'booking-passenger-directory';
const passengerLimit = 10;

const passengers = ref<PassengerInterface[]>([]);
const passengersLoading = ref(false);
const passengersError = ref<string | null>(null);
const passengerDirectory = computed(() =>
  passengers.value.map(passenger => ({
    passengerId: passenger.id,
    name: passenger.fullName,
  }))
);

const routeFlightId = computed(() => route.query.departureFlightId as string | undefined);
const flight = ref<FlightDetailInterface | null>(null);
const loadingFlight = ref(false);
const loadError = ref<string | null>(null);

const contactForm = reactive({
  contactEmail: '',
  contactPhone: '',
  passengerCount: 1,
});

const passengerSlots = ref<BookingPassengerSelectionInput[]>([]);

const normalizePassengerCount = (value: number) => {
  const sanitized = Number.isFinite(value) ? Math.floor(value) : 1;
  return Math.max(1, Math.min(passengerLimit, sanitized));
};

watch(
  () => contactForm.passengerCount,
  (value) => {
    const normalized = normalizePassengerCount(value);
    if (normalized !== value) {
      contactForm.passengerCount = normalized;
      return;
    }

    while (passengerSlots.value.length < normalized) {
      passengerSlots.value.push({ passengerId: '', seatCode: '' });
    }
    while (passengerSlots.value.length > normalized) {
      passengerSlots.value.pop();
    }
  },
  { immediate: true }
);

const selectedClassId = ref<number | null>(null);
const seatList = ref<SeatInterface[]>([]);
const seatsLoading = ref(false);
const seatsError = ref<string | null>(null);

watch(
  () => selectedClassId.value,
  async (value) => {
    seatList.value = [];
    seatsError.value = null;
    passengerSlots.value.forEach((slot) => {
      slot.seatCode = '';
    });

    if (!value) {
      return;
    }

    seatsLoading.value = true;
    try {
      const seats = await flightService.getSeatsByClassId(value);
      seatList.value = seats;
    } catch (err: any) {
      seatsError.value = err.response?.data?.message || 'Unable to load seat availability.';
    } finally {
      seatsLoading.value = false;
    }
  }
);

const currentStep = ref(0);
const stepError = ref<string | null>(null);
const submitting = ref(false);

const selectedClass = computed(() =>
  flight.value?.classes.find((cls) => cls.id === selectedClassId.value) ?? null
);

const availableSeats = computed(() =>
  seatList.value.filter((seat) => !seat.isBooked)
);

const flightIssue = computed(() => {
  if (!flight.value) {
    return null;
  }
  if (flight.value.isDeleted) {
    return 'This flight is inactive and cannot be booked.';
  }
  if (flight.value.status !== 1) {
    return 'Only scheduled flights can be booked.';
  }
  if (flight.value.originAirportCode === flight.value.destinationAirportCode) {
    return 'Origin and destination airports must differ.';
  }
  return null;
});

const totalPrice = computed(() => {
  if (!selectedClass.value) {
    return 0;
  }
  return selectedClass.value.price * contactForm.passengerCount;
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9]{7,15}$/;

const getPassengerName = (id: string) =>
  passengers.value.find((entry) => entry.id === id)?.fullName;

const isSeatTakenByOther = (seatCode: string, index: number) =>
  passengerSlots.value.some(
    (slot, slotIndex) => slotIndex !== index && slot.seatCode === seatCode
  );

const validateContactStep = () => {
  if (!flight.value) {
    return 'Flight information is still loading.';
  }
  if (flightIssue.value) {
    return flightIssue.value;
  }
  if (!contactForm.contactEmail.trim()) {
    return 'Contact email is required.';
  }
  if (!emailPattern.test(contactForm.contactEmail.trim())) {
    return 'Enter a valid email address.';
  }
  if (!contactForm.contactPhone.trim()) {
    return 'Contact phone is required.';
  }
  if (!phonePattern.test(contactForm.contactPhone.trim())) {
    return 'Phone number should contain only digits and an optional leading +.';
  }
  if (
    contactForm.passengerCount < 1 ||
    contactForm.passengerCount > passengerLimit
  ) {
    return 'Passenger count must be between 1 and 10.';
  }
  return null;
};

const validatePassengerStep = () => {
  const ids = passengerSlots.value.map((slot) => slot.passengerId.trim());
  if (ids.some((id) => !id)) {
    return 'Provide a UUID for every passenger.';
  }
  const duplicates = ids.filter(
    (id, index) => ids.indexOf(id) !== index
  );
  if (duplicates.length) {
    return 'Each passenger must have a unique ID.';
  }
  return null;
};

const validateClassStep = () => {
  if (!selectedClass.value) {
    return 'Select a flight class first.';
  }
  if (selectedClass.value.availableSeats < contactForm.passengerCount) {
    return 'Selected class does not have enough seats.';
  }
  return null;
};

const validateSeatStep = () => {
  if (!selectedClass.value) {
    return 'Select a class before picking seats.';
  }
  if (seatsLoading.value) {
    return 'Waiting for seat availability.';
  }
  const seatCodes = passengerSlots.value.map((slot) => slot.seatCode.trim());
  if (seatCodes.some((code) => !code)) {
    return 'Assign a seat for every passenger.';
  }
  const duplicates = seatCodes.filter(
    (code, index, arr) => arr.indexOf(code) !== index
  );
  if (duplicates.length) {
    return 'Each passenger must have a distinct seat.';
  }
  const availableSeatCodes = new Set(availableSeats.value.map((seat) => seat.seatCode));
  const invalidSeat = seatCodes.find((code) => !availableSeatCodes.has(code));
  if (invalidSeat) {
    return `Seat ${invalidSeat} is no longer available.`;
  }
  return null;
};

const validateStep = (stepIndex: number) => {
  if (stepIndex === 0) return validateContactStep();
  if (stepIndex === 1) return validatePassengerStep();
  if (stepIndex === 2) return validateClassStep();
  if (stepIndex === 3) return validateSeatStep();
  return null;
};

const handleNext = () => {
  const error = validateStep(currentStep.value);
  if (error) {
    stepError.value = error;
    return;
  }
  stepError.value = null;
  if (currentStep.value < steps.length - 1) {
    currentStep.value += 1;
  }
};

const handleBack = () => {
  if (currentStep.value > 0) {
    currentStep.value -= 1;
    stepError.value = null;
  } else {
    handleCancel();
  }
};

const buildPayload = (): BookingCreateRequest => ({
  flightId: flight.value!.id,
  classFlightId: selectedClass.value!.id,
  contactEmail: contactForm.contactEmail.trim(),
  contactPhone: contactForm.contactPhone.trim(),
  passengerCount: contactForm.passengerCount,
  passengers: passengerSlots.value.map((slot) => ({
    passengerId: slot.passengerId.trim(),
    seatCode: slot.seatCode.trim(),
  })),
});

const handleSubmit = async () => {
  const error = validateStep(currentStep.value);
  if (error) {
    stepError.value = error;
    return;
  }
  if (!flight.value || !selectedClass.value) {
    stepError.value = 'Flight or class information is missing.';
    return;
  }

  submitting.value = true;
  stepError.value = null;

  try {
    const createdBookings = await bookingService.createBooking(buildPayload());
    const bookingId = createdBookings[0]?.id;
    showToast('Booking created successfully.', 'success');
    bookingStore.fetchBookings();
    if (bookingId) {
      router.push({ name: 'booking-detail', params: { id: bookingId } });
    } else {
      router.push({ name: 'bookings' });
    }
  } catch (err: any) {
    const message =
      err.response?.data?.message || err.message || 'Failed to create booking.';
    stepError.value = message;
    showToast(message, 'error');
  } finally {
    submitting.value = false;
  }
};

const handleCancel = () => {
  router.back();
};

const loadFlight = async () => {
  const id = routeFlightId.value;
  if (!id) {
    loadError.value = 'Missing flight identifier. Please select a flight first.';
    return;
  }

  loadingFlight.value = true;
  loadError.value = null;
  try {
    const fetchedFlight = await flightService.getFlightById(id);
    flight.value = fetchedFlight;
    const firstClass = fetchedFlight.classes[0];
    selectedClassId.value = firstClass ? firstClass.id : null;
  } catch (err: any) {
    loadError.value =
      err.response?.data?.message || err.message || 'Unable to load flight data.';
  } finally {
    loadingFlight.value = false;
  }
};

const loadPassengers = async () => {
  passengersLoading.value = true;
  passengersError.value = null;
  try {
    passengers.value = await passengerService.getAllPassengers();
  } catch (err: any) {
    passengersError.value = err.response?.data?.message || err.message || 'Unable to load passengers.';
  } finally {
    passengersLoading.value = false;
  }
};

onMounted(() => {
  loadFlight();
  loadPassengers();
});
watch(
  () => routeFlightId.value,
  () => {
    if (!loadingFlight.value) {
      loadFlight();
    }
  }
);
</script>

<template>
  <div class="create-booking-page">
    <div class="create-booking-container">
      <header class="wizard-header">
        <div>
          <p class="section-label">One-Way Booking Wizard</p>
          <h1>Confirm your trip</h1>
          <p v-if="flight" class="flight-route">
            {{ flight.airlineName }} · {{ flight.originAirportCode }} → {{ flight.destinationAirportCode }}
          </p>
        </div>
        <div class="stepper">
          <div
            v-for="(step, index) in steps"
            :key="step.id"
            class="step-pill"
            :class="{ active: currentStep === index, done: index < currentStep }"
          >
            <span class="step-index">{{ index + 1 }}</span>
            <div class="step-text">
              <strong>{{ step.label }}</strong>
              <span>{{ step.description }}</span>
            </div>
          </div>
        </div>
      </header>

      <section v-if="loadingFlight" class="state-card">
        <div class="loader"></div>
        <p>Loading flight information...</p>
      </section>

      <section v-else-if="loadError" class="state-card error">
        <p>{{ loadError }}</p>
        <button class="btn btn-secondary" @click="handleCancel">Back to flights</button>
      </section>

      <section v-else-if="flight && flightIssue" class="state-card error">
        <p>{{ flightIssue }}</p>
        <button class="btn btn-secondary" @click="handleCancel">Back</button>
      </section>

      <section v-else-if="flight" class="wizard-card">
        <div class="flight-summary">
          <div>
            <span class="label">Flight</span>
            <p>{{ flight.id }} · {{ flight.airlineName }}</p>
          </div>
          <div>
            <span class="label">Route</span>
            <p>{{ flight.originAirportCode }} → {{ flight.destinationAirportCode }}</p>
          </div>
          <div>
            <span class="label">Departure</span>
            <p>{{ formatDateTime(flight.departureTime) }}</p>
          </div>
          <div>
            <span class="label">Arrival</span>
            <p>{{ formatDateTime(flight.arrivalTime) }}</p>
          </div>
        </div>

        <div class="step-wrapper">
          <div v-if="currentStep === 0" class="step-section">
            <div class="form-grid two-col">
              <label class="form-field">
                <span>Contact Email</span>
                <input
                  type="email"
                  v-model.trim="contactForm.contactEmail"
                  placeholder="passenger@example.com"
                />
              </label>
              <label class="form-field">
                <span>Contact Phone</span>
                <input
                  type="tel"
                  v-model.trim="contactForm.contactPhone"
                  placeholder="+62-812-1234-5678"
                />
              </label>
            </div>
            <label class="form-field">
              <span>Number of passengers (1-{{ passengerLimit }})</span>
              <input
                type="number"
                min="1"
                :max="passengerLimit"
                v-model.number="contactForm.passengerCount"
              />
            </label>
            <p class="muted-hint">
              {{ contactForm.passengerCount }} traveler{{ contactForm.passengerCount === 1 ? '' : 's' }} will
              be included in this booking.
            </p>
          </div>

          <div v-else-if="currentStep === 1" class="step-section">
            <div class="passenger-slots">
              <p v-if="passengersLoading" class="muted-hint">Loading passengers…</p>
              <p v-else-if="passengersError" class="form-error">{{ passengersError }}</p>
              <article
                v-for="(slot, index) in passengerSlots"
                :key="index"
                class="passenger-card"
              >
                <header>
                  <span class="pill">Passenger {{ index + 1 }}</span>
                </header>
                <label class="form-field">
                  <span>Passenger UUID</span>
                  <input
                    :list="passengerDatalistId"
                    v-model="slot.passengerId"
                    placeholder="11111111-2222-3333-4444-555555555555"
                  />
                </label>
                <p v-if="getPassengerName(slot.passengerId)" class="passenger-name">
                  {{ getPassengerName(slot.passengerId) }}
                </p>
              </article>
            </div>
            <datalist :id="passengerDatalistId">
              <option
                v-for="passenger in passengerDirectory"
                :key="passenger.passengerId"
                :value="passenger.passengerId"
              >
                {{ passenger.name }}
              </option>
            </datalist>
          </div>

          <div v-else-if="currentStep === 2" class="step-section">
            <div class="class-grid">
              <label
                v-for="cls in flight.classes"
                :key="cls.id"
                class="class-card"
                :class="{
                  selected: selectedClassId === cls.id,
                  disabled: cls.availableSeats < contactForm.passengerCount,
                }"
              >
                <input
                  type="radio"
                  name="class-option"
                  :value="cls.id"
                  v-model.number="selectedClassId"
                />
                <div class="class-content">
                  <div class="class-header">
                    <h3>{{ cls.classType }}</h3>
                    <span class="class-price">{{ formatCurrency(cls.price) }}/pax</span>
                  </div>
                  <p class="class-detail">{{ cls.availableSeats }} seats available</p>
                  <p class="class-detail">{{ cls.seatCapacity }} total seats</p>
                  <p v-if="cls.availableSeats < contactForm.passengerCount" class="class-warning">
                    Not enough seats for {{ contactForm.passengerCount }} traveler
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div v-else-if="currentStep === 3" class="step-section">
            <div class="availability-note">
              <p>
                {{ availableSeats.length }} seat
                {{ availableSeats.length === 1 ? 'is' : 'are' }} available for
                {{ selectedClass?.classType || 'the selected class' }}.
              </p>
              <p v-if="selectedClass">
                {{ selectedClass.availableSeats }} seat
                {{ selectedClass.availableSeats === 1 ? 'remains' : 'remain' }} in
                {{ selectedClass.classType }}.
              </p>
            </div>
            <p v-if="seatsLoading" class="muted-hint">Fetching seat layout...</p>
            <p v-if="seatsError" class="form-error">{{ seatsError }}</p>
            <div class="seat-grid">
              <article
                v-for="(slot, index) in passengerSlots"
                :key="index"
                class="seat-card"
              >
                <header>
                  <span class="pill">Passenger {{ index + 1 }}</span>
                  <p class="passenger-name">
                    {{ getPassengerName(slot.passengerId) || slot.passengerId || 'Unknown traveler' }}
                  </p>
                </header>
                <label class="form-field">
                  <span>Seat code</span>
                  <select v-model="slot.seatCode">
                    <option disabled value="">Select a seat</option>
                    <option
                      v-for="seat in availableSeats"
                      :key="seat.id"
                      :value="seat.seatCode"
                      :disabled="isSeatTakenByOther(seat.seatCode, index)"
                    >
                      {{ seat.seatCode }}
                    </option>
                  </select>
                </label>
              </article>
            </div>
            <p v-if="availableSeats.length < contactForm.passengerCount" class="form-error">
              Only {{ availableSeats.length }} seat
              {{ availableSeats.length === 1 ? 'is' : 'are' }} available; this booking
              requires {{ contactForm.passengerCount }}.
            </p>
          </div>

          <div v-else class="step-section">
            <div class="review-grid">
              <article class="review-card">
                <h3>Contact Information</h3>
                <p>Email: {{ contactForm.contactEmail || 'N/A' }}</p>
                <p>Phone: {{ contactForm.contactPhone || 'N/A' }}</p>
                <p>Passengers: {{ contactForm.passengerCount }}</p>
              </article>
              <article class="review-card">
                <h3>Flight Summary</h3>
                <p>{{ flight.originAirportCode }} → {{ flight.destinationAirportCode }}</p>
                <p>
                  Depart: {{ formatDateTime(flight.departureTime) }} · Arrive:
                  {{ formatDateTime(flight.arrivalTime) }}
                </p>
                <p>Class: {{ selectedClass?.classType || '—' }}</p>
              </article>
              <article class="review-card">
                <h3>Passengers & Seats</h3>
                <ul>
                  <li v-for="(slot, index) in passengerSlots" :key="index">
                    <strong>Passenger {{ index + 1 }}:</strong>
                    {{ getPassengerName(slot.passengerId) || slot.passengerId || 'Unknown' }}
                    <span class="chip" v-if="slot.seatCode">Seat {{ slot.seatCode }}</span>
                  </li>
                </ul>
              </article>
              <article class="review-card total-card">
                <h3>Price</h3>
                <p>Per traveler: {{ formatCurrency(selectedClass?.price || 0) }}</p>
                <p>Total: {{ formatCurrency(totalPrice) }}</p>
              </article>
            </div>
          </div>
        </div>

        <p v-if="stepError" class="form-error">{{ stepError }}</p>

        <div class="wizard-actions">
          <button class="btn btn-secondary" @click="handleCancel" :disabled="submitting">Cancel</button>
          <button
            v-if="currentStep > 0"
            class="btn btn-secondary outline"
            @click="handleBack"
            :disabled="submitting"
          >
            Back
          </button>
          <button
            v-if="currentStep < steps.length - 1"
            class="btn btn-primary"
            @click="handleNext"
            :disabled="submitting"
          >
            Continue
          </button>
          <button
            v-else
            class="btn btn-primary"
            @click="handleSubmit"
            :disabled="submitting"
          >
            <span v-if="submitting" class="inline-loader"></span>
            Confirm Booking
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.create-booking-page {
  min-height: 100vh;
  padding: 2rem;
  color: #e2e8f0;
}

.create-booking-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.wizard-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.flight-route {
  color: #cbd5e0;
  margin: 0;
}

.stepper {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.step-pill {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.65rem 0.9rem;
  border-radius: 10px;
  background: #1f2738;
  border: 1px solid #4a5568;
  min-width: 230px;
}

.step-pill.active {
  background: #805ad5;
  border-color: #6b46c1;
}

.step-pill.done {
  background: #2d3649;
  border-color: #4c51bf;
}

.step-index {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #2d3748;
  color: #e2e8f0;
  font-weight: 700;
}

.step-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.step-text strong {
  font-size: 0.95rem;
}

.step-text span {
  font-size: 0.8rem;
  color: #a0aec0;
}

.state-card,
.wizard-card {
  background: #2d3748;
  padding: 2rem;
  border-radius: 16px;
  border: 1px solid #4a5568;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
}

.state-card.error {
  border-color: #c53030;
}

.flight-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
  background: #1f2738;
  padding: 1.25rem;
  border-radius: 12px;
  border: 1px solid #3b4152;
}

.flight-summary .label {
  color: #a0aec0;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.step-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.step-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  border-radius: 10px;
  padding: 0.85rem 1rem;
  color: #f7fafc;
  font-size: 1rem;
}

.form-field input:focus,
.form-field select:focus {
  border-color: #805ad5;
  box-shadow: 0 0 0 1px #805ad5;
  outline: none;
}

.muted-hint {
  color: #a0aec0;
  font-size: 0.9rem;
}

.passenger-directory {
  background: #1f2738;
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid #3b4152;
}

.passenger-directory ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.passenger-directory li {
  flex: 1 1 200px;
  background: #242d40;
  border-radius: 10px;
  padding: 0.65rem 0.9rem;
  border: 1px solid #3b4152;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.passenger-name {
  color: #63b3ed;
  font-size: 0.85rem;
  margin: 0;
}

.passenger-slots {
  display: grid;
  gap: 1rem;
}

.passenger-card {
  background: #141b2c;
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid #3b4152;
}

.pill {
  display: inline-flex;
  padding: 0.2rem 0.75rem;
  border-radius: 999px;
  background: #4c51bf;
  color: #e9d8fd;
  font-size: 0.85rem;
}

.class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.class-card {
  position: relative;
  border-radius: 16px;
  border: 1px solid #4a5568;
  background: #141b2c;
  padding: 1rem 1rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  cursor: pointer;
}

.class-card input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.class-card.selected {
  border-color: #805ad5;
  box-shadow: 0 0 0 2px rgba(128, 90, 213, 0.35);
}

.class-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.class-content h3 {
  margin: 0;
  font-size: 1.2rem;
}

.class-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.class-price {
  color: #9ae6b4;
  font-weight: 600;
}

.class-detail {
  margin: 0;
  color: #a0aec0;
  font-size: 0.85rem;
}

.class-warning {
  margin: 0;
  color: #f6ad55;
  font-size: 0.85rem;
}

.step-section .availability-note {
  color: #a0aec0;
  font-size: 0.9rem;
}

.seat-grid {
  display: grid;
  gap: 1rem;
}

.seat-card {
  background: #141b2c;
  border-radius: 12px;
  border: 1px solid #3b4152;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.seat-card header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chip {
  display: inline-flex;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: #805ad5;
  color: #fff;
  font-size: 0.75rem;
  margin-left: 0.25rem;
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.review-card {
  background: #141b2c;
  border-radius: 12px;
  border: 1px solid #3b4152;
  padding: 1rem;
}

.review-card h3 {
  margin-top: 0;
}

.review-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.total-card {
  background: linear-gradient(135deg, #2d3748, #1e2540);
}

.form-error {
  background: rgba(197, 48, 48, 0.2);
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1px solid rgba(229, 62, 62, 0.5);
  color: #fed7d7;
  font-weight: 600;
}

.wizard-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
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

.btn-secondary.outline {
  background: transparent;
  border: 1px solid #4a5568;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.loader {
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-top: 4px solid #805ad5;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  margin: 0 auto 1rem;
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
