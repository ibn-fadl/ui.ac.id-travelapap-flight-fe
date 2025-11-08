<script setup lang="ts">
import { computed } from 'vue';
import type { FlightInterface } from '@/interfaces';
import { useFlightStore } from '@/stores/flight.store';
import flightService from '@/services/flight.service';
import { useConfirmDialog } from '@/composables/useConfirmDialog';

const props = defineProps<{
  flight: FlightInterface;
}>();

const flightStore = useFlightStore();
const { show: showConfirm } = useConfirmDialog();

const isSelected = computed(() => {
  return flightStore.selectedDeparture?.id === props.flight.id;
});

const isReturnSelected = computed(() => {
    return flightStore.selectedReturn?.id === props.flight.id;
});

const isSelectionDisabled = computed(() => {
    if (!flightStore.isDepartureSelected) return false;
    // Disable selection if the current card is the same as the departure card
    return isSelected.value;
});

const isBookable = computed(() => {
  return props.flight.status === 1; // 1: Scheduled
});

const isUpdatable = computed(() => {
    return [1, 4].includes(props.flight.status); // Scheduled or Delayed
});

const isCancellable = computed(() => {
    return props.flight.status === 1 || props.flight.status === 4; // Scheduled or Delayed
});

const formatDateTime = (dateString: string) => {
  const dateObj = new Date(dateString);
  const time = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const day = dateObj.toLocaleDateString('en-GB', { day: '2-digit' });
  const month = dateObj.toLocaleDateString('en-GB', { month: 'short' });
  const year = dateObj.getFullYear();
  
  return {
    time: time,
    date: `${day} ${month}`,
    year: String(year)
  };
};

const formattedDeparture = computed(() => formatDateTime(props.flight.departureTime));
const formattedArrival = computed(() => formatDateTime(props.flight.arrivalTime));


const getStatusText = (status: number): string => {
  switch (status) {
    case 1: return 'Scheduled';
    case 2: return 'In Flight';
    case 3: return 'Finished';
    case 4: return 'Delayed';
    case 5: return 'Cancelled';
    default: return 'Unknown';
  }
};

const getStatusClass = (status: number): string => {
  switch (status) {
    case 1: return 'scheduled';
    case 2: return 'in-flight';
    case 3: return 'finished';
    case 4: return 'delayed';
    case 5: return 'cancelled';
    default: return 'unknown';
  }
};

const handleCancel = async () => {
  const isConfirmed = await showConfirm({
    title: 'Confirm Cancellation',
    message: `Are you sure you want to cancel flight ${props.flight.id}? This action cannot be undone.`,
    confirmText: 'Cancel Flight',
    cancelText: 'Keep Flight',
    isDestructive: true,
  });

  if (isConfirmed) {
    try {
      await flightService.cancelFlight(props.flight.id);
      await showConfirm({
        title: 'Success',
        message: `Flight ${props.flight.id} has been cancelled successfully.`,
        confirmText: 'Close',
      });
      flightStore.fetchFlights(); // Refresh the list
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      await showConfirm({
        title: 'Error',
        message: err.response?.data?.message || 'Could not cancel the flight.',
        confirmText: 'Close',
        isDestructive: true
      });
    }
  }
};
</script>

