<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import flightService from '@/services/flight.service';
import type { FlightDetailInterface } from '@/interfaces';
import ClassSection from '@/components/flight/ClassSection.vue';
import { useConfirmDialog } from '@/composables/useConfirmDialog';

const route = useRoute();
const router = useRouter();
const { show: showConfirm } = useConfirmDialog();

const flight = ref<FlightDetailInterface | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  const flightId = route.params.id as string;
  if (!flightId) {
    error.value = 'Flight ID is missing.';
    loading.value = false;
    return;
  }

  try {
    flight.value = await flightService.getFlightById(flightId);
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to fetch flight details.';
  } finally {
    loading.value = false;
  }
});

const goBack = () => {
  router.push('/flights');
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return { date: 'N/A', time: '' };
  const dateObj = new Date(dateString);
  return {
    date: dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    time: dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  };
};

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

const isBookable = computed(() => flight.value?.status === 1 && !flight.value?.isDeleted);
const isUpdatable = computed(() => (flight.value?.status === 1 || flight.value?.status === 4));
const isCancellable = computed(() => flight.value?.status === 1 || flight.value?.status === 4);

const durationMinutes = computed(() => {
  if (!flight.value?.arrivalTime || !flight.value?.departureTime) {
    return 0;
  }
  const arrival = new Date(flight.value.arrivalTime);
  const departure = new Date(flight.value.departureTime);
  const diffMs = arrival.getTime() - departure.getTime();
  return Math.round(diffMs / 60000);
});

const handleCancel = async () => {
  if (!flight.value) return;

  const isConfirmed = await showConfirm({
    title: 'Confirm Cancellation',
    message: `Are you sure you want to cancel flight ${flight.value.id}? This action cannot be undone.`,
    confirmText: 'Cancel Flight',
    cancelText: 'Keep Flight',
  });

  if (isConfirmed) {
    try {
      const updatedFlight = await flightService.cancelFlight(flight.value.id);
      flight.value = updatedFlight; // Update the view with the new status
      await showConfirm({
        title: 'Success',
        message: `Flight ${updatedFlight.id} has been cancelled successfully.`,
        confirmText: 'Close',
      });
    } catch (err: any) {
      await showConfirm({
        title: 'Error',
        message: err.response?.data?.message || 'Could not cancel the flight.',
        confirmText: 'Close',
      });
    }
  }
};

</script>

<template>
  <div class="detail-page">
    <div v-if="loading" class="loader-container">
      <div class="loader"></div>
      <p>Loading flight details...</p>
    </div>
    <div v-else-if="error" class="error-container">
      <p>{{ error }}</p>
      <button @click="goBack" class="btn btn-secondary">Go Back</button>
    </div>
    <div v-else-if="flight" class="detail-card">
      <header class="card-header">
        <div>
          <h1 class="flight-number">Flight {{ flight.id }}</h1>
          <p class="airline-name">{{ flight.airline.name }}</p>
        </div>
        <span :class="['status-badge', getStatusClass(flight.status)]">
          {{ getStatusText(flight.status) }}
        </span>
      </header>

      <div class="card-body">
        <!-- Route & Schedule -->
        <section class="detail-section">
          <h2 class="section-title">Route & Schedule</h2>
          <div class="route-grid">
            <div class="airport-details">
              <span class="label">Origin</span>
              <span class="airport-code">{{ flight.originAirportCode }}</span>
              <span class="airport-name">{{ flight.originAirportName }}</span>
            </div>
            <div class="route-line">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path></svg>
              <span class="value">{{ durationMinutes }} min</span>
            </div>
            <div class="airport-details text-right">
              <span class="label">Destination</span>
              <span class="airport-code">{{ flight.destinationAirportCode }}</span>
              <span class="airport-name">{{ flight.destinationAirportName }}</span>
            </div>
          </div>
          <div class="time-grid">
            <div>
              <span class="label">Departure</span>
              <span class="value">{{ formatDateTime(flight.departureTime).time }} - {{ formatDateTime(flight.departureTime).date }}</span>
            </div>
            <div class="text-right">
              <span class="label">Arrival</span>
              <span class="value">{{ formatDateTime(flight.arrivalTime).time }} - {{ formatDateTime(flight.arrivalTime).date }}</span>
            </div>
          </div>
        </section>

        <!-- Departure Information -->
        <section class="detail-section">
          <div class="info-grid four-col-grid">
            <div><span class="label">Terminal</span><span class="value">{{ flight.terminal || 'N/A' }}</span></div>
            <div><span class="label">Gate</span><span class="value">{{ flight.gate || 'N/A' }}</span></div>
            <div><span class="label">Baggage Allowance</span><span class="value">{{ flight.baggageAllowance }} kg</span></div>
            <div><span class="label">Facilities</span><span class="value">{{ flight.facilities || 'N/A' }}</span></div>
          </div>
        </section>

        <!-- Aircraft Information -->
        <section class="detail-section">
          <h2 class="section-title">Aircraft Information</h2>
          <div class="info-grid">
            <div><span class="label">Registration</span><span class="value">{{ flight.airplane.id }}</span></div>
            <div><span class="label">Model</span><span class="value">{{ flight.airplane.model }}</span></div>
            <div><span class="label">Seat Capacity</span><span class="value">{{ flight.airplane.seatCapacity }}</span></div>
          </div>
        </section>

        <!-- Flight Classes -->
        <section class="detail-section">
          <h2 class="section-title">Available Classes</h2>
          <ClassSection 
            v-for="cls in flight.classes" 
            :key="cls.id" 
            :flightClass="cls" 
          />
        </section>
      </div>

      <footer class="card-footer">
        <button @click="goBack" class="btn btn-secondary">Back</button>
        <div class="spacer"></div>
        <router-link :to="{ name: 'update-flight', params: { id: flight.id } }" class="btn btn-warning" :class="{ 'disabled-link': !isUpdatable }" :is="isUpdatable ? 'router-link' : 'span'">Update</router-link>
        <button class="btn btn-danger" @click="handleCancel" :disabled="!isCancellable">Cancel</button>
        <button class="btn btn-primary" :disabled="!isBookable">Book Flight</button>
      </footer>
    </div>
  </div>
