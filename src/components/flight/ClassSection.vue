<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PropType } from 'vue';
import type { ClassFlightInterface, SeatInterface } from '@/interfaces';
import flightService from '@/services/flight.service';

const props = defineProps({
  flightClass: {
    type: Object as PropType<ClassFlightInterface>,
    required: true,
  },
});

const isExpanded = ref(false);
const seats = ref<SeatInterface[]>([]);
const seatMapLoading = ref(false);
const error = ref<string | null>(null);

const bookedSeats = computed(() => props.flightClass.seatCapacity - props.flightClass.availableSeats);
const occupancyRate = computed(() => {
  if (props.flightClass.seatCapacity === 0) {
    return 0;
  }
  return ((bookedSeats.value / props.flightClass.seatCapacity) * 100).toFixed(1);
});

const toggleSeatMap = async () => {
  isExpanded.value = !isExpanded.value;
  // Fetch seats only when expanding and if they haven't been fetched yet
  if (isExpanded.value && seats.value.length === 0) {
    seatMapLoading.value = true;
    error.value = null;
    try {
      seats.value = await flightService.getSeatsByClassId(props.flightClass.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
} catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to load seat map.';
    } finally {
      seatMapLoading.value = false;
    }
  }
};

const getSeatNumber = (seatCode: string) => {
  return seatCode.replace(/\D/g, '');
};
</script>

<template>
  <div class="class-section">
    <header class="section-header">
      <h3 class="class-name">{{ flightClass.classType }}</h3>
      <span class="class-price">IDR {{ flightClass.price.toLocaleString('id-ID') }}</span>
    </header>

    <div class="summary-grid">
      <div class="summary-card">
        <span class="label">Total Seats</span>
        <span class="value">{{ flightClass.seatCapacity }}</span>
      </div>
      <div class="summary-card">
        <span class="label">Available</span>
        <span class="value available">{{ flightClass.availableSeats }}</span>
      </div>
      <div class="summary-card">
        <span class="label">Booked</span>
        <span class="value booked">{{ bookedSeats }}</span>
      </div>
    </div>
    <div class="occupancy-rate">
      <span>{{ occupancyRate }}% occupied</span>
    </div>

    <button @click="toggleSeatMap" class="toggle-button">
      {{ isExpanded ? 'Hide Seat Map' : 'Show Seat Map' }}
    </button>

    <div v-if="isExpanded" class="seat-map-container">
      <div class="seat-map-legend">
        <div><span class="swatch available"></span> Available</div>
        <div><span class="swatch booked"></span> Booked</div>
      </div>
      <div v-if="seatMapLoading" class="loader"></div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <div v-else class="seat-grid">
        <div
          v-for="seat in seats"
          :key="seat.id"
          :class="['seat', { booked: seat.isBooked, available: !seat.isBooked }]"
        >
          {{ getSeatNumber(seat.seatCode) }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.class-section {
  background: #1a202c;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid #4a5568;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.class-name {
  font-size: 1.5rem;
  font-weight: 600;
  color: #e2e8f0;
}

.class-price {
  font-size: 1.2rem;
  font-weight: 500;
  color: #ffffff;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.summary-card {
  background: #2d3748;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.summary-card .label {
  font-size: 0.9rem;
  color: #a0aec0;
  display: block;
}

.summary-card .value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #ffffff;
}
.summary-card .value.available { color: #48bb78; }
.summary-card .value.booked { color: #f56565; }

.occupancy-rate {
  text-align: right;
  font-size: 0.9rem;
  color: #a0aec0;
  margin-bottom: 1.5rem;
}

.toggle-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #4a5568;
  color: #e2e8f0;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}
.toggle-button:hover {
  background-color: #718096;
}

.seat-map-container {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #4a5568;
}

.seat-map-legend {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 1rem;
    color: #a0aec0;
    font-size: 0.9rem;
}
.swatch {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 3px;
    vertical-align: middle;
    margin-right: 0.5rem;
}
.swatch.available { background-color: #48bb78; }
.swatch.booked { background-color: #f56565; }

.loader {
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border-top: 4px solid #805ad5;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin: 2rem auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: #f56565;
  text-align: center;
  padding: 2rem;
  background: #2d3748;
  border: 1px dashed #c53030;
  border-radius: 8px;
}

.seat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
  background: #2d3748;
  border-radius: 8px;
}

.seat {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  border-radius: 5px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #1a202c;
}

.seat.available {
  background-color: #48bb78;
}

.seat.booked {
  background-color: #f56565;
  color: #ffffff;
}
</style>
