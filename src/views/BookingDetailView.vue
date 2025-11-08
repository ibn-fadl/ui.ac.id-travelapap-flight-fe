<script setup lang="ts">
import { computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useBookingStore } from '@/stores/booking.store'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { formatCurrency, formatDateTime, formatDateOnly } from '@/utils/formatters'

const route = useRoute()
const router = useRouter()
const bookingStore = useBookingStore()
const { currentBooking: booking, loading, error } = storeToRefs(bookingStore)
const { show } = useConfirmDialog()

const bookingId = computed(() => route.params.id as string | undefined)

const loadBooking = async (id?: string) => {
  if (!id) {
    return
  }

  await bookingStore.fetchBookingById(id)
}

watch(
  () => bookingId.value,
  async (id) => {
    await loadBooking(id)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  bookingStore.resetCurrentBooking()
})

const BOOKING_STATUS_MAP = {
  1: { label: 'Unpaid', className: 'status-unpaid' },
  2: { label: 'Paid', className: 'status-paid' },
  3: { label: 'Cancelled', className: 'status-cancelled' },
  4: { label: 'Rescheduled', className: 'status-rescheduled' },
  default: { label: 'Unknown', className: 'status-unknown' }
} as const

const FLIGHT_STATUS_MAP = {
  1: { label: 'Scheduled', className: 'status-scheduled' },
  2: { label: 'In Flight', className: 'status-in-flight' },
  3: { label: 'Finished', className: 'status-finished' },
  4: { label: 'Delayed', className: 'status-delayed' },
  5: { label: 'Cancelled', className: 'status-cancelled' },
  default: { label: 'Unknown', className: 'status-unknown' }
} as const

const bookingStatusInfo = computed(() => {
  const status = booking.value?.status as keyof typeof BOOKING_STATUS_MAP
  return BOOKING_STATUS_MAP[status] ?? BOOKING_STATUS_MAP.default
})

const flightStatusInfo = computed(() => {
  const status = booking.value?.flight.status as keyof typeof FLIGHT_STATUS_MAP
  return FLIGHT_STATUS_MAP[status] ?? FLIGHT_STATUS_MAP.default
})

const canCancel = computed(() => booking.value?.status === 1)
const isMutating = computed(() => Boolean(booking.value) && loading.value)
const isInitialLoading = computed(() => !booking.value && loading.value)
const shouldShowError = computed(() => Boolean(error.value) && !booking.value && !loading.value)
const errorMessage = computed(() => error.value || 'Unable to load booking detail.')

const handleBackToList = () => {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }

  router.push({ name: 'bookings' })
}

const handleUpdateBooking = () => {
  if (!booking.value) {
    return
  }

  router.push({
    name: 'bookings',
    query: { editBookingId: booking.value.bookingId }
  })
}

const handleCancelBooking = async () => {
  if (!booking.value || !canCancel.value) {
    return
  }

  const confirmed = await show({
    title: 'Cancel Booking',
    message: `Are you sure you want to cancel booking ${booking.value.bookingId}?`,
    confirmText: 'Cancel Booking',
    cancelText: 'Keep Booking',
    isDestructive: true
  })

  if (!confirmed) {
    return
  }

  try {
    const updated = await bookingStore.cancelBooking(booking.value.bookingId)
    await show({
      title: 'Booking Cancelled',
      message: `Booking ${updated.bookingId} has been cancelled successfully.`,
      confirmText: 'Close'
    })
  } catch (err: any) {
    const message = err?.message || 'Failed to cancel booking. Please try again.'
    await show({
      title: 'Failed to Cancel',
      message,
      confirmText: 'Close'
    })
  }
}
</script>

