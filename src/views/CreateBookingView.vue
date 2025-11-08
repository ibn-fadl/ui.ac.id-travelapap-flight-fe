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

type TripType = 'departure' | 'return';
const TRIP_TYPES: TripType[] = ['departure', 'return'];
const tripLabels: Record<TripType, string> = {
  departure: 'Departure Flight',
  return: 'Return Flight',
};

const departureFlightId = computed(() => route.query.departureFlightId as string | undefined);
const returnFlightId = computed(() => route.query.returnFlightId as string | undefined);
const hasReturnFlight = computed(() => Boolean(returnFlightId.value));

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

const flights = reactive<Record<TripType, FlightDetailInterface | null>>({
  departure: null,
  return: null,
});
const flightLoading = reactive<Record<TripType, boolean>>({
  departure: false,
  return: false,
});
const flightErrors = reactive<Record<TripType, string | null>>({
  departure: null,
  return: null,
});

const contactForm = reactive({
  contactEmail: '',
  contactPhone: '',
  passengerCount: 1,
});

interface PassengerSlot {
  passengerId: string;
  seatCodes: Record<string, string>;
}

const passengerSlots = ref<PassengerSlot[]>([]);
const createEmptySeatCodes = (): Record<string, string> => ({
  departure: '',
  return: '',
});

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
      passengerSlots.value.push({ passengerId: '', seatCodes: createEmptySeatCodes() });
    }
    while (passengerSlots.value.length > normalized) {
      passengerSlots.value.pop();
    }
  },
  { immediate: true }
);

const selectedClassIds = reactive<Record<TripType, number | null>>({
  departure: null,
  return: null,
});
const seatState = reactive<Record<TripType, { seats: SeatInterface[]; loading: boolean; error: string | null }>>({
  departure: { seats: [], loading: false, error: null },
  return: { seats: [], loading: false, error: null },
});

const clearSeatCodesForTrip = (trip: TripType) => {
  passengerSlots.value.forEach((slot) => {
    slot.seatCodes[trip] = '';
  });
};

const setupSeatWatcher = (trip: TripType) => {
  watch(
    () => selectedClassIds[trip],
    async (value) => {
      seatState[trip].seats = [];
      seatState[trip].error = null;
      clearSeatCodesForTrip(trip);

      if (!value) {
        return;
      }

      seatState[trip].loading = true;
      try {
        const seats = await flightService.getSeatsByClassId(value);
        seatState[trip].seats = seats;
      } catch (err: any) {
        seatState[trip].error = err.response?.data?.message || 'Unable to load seat availability.';
      } finally {
        seatState[trip].loading = false;
      }
    }
  );
};

TRIP_TYPES.forEach(setupSeatWatcher);

const currentStep = ref(0);
const stepError = ref<string | null>(null);
const submitting = ref(false);

const selectedClasses = computed(() => ({
  departure:
    flights.departure?.classes.find((cls) => cls.id === selectedClassIds.departure) ?? null,
  return:
    flights.return?.classes.find((cls) => cls.id === selectedClassIds.return) ?? null,
}));

const getAvailableSeats = (trip: TripType) =>
  seatState[trip].seats.filter((seat) => !seat.isBooked);

const seatChipsForPassenger = (slot: PassengerSlot) =>
  activeTrips.value
    .map((trip) => ({
      trip,
      label: tripLabels[trip],
      seat: slot.seatCodes[trip] || '',
    }))
    .filter((chip) => Boolean(chip.seat));

const activeTrips = computed<TripType[]>(() => {
  const trips: TripType[] = [];
  if (flights.departure) {
    trips.push('departure');
  }
  if (hasReturnFlight.value && flights.return) {
    trips.push('return');
  }
  return trips;
});

const blockingError = computed(() => {
  if (!departureFlightId.value) {
    return 'Missing departure flight identifier. Please select a flight first.';
  }
  if (flightErrors.departure) return flightErrors.departure;
  const departureIssue = evaluateFlightIssue(flights.departure);
  if (departureIssue) return departureIssue;
  if (hasReturnFlight.value) {
    if (flightErrors.return) return flightErrors.return;
    if (!flights.return) return 'Return flight data is not available yet.';
    const returnIssue = evaluateFlightIssue(flights.return);
    if (returnIssue) return returnIssue;
  }
  return null;
});

const loadingState = computed(
  () => flightLoading.departure || (hasReturnFlight.value && flightLoading.return)
);

