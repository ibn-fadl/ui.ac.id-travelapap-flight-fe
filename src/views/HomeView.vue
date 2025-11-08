<script setup lang="ts">
import { ref, onMounted } from 'vue';
import airlineService from '../services/airline.service';
import bookingService from '../services/booking.service';
import flightService from '../services/flight.service';

// --- State Management ---
const activeFlightsToday = ref(0);
const bookingsToday = ref(0);
const totalAirlines = ref(0);

const loading = ref({
  flights: false,
  bookings: false,
  airlines: false
});

const errors = ref({
  flights: null as string | null,
  bookings: null as string | null,
  airlines: null as string | null
});

const lastUpdated = ref('');

// --- Data Fetching ---
const fetchDashboardData = async () => {
  loading.value = { flights: true, bookings: true, airlines: true };
  errors.value = { flights: null, bookings: null, airlines: null };

  const today = new Date().toISOString().split('T')[0];

  const [flightsResult, bookingsResult, airlinesResult] = await Promise.allSettled([
    flightService.getAllFlights(),
    bookingService.getAllBookings(),
    airlineService.getAllAirlines()
  ]);

  // Process flights
  if (flightsResult.status === 'fulfilled') {
    try {
      const activeStatuses = [1, 2]; // Scheduled or In Flight
      activeFlightsToday.value = flightsResult.value.filter(flight => {
        const departureDate = new Date(flight.departureTime).toISOString().split('T')[0];
        const arrivalDate = new Date(flight.arrivalTime).toISOString().split('T')[0];
        const isToday = departureDate === today || arrivalDate === today;
        return activeStatuses.includes(flight.status) && isToday;
      }).length;
    } catch (e) {
      errors.value.flights = 'Failed to process flight data.';
      activeFlightsToday.value = 0;
    }
  } else {
    errors.value.flights = 'Failed to fetch flight data.';
    activeFlightsToday.value = 0;
  }
  loading.value.flights = false;

  // Process bookings
  if (bookingsResult.status === 'fulfilled') {
    try {
      bookingsToday.value = bookingsResult.value.filter(booking => {
        const bookingDate = new Date(booking.createdAt).toISOString().split('T')[0];
        return bookingDate === today;
      }).length;
    } catch (e) {
      errors.value.bookings = 'Failed to process booking data.';
      bookingsToday.value = 0;
    }
  } else {
    errors.value.bookings = 'Failed to fetch booking data.';
    bookingsToday.value = 0;
  }
  loading.value.bookings = false;

  // Process airlines
  if (airlinesResult.status === 'fulfilled') {
    totalAirlines.value = airlinesResult.value.length;
  } else {
    errors.value.airlines = 'Failed to fetch airline data.';
    totalAirlines.value = 0;
  }
  loading.value.airlines = false;

  lastUpdated.value = new Date().toLocaleTimeString();
};

const refreshData = () => {
  lastUpdated.value = 'Just now';
  fetchDashboardData();
};

onMounted(fetchDashboardData);
</script>