</template>
<style scoped>
/* General Page & Card Styles */
.detail-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a202c, #2d3748);
  padding: 2rem;
  color: #e2e8f0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.detail-card {
  width: 100%;
  max-width: 1000px;
  background: #2d3748;
  border-radius: 12px;
  border: 1px solid #4a5568;
  padding: 2rem;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #4a5568;
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
}

.flight-number {
  font-size: 2.5rem;
  font-weight: 700;
  color: #ffffff;
}

.airline-name {
  font-size: 1.2rem;
  color: #a0aec0;
}

.detail-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #cbd5e0;
  margin-bottom: 1rem;
  border-bottom: 1px solid #4a5568;
  padding-bottom: 0.5rem;
}

.label {
  font-size: 0.9rem;
  color: #a0aec0;
  display: block;
  margin-bottom: 0.25rem;
}

.value {
  font-size: 1.1rem;
  color: #ffffff;
  font-weight: 500;
}

/* Route & Schedule */
.route-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}
.airport-details .airport-code { font-size: 2rem; font-weight: 700; color: #ffffff; }
.airport-details .airport-name { font-size: 1rem; color: #a0aec0; }
.route-line { text-align: center; color: #718096; }
.route-line svg { margin: 0 auto 0.25rem; }
.text-right { text-align: right; }

.time-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

/* Additional Info */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}
.info-grid.four-col-grid {
  grid-template-columns: repeat(4, 1fr);
}
.info-grid > div {
  background: #1a202c;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

/* Footer */
.card-footer {
  display: flex;
  gap: 1rem;
  border-top: 1px solid #4a5568;
  padding-top: 1.5rem;
  margin-top: 1.5rem;
}
.spacer { flex-grow: 1; }

/* Badges & Buttons */
.status-badge { padding: 0.3rem 0.8rem; border-radius: 9999px; font-size: 0.9rem; font-weight: 600; }
.status-badge.scheduled { background-color: #2b6cb0; color: white; }
.status-badge.in-flight { background-color: #805ad5; color: white; }
.status-badge.finished { background-color: #2f855a; color: white; }
.status-badge.delayed { background-color: #dd6b20; color: white; }
.status-badge.cancelled { background-color: #c53030; color: white; }

.btn { padding: 0.75rem 1.5rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; text-decoration: none; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.disabled-link {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary { background: linear-gradient(135deg, #6b46c1, #805ad5); color: white; }
.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.btn-secondary { background-color: #4a5568; color: #e2e8f0; }
.btn-secondary:hover:not(:disabled) { background-color: #718096; }
.btn-warning { background-color: #dd6b20; color: white; }
.btn-warning:hover:not(:disabled) { background-color: #ed8936; }
.btn-danger { background-color: #c53030; color: white; }
.btn-danger:hover:not(:disabled) { background-color: #e53e3e; }

/* Loader & Error */
.loader-container, .error-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; background: #2d3748; border-radius: 12px; border: 1px solid #4a5568; color: #a0aec0; width: 100%; max-width: 600px; }
.loader { border: 4px solid rgba(255, 255, 255, 0.2); border-radius: 50%; border-top: 4px solid #805ad5; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 1rem; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>