<template>
  <div class="detail-page">
    <div class="detail-container">
      <nav class="breadcrumb">
        <router-link :to="{ name: 'bookings' }">All Bookings</router-link>
        <span>Booking Detail</span>
      </nav>

      <section v-if="isInitialLoading" class="loader-container">
        <div class="loader"></div>
        <p>Loading booking detail...</p>
      </section>

      <section v-else-if="shouldShowError" class="error-container">
        <p>{{ errorMessage }}</p>
        <button class="btn btn-secondary" @click="handleBackToList">Back to List</button>
      </section>

      <section v-else-if="booking" class="detail-card">
        <header class="detail-header">
          <div class="header-left">
            <p class="section-label">Booking ID</p>
            <h1>{{ booking.bookingId }}</h1>
            <span class="status-badge" :class="bookingStatusInfo.className">{{ bookingStatusInfo.label }}</span>
          </div>
          <div class="header-right">
            <p>Created: {{ formatDateTime(booking.createdAt) }}</p>
            <p>Updated: {{ formatDateTime(booking.updatedAt) }}</p>
          </div>
        </header>

        <section class="card-section flight-card">
          <div class="card-header-row">
            <span class="chip">Flight {{ booking.flight.flightId }}</span>
            <span class="status-badge" :class="flightStatusInfo.className">{{ flightStatusInfo.label }}</span>
          </div>
          <p class="route-text">{{ booking.flight.route.origin }} -> {{ booking.flight.route.destination }}</p>
          <div class="flight-meta">
            <div>
              <span class="meta-label">Airline</span>
              <span class="meta-value">{{ booking.flight.airlineName || 'N/A' }}</span>
            </div>
            <div>
              <span class="meta-label">Aircraft</span>
              <span class="meta-value">{{ booking.flight.aircraftModel || 'N/A' }}</span>
            </div>
          </div>
          <div class="info-grid">
            <div>
              <span class="meta-label">Departure</span>
              <span class="meta-value">{{ formatDateTime(booking.flight.departureTime) }}</span>
            </div>
            <div>
              <span class="meta-label">Arrival</span>
              <span class="meta-value">{{ formatDateTime(booking.flight.arrivalTime) }}</span>
            </div>
            <div>
              <span class="meta-label">Terminal</span>
              <span class="meta-value">{{ booking.flight.terminal || 'N/A' }}</span>
            </div>
            <div>
              <span class="meta-label">Gate</span>
              <span class="meta-value">{{ booking.flight.gate || 'N/A' }}</span>
            </div>
          </div>
        </section>

        <section class="grid-sections">
          <div class="card-section info-card">
            <h2>Class & Pricing</h2>
            <div class="info-row">
              <span>Class</span>
              <strong>{{ booking.classFlight.className }}</strong>
            </div>
            <div class="info-row">
              <span>Passengers</span>
              <strong>{{ booking.passengerCount }}</strong>
            </div>
            <div class="price-total">
              <span>Total Price</span>
              <strong>{{ formatCurrency(booking.totalPrice) }}</strong>
            </div>
          </div>
          <div class="card-section info-card">
            <h2>Contact Information</h2>
            <div class="info-row">
              <span>Email</span>
              <strong>{{ booking.contactInfo.email }}</strong>
            </div>
            <div class="info-row">
              <span>Phone</span>
              <strong>{{ booking.contactInfo.phone }}</strong>
            </div>
          </div>
        </section>

        <section class="card-section passengers-card">
          <div class="section-heading">
            <h2>Passenger Details</h2>
            <span>{{ booking.passengerCount }} total</span>
          </div>
          <div v-if="booking.passengerList.length" class="passenger-list">
            <article
              v-for="(passenger, index) in booking.passengerList"
              :key="passenger.passengerId"
              class="passenger-card"
            >
              <header class="passenger-header">
                <div>
                  <p class="passenger-index">Passenger {{ index + 1 }}</p>
                  <p class="passenger-name">{{ passenger.fullName }}</p>
                </div>
                <span v-if="passenger.seatCode" class="chip chip-accent">Seat {{ passenger.seatCode }}</span>
              </header>
              <div class="passenger-grid">
                <div>
                  <span class="meta-label">Birth Date</span>
                  <span class="meta-value">{{ formatDateOnly(passenger.birthDate) }}</span>
                </div>
                <div>
                  <span class="meta-label">ID / Passport</span>
                  <span class="meta-value">{{ passenger.identityNumber || 'N/A' }}</span>
                </div>
              </div>
            </article>
          </div>
          <p v-else class="empty-passengers">No passenger data available.</p>
        </section>

        <footer class="detail-actions">
          <button class="btn btn-secondary" @click="handleBackToList">Back to List</button>
          <div class="spacer"></div>
          <button class="btn btn-primary" @click="handleUpdateBooking" :disabled="isMutating">Update Booking</button>
          <button
            class="btn btn-danger"
            @click="handleCancelBooking"
            :disabled="!canCancel || isMutating"
          >
            <span v-if="isMutating" class="inline-loader"></span>
            Cancel Booking
          </button>
        </footer>
      </section>

      <section v-else class="empty-state">
        <p>Booking data is not available.</p>
        <button class="btn btn-secondary" @click="handleBackToList">Back to List</button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a202c, #2d3748);
  padding: 2rem;
  color: #e2e8f0;
}