const evaluateFlightIssue = (flightData: FlightDetailInterface | null) => {
  if (!flightData) {
    return 'Flight data is not available yet.';
  }
  if (flightData.isDeleted) {
    return 'This flight is inactive and cannot be booked.';
  }
  if (flightData.status !== 1) {
    return 'Only scheduled flights can be booked.';
  }
  if (flightData.originAirportCode === flightData.destinationAirportCode) {
    return 'Origin and destination airports must differ.';
  }
  return null;
};

const totalPrice = computed(() =>
  activeTrips.value.reduce((sum, trip) => {
    const cls = selectedClasses.value[trip];
    return sum + (cls ? cls.price * contactForm.passengerCount : 0);
  }, 0)
);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9]{7,15}$/;

const getPassengerName = (id: string) =>
  passengers.value.find((entry) => entry.id === id)?.fullName;

const isSeatTakenByOther = (trip: TripType, seatCode: string, index: number) =>
  passengerSlots.value.some(
    (slot, slotIndex) => slotIndex !== index && slot.seatCodes[trip] === seatCode
  );

const validateContactStep = () => {
  if (!flights.departure) {
    return 'Flight information is still loading.';
  }
  const departureIssue = evaluateFlightIssue(flights.departure);
  if (departureIssue) {
    return departureIssue;
  }
  if (hasReturnFlight.value) {
    if (!flights.return) {
      return 'Return flight information is still loading.';
    }
    const returnIssue = evaluateFlightIssue(flights.return);
    if (returnIssue) {
      return returnIssue;
    }
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
  for (const trip of activeTrips.value) {
    const cls = selectedClasses.value[trip];
    if (!cls) {
      return `Select a class for ${tripLabels[trip]}.`;
    }
    if (cls.availableSeats < contactForm.passengerCount) {
      return `${tripLabels[trip]} does not have enough seats for ${contactForm.passengerCount} passengers.`;
    }
  }
  return null;
};

const validateSeatStep = () => {
  for (const trip of activeTrips.value) {
    const cls = selectedClasses.value[trip];
    if (!cls) {
      return `Select a class for ${tripLabels[trip]} before picking seats.`;
    }
    if (seatState[trip].loading) {
      return `Waiting for seat availability for ${tripLabels[trip]}.`;
    }
    const seatCodes = passengerSlots.value.map((slot) => (slot.seatCodes[trip] || '').trim());
    if (seatCodes.some((code) => !code)) {
      return `Assign a seat for every passenger on ${tripLabels[trip]}.`;
    }
    const duplicates = seatCodes.filter(
      (code, index, arr) => arr.indexOf(code) !== index
    );
    if (duplicates.length) {
      return `${tripLabels[trip]} has duplicate seat selections.`;
    }
    const availableSeatCodes = new Set(getAvailableSeats(trip).map((seat) => seat.seatCode));
    const invalidSeat = seatCodes.find((code) => !availableSeatCodes.has(code));
    if (invalidSeat) {
      return `Seat ${invalidSeat} on ${tripLabels[trip]} is no longer available.`;
    }
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

const buildPayload = (trip: TripType): BookingCreateRequest => {
  if (!flights[trip] || !selectedClasses.value[trip]) {
    throw new Error('Flight information is missing.');
  }
  return {
    flightId: flights[trip]!.id,
    classFlightId: selectedClasses.value[trip]!.id,
    contactEmail: contactForm.contactEmail.trim(),
    contactPhone: contactForm.contactPhone.trim(),
    passengerCount: contactForm.passengerCount,
    passengers: passengerSlots.value.map((slot) => ({
      passengerId: slot.passengerId.trim(),
      seatCode: (slot.seatCodes[trip] || '').trim(),
    })),
  };
};

const handleSubmit = async () => {
  const error = validateStep(currentStep.value);
  if (error) {
    stepError.value = error;
    return;
  }
  if (!flights.departure || !selectedClasses.value.departure) {
    stepError.value = 'Departure flight or class information is missing.';
    return;
  }
  if (hasReturnFlight.value && (!flights.return || !selectedClasses.value.return)) {
    stepError.value = 'Return flight or class information is missing.';
    return;
  }

  submitting.value = true;
  stepError.value = null;

  try {
    const departureResult = await bookingService.createBooking(buildPayload('departure'));
    let targetBookingId = departureResult[0]?.id;

    if (hasReturnFlight.value && flights.return) {
      await bookingService.createBooking(buildPayload('return'));
    }

    showToast(
      hasReturnFlight.value ? 'Round-trip booking created successfully.' : 'Booking created successfully.',
      'success'
    );
    bookingStore.fetchBookings();

    if (targetBookingId) {
      router.push({ name: 'booking-detail', params: { id: targetBookingId } });
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

const loadFlight = async (trip: TripType, id?: string) => {
  if (trip === 'departure' && !id) {
    flightErrors.departure = 'Missing departure flight identifier. Please select a flight first.';
    return;
  }

  if (!id) {
    flights[trip] = null;
    selectedClassIds[trip] = null;
    return;
  }

  flightLoading[trip] = true;
  flightErrors[trip] = null;
  try {
    const fetchedFlight = await flightService.getFlightById(id);
    flights[trip] = fetchedFlight;
    selectedClassIds[trip] = fetchedFlight.classes[0]?.id ?? null;
  } catch (err: any) {
    const message = err.response?.data?.message || err.message || 'Unable to load flight data.';
    flightErrors[trip] = message;
  } finally {
    flightLoading[trip] = false;
  }
};

watch(
  () => departureFlightId.value,
  (id) => {
    loadFlight('departure', id);
  },
  { immediate: true }
);

watch(
  () => returnFlightId.value,
  (id) => {
    if (id) {
      loadFlight('return', id);
    } else {
      flights.return = null;
      selectedClassIds.return = null;
      seatState.return.seats = [];
    }
  },
  { immediate: true }
);

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
  loadPassengers();
});
</script>

<template>
  <div class="create-booking-page">
    <div class="create-booking-container">
      <header class="wizard-header">
        <div>
          <p class="section-label">One-Way Booking Wizard</p>
          <h1>Confirm your trip</h1>
          <p v-if="flights.departure" class="flight-route">
            {{ flights.departure.airlineName }} · {{ flights.departure.originAirportCode }} → {{ flights.departure.destinationAirportCode }}
            <template v-if="hasReturnFlight && flights.return">
              &nbsp;| Return: {{ flights.return.originAirportCode }} → {{ flights.return.destinationAirportCode }}
            </template>
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

      <section v-if="loadingState" class="state-card">
        <div class="loader"></div>
        <p>Loading flight information...</p>
      </section>

      <section v-else-if="blockingError" class="state-card error">
        <p>{{ blockingError }}</p>
        <button class="btn btn-secondary" @click="handleCancel">Back to flights</button>
      </section>

      <section v-else-if="flights.departure" class="wizard-card">
        <div class="flight-summary">
          <article
            v-for="trip in activeTrips"
            :key="`summary-${trip}`"
            class="flight-summary-card"
          >
            <header class="card-header">
              <div>
                <p class="section-label">{{ tripLabels[trip] }}</p>
                <h2>{{ flights[trip]?.id }}</h2>
              </div>
              <span class="info-pill">
                {{ flights[trip]?.originAirportCode }} → {{ flights[trip]?.destinationAirportCode }}
              </span>
            </header>
            <div class="flight-summary-grid">
              <div>
                <span class="label">Departure</span>
                <p>{{ formatDateTime(flights[trip]?.departureTime) }}</p>
              </div>
              <div>
                <span class="label">Arrival</span>
                <p>{{ formatDateTime(flights[trip]?.arrivalTime) }}</p>
              </div>
              <div>
                <span class="label">Airline</span>
                <p>{{ flights[trip]?.airlineName }}</p>
              </div>
              <div>
                <span class="label">Aircraft</span>
                <p>{{ flights[trip]?.airplaneModel }}</p>
              </div>
            </div>
          </article>
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
            <p v-if="activeTrips.length" class="total-hint">
              Estimated total ({{ activeTrips.length }} flight{{ activeTrips.length === 1 ? '' : 's' }}):
              {{ formatCurrency(totalPrice) }}
            </p>
            <div
              v-for="trip in activeTrips"
              :key="`class-${trip}`"
              class="trip-section"
            >
              <div class="trip-heading">
                <h3>{{ tripLabels[trip] }}</h3>
                <p class="muted-hint">
                  {{ flights[trip]?.originAirportCode }} → {{ flights[trip]?.destinationAirportCode }}
                </p>
              </div>
              <div class="class-grid">
                <label
                  v-for="cls in flights[trip]?.classes || []"
                  :key="cls.id"
                  class="class-card"
                  :class="{
                    selected: selectedClassIds[trip] === cls.id,
                    disabled: cls.availableSeats < contactForm.passengerCount,
                  }"
                >
                  <input
                    type="radio"
                    :name="`class-option-${trip}`"
                    :value="cls.id"
                    v-model.number="selectedClassIds[trip]"
                  />
                  <div class="class-content">
                    <div class="class-header">
                      <h3>{{ cls.classType }}</h3>
                      <span class="class-price">{{ formatCurrency(cls.price) }}/pax</span>
                    </div>
                    <p class="class-detail">{{ cls.availableSeats }} seats available</p>
                    <p class="class-detail">{{ cls.seatCapacity }} total seats</p>
                    <p
                      v-if="cls.availableSeats < contactForm.passengerCount"
                      class="class-warning"
                    >
                      Not enough seats for {{ contactForm.passengerCount }} traveler
                      {{ contactForm.passengerCount === 1 ? '' : 's' }}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div v-else-if="currentStep === 3" class="step-section">
            <div
              v-for="trip in activeTrips"
              :key="`seats-${trip}`"
              class="trip-section"
            >
              <div class="trip-heading">
                <h3>{{ tripLabels[trip] }} Seats</h3>
                <p class="muted-hint">
                  {{ getAvailableSeats(trip).length }} seat
                  {{ getAvailableSeats(trip).length === 1 ? 'is' : 'are' }} available in
                  {{ selectedClasses[trip]?.classType || 'selected class' }}.
                </p>
              </div>
              <p v-if="seatState[trip].loading" class="muted-hint">Fetching seat layout...</p>
              <p v-if="seatState[trip].error" class="form-error">{{ seatState[trip].error }}</p>
              <div class="seat-grid">
                <article
                  v-for="(slot, index) in passengerSlots"
                  :key="`${trip}-${index}`"
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
                    <select v-model="slot.seatCodes[trip]">
                      <option disabled value="">Select a seat</option>
                      <option
                        v-for="seat in getAvailableSeats(trip)"
                        :key="seat.id"
                        :value="seat.seatCode"
                        :disabled="isSeatTakenByOther(trip, seat.seatCode, index)"
                      >
                        {{ seat.seatCode }}
                      </option>
                    </select>
                  </label>
                </article>
              </div>
              <p
                v-if="getAvailableSeats(trip).length < contactForm.passengerCount"
                class="form-error"
              >
                Only {{ getAvailableSeats(trip).length }} seat
                {{ getAvailableSeats(trip).length === 1 ? 'is' : 'are' }} available for
                {{ tripLabels[trip] }}; this booking requires {{ contactForm.passengerCount }}.
              </p>
            </div>
          </div>

          <div v-else class="step-section">
            <div class="review-grid">
              <article class="review-card">
                <h3>Contact Information</h3>
                <p>Email: {{ contactForm.contactEmail || 'N/A' }}</p>
                <p>Phone: {{ contactForm.contactPhone || 'N/A' }}</p>
                <p>Passengers: {{ contactForm.passengerCount }}</p>
              </article>
              <article
                v-for="trip in activeTrips"
                :key="`review-flight-${trip}`"
                class="review-card"
              >
                <h3>{{ tripLabels[trip] }}</h3>
                <p>{{ flights[trip]?.originAirportCode }} → {{ flights[trip]?.destinationAirportCode }}</p>
                <p>
                  Depart: {{ formatDateTime(flights[trip]?.departureTime) }} · Arrive:
                  {{ formatDateTime(flights[trip]?.arrivalTime) }}
                </p>
                <p>Class: {{ selectedClasses[trip]?.classType || '—' }}</p>
              </article>
              <article class="review-card">
                <h3>Passengers & Seats</h3>
                <ul>
                  <li v-for="(slot, index) in passengerSlots" :key="index">
                    <strong>Passenger {{ index + 1 }}:</strong>
                    {{ getPassengerName(slot.passengerId) || slot.passengerId || 'Unknown' }}
                    <span
                      v-for="chip in seatChipsForPassenger(slot)"
                      :key="`${chip.trip}-${slot.passengerId || index}`"
                      class="chip"
                    >
                      {{ chip.label }} · Seat {{ chip.seat }}
                    </span>
                  </li>
                </ul>
              </article>
              <article class="review-card total-card">
                <h3>Price</h3>
                <p>Total (all flights): {{ formatCurrency(totalPrice) }}</p>
                <p class="muted-hint">
                  {{
                    hasReturnFlight
                      ? 'Round-trip total including both flights.'
                      : 'One-way total.'
                  }}
                </p>
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
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.flight-summary-card {
  background: #1f2738;
  border-radius: 12px;
  border: 1px solid #3b4152;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.flight-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
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

.trip-section {
  background: #1f2738;
  border-radius: 12px;
  border: 1px solid #3b4152;
  padding: 1rem 1.25rem;
  margin-bottom: 1.25rem;
}

.trip-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
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

.total-hint {
  color: #f7fafc;
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.seat-card header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chip {
  display: inline-flex;
  padding: 0.2rem 0.85rem;
  border-radius: 999px;
  background: #805ad5;
  color: #fff;
  font-size: 0.8rem;
  margin-left: 0.25rem;
  margin-top: 0.25rem;
  letter-spacing: 0.01em;
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