<template>
  <div class="dashboard-page">
    <main class="dashboard-content">
      <header class="dashboard-header">
        <div>
          <h1>Flight Management System</h1>
          <p>Real-time flight operations and booking management dashboard</p>
        </div>
        <div class="header-actions">
          <router-link to="/airplanes" class="btn btn-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path></svg>
            <span>Manage Airplanes</span>
          </router-link>
          <button @click="refreshData" class="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            <span>Refresh Data</span>
          </button>
        </div>
      </header>

      <div v-if="lastUpdated" class="last-updated">
        Last updated: {{ lastUpdated }}
      </div>

      <section class="summary-cards">
        <!-- Active Flights Today -->
        <div class="card">
          <div class="card-body">
            <div v-if="loading.flights" class="loader"></div>
            <div v-else class="card-content-wrapper">
              <div class="card-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05a2.12 2.12 0 0 0-3.03 0l-9.5 9.5a2.12 2.12 0 0 0 3.03 3.03l9.5-9.5a2.12 2.12 0 0 0 0-3.03z"></path><path d="M12.5 11.5 2.5 21.5"></path><path d="m12 1-1.25 1.25"></path><path d="m15 4-1.25 1.25"></path><path d="m18 7-1.25 1.25"></path><path d="m3 21 1.5-1.5"></path></svg>
              </div>
              <div class="card-text">
                <p class="card-title">Active Flights Today</p>
                <h2 class="card-value">{{ activeFlightsToday }}</h2>
                <p class="card-label">Scheduled & In Flight</p>
              </div>
            </div>
            <div v-if="errors.flights && !loading.flights" class="alert alert-danger">{{ errors.flights }}</div>
          </div>
        </div>

        <!-- Bookings Today -->
        <div class="card">
          <div class="card-body">
            <div v-if="loading.bookings" class="loader"></div>
            <div v-else class="card-content-wrapper">
              <div class="card-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path><path d="M13 5v2"></path><path d="M13 17v2"></path><path d="M13 11v2"></path></svg>
              </div>
              <div class="card-text">
                <p class="card-title">Bookings Today</p>
                <h2 class="card-value">{{ bookingsToday }}</h2>
                <p class="card-label">New reservations made</p>
              </div>
            </div>
            <div v-if="errors.bookings && !loading.bookings" class="alert alert-danger">{{ errors.bookings }}</div>
          </div>
        </div>

        <!-- Total Airlines -->
        <div class="card">
          <div class="card-body">
            <div v-if="loading.airlines" class="loader"></div>
            <div v-else class="card-content-wrapper">
              <div class="card-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path></svg>
              </div>
              <div class="card-text">
                <p class="card-title">Total Airlines</p>
                <h2 class="card-value">{{ totalAirlines }}</h2>
                <p class="card-label">Registered carriers</p>
              </div>
            </div>
            <div v-if="errors.airlines && !loading.airlines" class="alert alert-danger">{{ errors.airlines }}</div>
          </div>
        </div>
      </section>

      <section class="quick-actions">
        <h3 class="quick-actions-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          <span>Quick Actions</span>
        </h3>
        <div class="actions-grid">
          <router-link to="/airplanes" class="action-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path></svg>
            <span>Manage Airplanes</span>
          </router-link>
          <router-link to="/airplanes" class="action-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Register Airplane</span>
          </router-link>
          <router-link to="/flights" class="action-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05a2.12 2.12 0 0 0-3.03 0l-9.5 9.5a2.12 2.12 0 0 0 3.03 3.03l9.5-9.5a2.12 2.12 0 0 0 0-3.03z"></path><path d="M12.5 11.5 2.5 21.5"></path><path d="m12 1-1.25 1.25"></path><path d="m15 4-1.25 1.25"></path><path d="m18 7-1.25 1.25"></path><path d="m3 21 1.5-1.5"></path></svg>
            <span>Manage Flights</span>
          </router-link>
          <router-link to="/bookings" class="action-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path><path d="M13 5v2"></path><path d="M13 17v2"></path><path d="M13 11v2"></path></svg>
            <span>View Bookings</span>
          </router-link>
        </div>
      </section>

      <footer class="dashboard-footer">
        <p>All statistics are updated in real-time. Click refresh to get the latest data.</p>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.dashboard-page {
  min-height: calc(100vh - 120px);
  padding: 2rem;
  color: inherit;
}

.dashboard-content {
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.dashboard-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.dashboard-header p {
  font-size: 1.1rem;
  color: #a0aec0;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: 1px solid transparent;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex; /* Use inline-flex for alignment */
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #6b46c1, #805ad5);
  color: white;
}

.btn-primary:hover {
  filter: brightness(1.1);
}

.btn-secondary {
  background-color: transparent;
  border-color: #4a5568;
  color: #e2e8f0;
}

.btn-secondary:hover {
  background-color: #4a5568;
  color: white;
}

.last-updated {
  text-align: right;
  font-style: italic;
  color: #718096;
  margin-bottom: 2rem;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.card {
  background: #2d3748;
  border-radius: 12px;
  border: 1px solid #4a5568;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

.card-body {
  padding: 1.5rem;
}

.card-content-wrapper {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.card-icon {
  color: #805ad5;
}

.card-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #a0aec0;
  margin: 0 0 0.25rem;
}

.card-value {
  font-size: 2.5rem; /* Slightly smaller */
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.card-label {
  font-size: 1rem;
  color: #718096;
}

.loader {
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border-top: 4px solid #805ad5;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 2rem auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-top: 1rem;
}

.alert-danger {
  background-color: #c53030;
  color: white;
}

.quick-actions {
  background: #2d3748;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #4a5568;
  margin-bottom: 2rem;
}

.quick-actions-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.5rem;
  color: #ffffff;
  margin-top: 0;
  margin-bottom: 1.5rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.action-item {
  background: #4a5568;
  color: #e2e8f0;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  text-decoration: none;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.action-item:hover {
  background-color: #805ad5;
  color: white;
  transform: translateY(-3px);
}

.dashboard-footer {
  text-align: center;
  color: #718096;
  padding: 1rem 0;
}
</style>