<template>
  <div class="flight-card" :class="{ selected: isSelected, 'return-selected': isReturnSelected }">
    <div class="card-header">
      <div class="airline-info">
        <span class="airline-name">{{ flight.airlineName }}</span>
        <span class="flight-id">{{ flight.id }}</span>
      </div>
      <span :class="['status-badge', getStatusClass(flight.status)]">
        {{ getStatusText(flight.status) }}
      </span>
    </div>

    <div class="card-body">
      <div class="route-info">
        <div class="airport">
          <span class="airport-code">{{ flight.originAirportCode }}</span>
          <div class="datetime">
            <span class="time">{{ formattedDeparture.time }}</span>
            <span class="date">{{ formattedDeparture.date }}</span>
            <span class="year">{{ formattedDeparture.year }}</span>
          </div>
        </div>
        <div class="route-line">
          <span class="duration">{{ flight.durationMinutes }} min</span>
          <div class="line"></div>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path></svg>
        </div>
        <div class="airport">
          <span class="airport-code">{{ flight.destinationAirportCode }}</span>
          <div class="datetime">
            <span class="time">{{ formattedArrival.time }}</span>
            <span class="date">{{ formattedArrival.date }}</span>
            <span class="year">{{ formattedArrival.year }}</span>
          </div>
        </div>
      </div>
      <div class="airplane-model">
        {{ flight.airplaneModel }}
      </div>
    </div>

    <div class="card-classes">
      <div v-for="cls in flight.classes" :key="cls.id" class="class-item">
        <span class="class-type">{{ cls.classType }}</span>
        <span class="class-price">IDR {{ cls.price.toLocaleString('id-ID') }}</span>
        <span class="class-seats">{{ cls.availableSeats }} / {{ cls.seatCapacity }} seats left</span>
      </div>
    </div>

    <div v-if="flight.facilities" class="card-facilities">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
        <span>{{ flight.facilities }}</span>
    </div>

    <div class="card-footer">
      <div class="management-actions">
        <router-link :to="{ name: 'update-flight', params: { id: flight.id } }" class="btn btn-warning" :class="{ 'disabled-link': !isUpdatable }" :is="isUpdatable ? 'router-link' : 'span'">Update</router-link>
        <button class="btn btn-danger" @click="handleCancel" :disabled="!isCancellable">Cancel</button>
      </div>
      <div class="spacer"></div>
      <div class="booking-actions">
        <router-link :to="`/flights/${flight.id}`" class="btn btn-secondary">Details</router-link>
        
        <!-- One-Way Booking -->
        <button v-if="flightStore.tripMode === 'one-way'" 
                @click="flightStore.bookOneWay(flight)"
                :disabled="!isBookable"
                class="btn btn-primary">
          Book Flight
        </button>

        <!-- Round-Trip Booking -->
        <template v-if="flightStore.tripMode === 'round-trip'">
          <button v-if="!flightStore.isDepartureSelected" 
                  @click="flightStore.selectDeparture(flight)"
                  :disabled="!isBookable"
                  class="btn btn-primary">
            Select Depart
          </button>
          <button v-else 
                  @click="flightStore.selectReturn(flight)"
                  :disabled="isSelectionDisabled || !isBookable"
                  class="btn btn-primary">
            Select Return
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flight-card {
  background: #2d3748;
  border-radius: 12px;
  border: 1px solid #4a5568;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.flight-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

.flight-card.selected {
  border-color: #805ad5;
  box-shadow: 0 0 15px rgba(128, 90, 213, 0.5);
}

.flight-card.return-selected {
  border-color: #38a169;
  box-shadow: 0 0 15px rgba(56, 161, 105, 0.5);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #4a5568;
  padding-bottom: 1rem;
}

.airline-info {
  display: flex;
  flex-direction: column;
}

.airline-name {
  font-weight: 600;
  color: #ffffff;
  font-size: 1.1rem;
}

.flight-id {
  font-size: 0.9rem;
  color: #a0aec0;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #ffffff;
}
.status-badge.scheduled { background-color: #2b6cb0; }
.status-badge.in-flight { background-color: #805ad5; }
.status-badge.finished { background-color: #2f855a; }
.status-badge.delayed { background-color: #dd6b20; }
.status-badge.cancelled { background-color: #c53030; }
.status-badge.unknown { background-color: #718096; }

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.route-info {
  display: flex;
  align-items: flex-start; /* Align to top */
  justify-content: space-between;
  gap: 1rem;
}

.airport {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.airport-code {
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
}

.datetime {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 0.25rem;
}

.time {
  font-size: 1.2rem;
  font-weight: 600;
  color: #e2e8f0;
}

.date {
  font-size: 0.9rem;
  color: #a0aec0;
}

.year {
  font-size: 0.8rem;
  color: #718096;
}

.route-line {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #718096;
  flex-grow: 1;
  padding-top: 1.5rem; /* Align with datetime */
}

.duration {
  font-size: 0.8rem;
  margin-bottom: 0.25rem;
}

.line {
  width: 100%;
  height: 1px;
  background-color: #4a5568;
  margin-bottom: 0.25rem;
}

.airplane-model {
  text-align: center;
  font-size: 0.9rem;
  color: #a0aec0;
  font-style: italic;
  margin-top: 0.5rem;
}

.card-classes {
  border-top: 1px solid #4a5568;
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.class-item {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  font-size: 0.9rem;
}

.class-type {
  font-weight: 600;
  color: #cbd5e0;
}

.class-price {
  font-weight: 600;
  color: #ffffff;
  text-align: center;
}

.class-seats {
  color: #a0aec0;
  text-align: right;
}

.card-facilities {
  border-top: 1px solid #4a5568;
  padding-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #a0aec0;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  border-top: 1px solid #4a5568;
  padding-top: 1rem;
  margin-top: 0.5rem;
}

.management-actions, .booking-actions {
  display: flex;
  gap: 1rem;
}

.spacer {
  flex-grow: 1;
}

.btn {
  padding: 0.5rem 1rem;
  border: 1px solid transparent;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.disabled-link {
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

.btn-warning {
  background-color: #dd6b20;
  color: white;
}
.btn-warning:hover:not(:disabled) { background-color: #ed8936; }

.btn-danger {
  background-color: #c53030;
  color: white;
}
.btn-danger:hover:not(:disabled) { background-color: #e53e3e; }
</style>