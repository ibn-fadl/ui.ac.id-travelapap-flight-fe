<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useBookingStore } from '@/stores/booking.store';
import { useConfirmDialog } from '@/composables/useConfirmDialog';
import { useToast } from '@/composables/useToast';

const bookingStore = useBookingStore();
const { show: showConfirm } = useConfirmDialog();
const { showToast } = useToast();
const cancellingId = ref<string | null>(null);

onMounted(() => {
  bookingStore.fetchBookings();
});

const handleSearch = (event: Event) => {
  bookingStore.setFilter({ search: (event.target as HTMLInputElement).value });
};
const handleStatusChange = (event: Event) => {
  bookingStore.setFilter({ status: (event.target as HTMLSelectElement).value });
};
const handleFlightNumberChange = (event: Event) => {
  bookingStore.setFilter({ flightNumber: (event.target as HTMLInputElement).value });
};
const handleClassTypeChange = (event: Event) => {
  bookingStore.setFilter({ classType: (event.target as HTMLSelectElement).value });
};
const handleShowInactiveChange = (event: Event) => {
  bookingStore.setFilter({ showInactive: (event.target as HTMLInputElement).checked });
};

const getStatusText = (status: number) => {
  switch (status) {
    case 1: return 'Unpaid';
    case 2: return 'Paid';
    case 3: return 'Cancelled';
    case 4: return 'Rescheduled';
    default: return 'Unknown';
  }
};

const getStatusClass = (status: number) => {
  switch (status) {
    case 1: return 'status-unpaid';
    case 2: return 'status-paid';
    case 3: return 'status-cancelled';
    case 4: return 'status-rescheduled';
    default: return '';
  }
};

const handleCancelBooking = async (bookingId: string) => {
  const confirmed = await showConfirm({
    title: 'Cancel Booking',
    message: `Are you sure you want to cancel booking ${bookingId}? This action cannot be undone.`,
    confirmText: 'Cancel Booking',
    cancelText: 'Keep Booking',
    isDestructive: true,
  });

  if (!confirmed) return;

  cancellingId.value = bookingId;
  try {
    await bookingStore.cancelBooking(bookingId);
    showToast(`Booking ${bookingId} has been cancelled.`, 'success');
  } catch (err: any) {
    showToast(err.message || 'Failed to cancel booking.', 'error');
  } finally {
    cancellingId.value = null;
  }
};
</script>

