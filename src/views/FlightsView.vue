<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useFlightStore } from '@/stores/flight.store';
import FlightCard from '@/components/flight/FlightCard.vue';
import SelectionBanner from '@/components/flight/SelectionBanner.vue';
import type { FlightFilters } from '@/stores/flight.store';

const flightStore = useFlightStore();

onMounted(() => {
  flightStore.fetchFlights();
});

// --- Debounce logic for text inputs ---
let debounceTimer: number;
const handleDebouncedInput = (filter: Partial<FlightFilters>) => {
  clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    flightStore.setFilter(filter);
  }, 500); // 500ms delay
};
</script>

<template>
  <div class="flights-page">
    <header class="page-header">
      <h1>Flights</h1>
      <div class="header-actions">
        <button
          class="btn btn-secondary"
          @click="flightStore.fetchFlights()"
          :disabled="flightStore.loading">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          <span>Refresh</span>
        </button>
        <div class="trip-mode-toggle">
          <button
            @click="flightStore.setTripMode('one-way')"
            :class="['toggle-btn', { active: flightStore.tripMode === 'one-way' }]">
            One-Way
          </button>
          <button
            @click="flightStore.setTripMode('round-trip')"
            :class="['toggle-btn', { active: flightStore.tripMode === 'round-trip' }]">
            Round-Trip
          </button>
        </div>
        <router-link to="/flights/create" class="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Create Flight</span>
        </router-link>
      </div>
    </header>

    <div class="filter-bar">
      <input type="text" placeholder="Origin (e.g., CGK)" class="filter-input"
             :value="flightStore.filters.origin"
             @input="handleDebouncedInput({ origin: ($event.target as HTMLInputElement).value })"
             :disabled="flightStore.isDepartureSelected" />
      <input type="text" placeholder="Destination (e.g., SIN)" class="filter-input"
             :value="flightStore.filters.destination"
             @input="handleDebouncedInput({ destination: ($event.target as HTMLInputElement).value })"
             :disabled="flightStore.isDepartureSelected" />
      <input type="text" placeholder="Search Airline or Flight #" class="filter-input search-input"
             :value="flightStore.filters.search"
             @input="handleDebouncedInput({ search: ($event.target as HTMLInputElement).value })"
             :disabled="flightStore.isDepartureSelected" />
      <select class="filter-select"
              :value="flightStore.filters.status"
              @change="flightStore.setFilter({ status: ($event.target as HTMLSelectElement).value })"
              :disabled="flightStore.isDepartureSelected">
        <option value="all">All Statuses</option>
        <option value="1">Scheduled</option>
        <option value="2">In Flight</option>
        <option value="3">Finished</option>
        <option value="4">Delayed</option>
        <option value="5">Cancelled</option>
      </select>
      <div class="checkbox-group">
        <label class="toggle-switch">
          <input type="checkbox" id="show-inactive"
                 :checked="flightStore.filters.showInactive"
                 @change="flightStore.setFilter({ showInactive: ($event.target as HTMLInputElement).checked })"
                 :disabled="flightStore.isDepartureSelected" />
          <span class="slider"></span>
        </label>
        <label for="show-inactive" class="toggle-label">Show Inactive</label>
      </div>
      <button class="btn btn-secondary" @click="flightStore.resetFilters()" :disabled="flightStore.isDepartureSelected">Reset</button>
    </div>

    <SelectionBanner
      v-if="flightStore.tripMode === 'round-trip' && flightStore.isDepartureSelected"
      :departure-flight="flightStore.selectedDeparture"
      :return-flight="flightStore.selectedReturn"
      :is-proceed-disabled="!flightStore.isReturnSelected"
      @proceed="flightStore.validateAndProceed"
      @clear="flightStore.clearSelection"
    />

    <div v-if="flightStore.selectionError" class="alert alert-danger selection-error">
      {{ flightStore.selectionError }}
    </div>

    <div class="content-area">
      <div v-if="flightStore.loading" class="loader-container">
        <div class="loader"></div>
        <p>Loading flights...</p>
      </div>
      <div v-else-if="flightStore.error" class="error-container">
        <p>Error fetching flights: {{ flightStore.error }}</p>
      </div>
      <div v-else-if="flightStore.filteredFlights.length === 0" class="empty-state">
        <p>No flights found.</p>
      </div>
      <div v-else class="horizontal-scroll-container">
        <div class="flights-list">
          <FlightCard
            v-for="flight in flightStore.filteredFlights"
            :key="flight.id"
            :flight="flight"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flights-page {
  display: flex;
  flex-direction: column;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.trip-mode-toggle {
  display: flex;
  background-color: #2d3748;
  border-radius: 8px;
  padding: 0.25rem;
  border: 1px solid #4a5568;
}

.toggle-btn {
  background: transparent;
  border: none;
  color: #a0aec0;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.toggle-btn.active {
  background-color: #805ad5;
  color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #2d3748;
  border-radius: 12px;
  border: 1px solid #4a5568;
}

.filter-input, .filter-select {
  background-color: #1a202c;
  color: #e2e8f0;
  border: 1px solid #4a5568;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
}
.filter-select {
  padding-right: 2.75rem;
}

.filter-input.search-input {
  flex-grow: 1;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toggle-label {
  color: #cbd5e0;
  cursor: pointer;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #4a5568;
  transition: .4s;
  border-radius: 28px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #805ad5;
}

input:checked + .slider:before {
  transform: translateX(22px);
}


.btn {
  padding: 0.75rem 1.5rem;
  border: 1px solid transparent;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.btn-primary {
  background: linear-gradient(135deg, #6b46c1, #805ad5);
  color: white;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.btn-primary:hover { filter: brightness(1.1); }

.header-actions .btn svg {
  margin-right: 0.5rem;
  transition: transform 0.5s ease;
}

.header-actions .btn:disabled svg {
  animation: spin 1s linear infinite;
}

.btn-secondary {
  background-color: #4a5568;
  color: #e2e8f0;
  display: flex;
  align-items: center;
}
.btn-secondary:hover:not(:disabled) { background-color: #718096; }

.alert.selection-error {
  margin-bottom: 2rem;
  background-color: #c53030;
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
}

.content-area {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Prevent flexbox overflow issues */
}

.loader-container, .error-container, .empty-state {
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

.horizontal-scroll-container {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.5rem;
  margin: -0.5rem;
  flex-grow: 1;
}

.flights-list {
  display: flex;
  flex-direction: row;
  gap: 1.5rem;
  padding-bottom: 1rem; /* Space for scrollbar */
}

.flights-list > :deep(.flight-card) {
  flex: 0 0 auto;
  width: 420px;
  margin-bottom: 0;
}
</style>