.detail-container {
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

.detail-card {
  background: #2d3748;
  border-radius: 16px;
  border: 1px solid #4a5568;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #4a5568;
  padding-bottom: 1.25rem;
}

.header-left h1 {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 700;
  color: #ffffff;
}

.header-right {
  text-align: right;
  font-size: 0.85rem;
  color: #a0aec0;
}

.section-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  color: #a0aec0;
}

.card-section {
  background: #1f2738;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #3b4152;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.route-text {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.flight-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.meta-label {
  font-size: 0.8rem;
  color: #a0aec0;
}

.meta-value {
  font-size: 1rem;
  font-weight: 600;
  color: #edf2f7;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.grid-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.info-card h2,
.passengers-card h2 {
  margin-top: 0;
  font-size: 1.25rem;
  color: #f7fafc;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  color: #cbd5e0;
}

.price-total {
  margin-top: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.2rem;
}

.price-total strong {
  font-size: 1.4rem;
  color: #fbd38d;
}

.passengers-card .section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  color: #cbd5e0;
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

.passenger-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
}

.passenger-index {
  font-size: 0.85rem;
  color: #a0aec0;
  margin-bottom: 0.25rem;
}

.passenger-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.empty-passengers {
  color: #a0aec0;
  text-align: center;
  margin: 0;
}

.detail-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  border-top: 1px solid #4a5568;
  padding-top: 1.5rem;
}

.spacer {
  flex-grow: 1;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #fff;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #6b46c1, #805ad5);
}

.btn-secondary {
  background-color: #4a5568;
}

.btn-danger {
  background-color: #c53030;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.8rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-paid {
  background-color: #2f855a;
  color: #c6f6d5;
}

.status-unpaid {
  background-color: #dd6b20;
  color: #fefcbf;
}

.status-cancelled {
  background-color: #718096;
  color: #edf2f7;
}

.status-rescheduled {
  background-color: #2b6cb0;
  color: #bee3f8;
}

.status-unknown {
  background-color: #4a5568;
  color: #e2e8f0;
}

.status-scheduled {
  background-color: #2b6cb0;
  color: #bee3f8;
}

.status-in-flight {
  background-color: #805ad5;
  color: #ede9fe;
}

.status-finished {
  background-color: #2f855a;
  color: #c6f6d5;
}

.status-delayed {
  background-color: #dd6b20;
  color: #fefcbf;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background-color: #4c51bf;
  color: #e9d8fd;
  font-size: 0.85rem;
  font-weight: 600;
}

.chip-accent {
  background-color: #319795;
  color: #e6fffa;
}

.loader-container,
.error-container,
.empty-state {
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 12px;
  padding: 3rem;
  text-align: center;
  color: #cbd5e0;
}

.loader {
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border-top: 4px solid #805ad5;
  width: 48px;
  height: 48px;
  margin: 0 auto 1rem;
  animation: spin 1s linear infinite;
}

.inline-loader {
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid #fff;
  border-radius: 50%;
  width: 16px;
  height: 16px;
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