<template>
  <div class="bookings-page">
    <header class="page-header">
      <h1>Flight Bookings</h1>
      <div class="header-actions">
        <button
          @click="bookingStore.fetchBookings()"
          class="action-btn refresh-btn"
          :disabled="bookingStore.loading"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          <span>Refresh</span>
        </button>
        <router-link class="action-btn stats-btn" :to="{ name: 'booking-statistics' }">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v2H3z"></path><path d="M8 7v14"></path><path d="M16 7v10"></path><path d="M12 11v10"></path><path d="M3 5l3-2h12l3 2H3z"></path></svg>
          <span>View Statistics</span>
        </router-link>
      </div>
    </header>

    <div class="stats-and-filters">
      <div class="filter-bar">
        <input type="text" placeholder="Search Booking ID, Email, Phone..." class="search-input" :value="bookingStore.filters.search" @input="handleSearch" />
        <input type="text" placeholder="Flight Number" class="filter-input" :value="bookingStore.filters.flightNumber" @input="handleFlightNumberChange" />
        <select class="filter-select" :value="bookingStore.filters.status" @change="handleStatusChange">
          <option value="all">All Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
          <option value="rescheduled">Rescheduled</option>
        </select>
        <select class="filter-select" :value="bookingStore.filters.classType" @change="handleClassTypeChange">
          <option value="">All Classes</option>
          <option value="Economy">Economy</option>
          <option value="Business">Business</option>
          <option value="First">First</option>
        </select>
        <div class="checkbox-group">
          <label class="toggle-switch">
            <input type="checkbox" :checked="bookingStore.filters.showInactive" @change="handleShowInactiveChange" />
            <span class="slider"></span>
          </label>
          <label class="toggle-label">Show Inactive</label>
        </div>
        <button class="action-btn reset-btn" @click="bookingStore.resetFilters()">Reset</button>
      </div>
      <div class="stats-container">
        <div class="stat-card">
          <h4>Total Bookings</h4>
          <p>{{ bookingStore.totalBookings }}</p>
        </div>
        <div class="stat-card">
          <h4>Paid</h4>
          <p>{{ bookingStore.paidBookings }}</p>
        </div>
        <div class="stat-card">
          <h4>Unpaid</h4>
          <p>{{ bookingStore.unpaidBookings }}</p>
        </div>
      </div>
    </div>

    <div v-if="bookingStore.loading" class="loader-container">
      <div class="loader"></div>
    </div>
    <div v-else-if="bookingStore.error" class="error-container">
      <p>{{ bookingStore.error }}</p>
    </div>
    <div v-else-if="bookingStore.filteredBookings.length === 0" class="empty-state">
      <h2>No Bookings Found</h2>
      <p>No bookings match the current filter criteria.</p>
    </div>
    <div v-else class="table-wrapper">
      <div class="table-container">
        <table class="bookings-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Booking ID</th>
              <th>Flight Number</th>
              <th>Route</th>
              <th>Class</th>
              <th>Contact Info</th>
              <th>Passengers</th>
              <th>Total Price</th>
              <th>Status</th>
              <th>Created At</th>
              <th class="sticky-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(booking, index) in bookingStore.filteredBookings" :key="booking.id">
              <td>{{ index + 1 }}</td>
              <td>{{ booking.id }}</td>
              <td>{{ booking.flightNumber }}</td>
              <td>{{ booking.route }}</td>
              <td>{{ booking.classType }}</td>
              <td>
                <div>{{ booking.contactEmail }}</div>
                <div>{{ booking.contactPhone }}</div>
              </td>
              <td>{{ booking.passengerCount }}</td>
              <td>{{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(booking.totalPrice) }}</td>
              <td>
                <span :class="['status-badge', getStatusClass(booking.status)]">
                  {{ getStatusText(booking.status) }}
                </span>
              </td>
              <td>{{ new Date(booking.createdAt).toLocaleString() }}</td>
              <td class="actions sticky-col">
                <router-link :to="{ name: 'booking-detail', params: { id: booking.id } }" class="btn-action detail">Detail</router-link>
                <button
                  class="btn-action cancel"
                  :disabled="booking.status !== 1 || cancellingId === booking.id"
                  @click="handleCancelBooking(booking.id)"
                >
                  <span v-if="cancellingId === booking.id" class="inline-loader"></span>
                  <span>{{ cancellingId === booking.id ? 'Cancelling...' : 'Cancel' }}</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bookings-page {
  position: relative;
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
.stats-and-filters {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2rem;
  margin-bottom: 2rem;
  align-items: start;
}
.header-actions {
  display: flex;
  gap: 1rem;
}
.stats-btn {
  background: linear-gradient(135deg, #38b2ac, #63b3ed);
  box-shadow: 0 12px 20px rgba(56, 178, 172, 0.35);
}
.stats-btn:not(:disabled):hover {
  filter: brightness(1.05);
}
.reset-btn {
  background: transparent;
  color: #cbd5e0;
  border: 1px solid rgba(203, 213, 224, 0.3);
}
.reset-btn:not(:disabled):hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.6);
}
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  background: #2d3748;
  padding: 1rem;
  border-radius: 12px;
}
.search-input, .filter-input, .filter-select {
  background-color: #1a202c;
  color: #e2e8f0;
  border: 1px solid #4a5568;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
}
.search-input {
  flex-grow: 1;
}
.stats-container {
  display: flex;
  gap: 1rem;
}
.stat-card {
  background: #2d3748;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  text-align: center;
}
.stat-card h4 {
  margin: 0 0 0.5rem;
  color: #a0aec0;
  font-size: 0.9rem;
  font-weight: 600;
}
.stat-card p {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
}
.table-wrapper {
  position: relative;
}
.table-container {
  background: #2d3748;
  border-radius: 12px;
  border: 1px solid #4a5568;
  overflow-x: auto;
}
.bookings-table {
  width: 100%;
  border-collapse: collapse;
  color: #e2e8f0;
}
.bookings-table th, .bookings-table td {
  padding: 1rem 1.5rem;
  text-align: left;
  white-space: nowrap;
}
.bookings-table thead th {
  position: sticky;
  top: 0;
  background-color: #4a5568;
  color: #ffffff;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.bookings-table tbody tr {
  border-bottom: 1px solid #4a5568;
}
.bookings-table tbody tr:last-child {
  border-bottom: none;
}
.bookings-table tbody tr:hover {
  background-color: #4a5568;
}

.sticky-col {
  position: sticky;
  right: 0;
  z-index: 2;
}

.bookings-table thead th.sticky-col {
  z-index: 4;
}

.bookings-table tbody td.sticky-col {
  background-color: #2d3748;
  transition: background-color 0.2s ease;
}

.bookings-table tbody tr:hover td.sticky-col {
  background-color: #4a5568;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}
.status-paid { background-color: #2f855a; color: #c6f6d5; }
.status-unpaid { background-color: #dd6b20; color: #fed7d7; }
.status-cancelled { background-color: #718096; color: #e2e8f0; }
.status-rescheduled { background-color: #2b6cb0; color: #bee3f8; }
.actions { display: flex; gap: 0.5rem; }
.btn-action { background: none; border: none; cursor: pointer; padding: 0.5rem; border-radius: 4px; color: #a0aec0; transition: all 0.2s ease; font-size: 1rem; font-weight: 600; }
.btn-action.detail { color: #63b3ed; text-decoration: none; }
.btn-action.detail:hover { color: #3182ce; }
.btn-action.cancel { color: #e53e3e; }
.btn-action.cancel:hover { color: #c53030; }
.btn-action:disabled { color: #718096; cursor: not-allowed; }
.inline-loader {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(229, 62, 62, 0.3);
  border-top-color: #e53e3e;
  border-radius: 50%;
  display: inline-block;
  margin-right: 0.35rem;
  animation: spin 0.8s linear infinite;
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
  text-align: center;
}
.loader {
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border-top: 4px solid #805ad5;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.checkbox-group { display: flex; align-items: center; gap: 0.75rem; }
.toggle-label { color: #cbd5e0; cursor: pointer; }
.toggle-switch { position: relative; display: inline-block; width: 50px; height: 28px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #4a5568; transition: .4s; border-radius: 28px; }
.slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .slider { background-color: #805ad5; }
input:checked + .slider:before { transform: translateX(22px); }
</style>
