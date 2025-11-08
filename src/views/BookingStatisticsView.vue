<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Chart } from 'chart.js/auto';
import bookingService from '@/services/booking.service';
import type { BookingInterface } from '@/interfaces';
import { formatCurrency } from '@/utils/formatters';

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const currentDate = new Date();
const selectedMonth = ref(currentDate.getMonth());
const selectedYear = ref(currentDate.getFullYear());
const loading = ref(false);
const error = ref<string | null>(null);
const bookings = ref<BookingInterface[]>([]);
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const fetchBookings = async () => {
  loading.value = true;
  error.value = null;
  try {
    bookings.value = await bookingService.getAllBookings();
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Unable to load bookings.';
  } finally {
    loading.value = false;
  }
};

const filteredBookings = computed(() => {
  return bookings.value.filter((booking) => {
    if (![1, 2].includes(booking.status)) return false;
    const bookingDate = new Date(booking.createdAt);
    return (
      bookingDate.getFullYear() === selectedYear.value &&
      bookingDate.getMonth() === selectedMonth.value
    );
  });
});

const statsByFlight = computed(() => {
  const map = new Map<string, { flightNumber: string; revenue: number; count: number }>();
  filteredBookings.value.forEach((booking) => {
    const flight = map.get(booking.flightNumber);
    if (flight) {
      flight.revenue += booking.totalPrice;
      flight.count += 1;
    } else {
      map.set(booking.flightNumber, {
        flightNumber: booking.flightNumber,
        revenue: booking.totalPrice,
        count: 1,
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
});

const totalBookings = computed(() => filteredBookings.value.length);
const potentialEarnings = computed(() =>
  filteredBookings.value.reduce((sum, booking) => sum + booking.totalPrice, 0),
);

const topPerformance = computed(() => statsByFlight.value[0] || null);

const chartLabels = computed(() => statsByFlight.value.map((item) => item.flightNumber));
const chartValues = computed(() => statsByFlight.value.map((item) => item.revenue));

const renderChart = () => {
  if (!chartCanvas.value) return;

  const labels = chartLabels.value;
  const data = chartValues.value;

  if (chartInstance) {
    chartInstance.data.labels = labels;
    if (chartInstance.data.datasets[0]) {
      chartInstance.data.datasets[0].data = data;
    }
    chartInstance.update();
    return;
  }

  if (!labels.length) {
    return;
  }

  const config = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Revenue (IDR)',
          data,
          backgroundColor: '#6b46c1',
          borderColor: '#6b46c1',
          borderWidth: 2,
          fill: false,
        },
      ],
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (tickValue: string | number) =>
              formatCurrency(Number(tickValue), 'IDR'),
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  };

  chartInstance = new Chart(chartCanvas.value, config as any);
};

const debouncedRenderChart = debounce(renderChart, 300);

watch(
  [chartLabels, chartValues],
  () => {
    nextTick(() => {
      debouncedRenderChart();
    });
  },
  { immediate: true }
);

onMounted(fetchBookings);
onBeforeUnmount(() => {
  chartInstance?.destroy();
});

const periodLabel = computed(() => `${monthNames[selectedMonth.value]} ${selectedYear.value}`);

const handleRefresh = () => {
  fetchBookings();
};

const monthOptions = computed(() => monthNames.map((name, index) => ({ label: name, value: index })));
const yearOptions = computed(() => {
  const current = new Date().getFullYear();
  return Array.from({ length: 3 }, (_, index) => current - index);
});
</script>

<template>
  <div class="booking-statistics-page">
    <header class="page-header">
      <div class="heading-block">
        <p class="section-label">Booking statistics</p>
        <h1>Monthly performance</h1>
        <p class="muted-hint">Review Paid &amp; Unpaid bookings only.</p>
      </div>

      <div class="filters-row">
        <div class="select-group">
          <label class="form-field">
            <span>Month</span>
            <div class="select-shell">
              <select v-model.number="selectedMonth">
                <option v-for="option in monthOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
          </label>
          <label class="form-field">
            <span>Year</span>
            <div class="select-shell">
              <select v-model.number="selectedYear">
                <option v-for="year in yearOptions" :key="year" :value="year">
                  {{ year }}
                </option>
              </select>
            </div>
          </label>
        </div>

        <div class="filters-actions">
          <p class="period-pill">Showing data for {{ periodLabel }}</p>
          <button class="action-btn refresh-btn" @click="handleRefresh" :disabled="loading">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 12a9 9 0 0 1 15.46-6.32L22 9" />
              <path d="M21 3v6h-6" />
              <path d="M21 12a9 9 0 0 1-15.46 6.32L2 15" />
              <path d="M3 21v-6h6" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </header>

    <section class="stats-grid" v-if="!loading && !error">
      <article class="stat-card primary-card">
        <div class="stat-heading">
          <h3>Total bookings</h3>
          <span class="stat-pill">Paid + Unpaid</span>
        </div>
        <p class="stat-value">{{ totalBookings }}</p>
        <p class="stat-label">Confirmed this period</p>
      </article>
      <article class="stat-card accent-card">
        <div class="stat-heading">
          <h3>Potential earnings</h3>
          <span class="stat-pill subtle">IDR</span>
        </div>
        <p class="stat-value">{{ formatCurrency(potentialEarnings) }}</p>
        <p class="stat-label">Includes Paid &amp; Unpaid bookings</p>
      </article>
      <article class="stat-card outline-card">
        <div class="stat-heading">
          <h3>Top performance</h3>
          <span class="stat-pill subtle">Flight</span>
        </div>
        <p class="stat-value">
          {{ topPerformance ? topPerformance.flightNumber : '—' }}
        </p>
        <p class="stat-label">
          {{ topPerformance ? `${topPerformance.count} bookings · ${formatCurrency(topPerformance.revenue)}` : 'No data' }}
        </p>
      </article>
    </section>

    <section class="chart-card">
      <div class="chart-header">
        <div>
          <h2>Potential earnings by flight</h2>
          <p class="muted-hint">Paid + Unpaid revenue for the selected month.</p>
        </div>
      </div>
      <div class="chart-container">
        <canvas ref="chartCanvas"></canvas>
      </div>
      <p v-if="!chartLabels.length" class="empty-state">No bookings found for the selected period.</p>
    </section>

    <section v-if="loading" class="state-card">
      <div class="loader"></div>
      <p>Loading statistics…</p>
    </section>

    <section v-else-if="error" class="state-card error">
      <p>{{ error }}</p>
      <p class="muted-hint">Try refreshing or selecting another month/year.</p>
    </section>
  </div>
</template>

<style scoped>
.booking-statistics-page {
  min-height: 100vh;
  padding: 2rem;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0 0 1rem;
}
.heading-block h1 {
  font-size: 2.8rem;
  margin: 0.1rem 0;
}
.heading-block p {
  margin: 0;
}

.section-label {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.75rem;
  color: #a0aec0;
}

.muted-hint {
  color: #a0aec0;
  font-size: 0.85rem;
}

.filters-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}

.select-group {
  display: flex;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
}

.select-shell {
  background: #1f2537;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.2rem;
  min-width: 180px;
}

.form-field select {
  width: 100%;
  background: transparent;
  border: none;
  color: #f7fafc;
  padding: 0.65rem 2.4rem 0.65rem 0.9rem;
  font-size: 1rem;
}

.form-field select:focus {
  outline: none;
}

.filters-actions {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.period-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.55rem 1.15rem;
  border-radius: 999px;
  background: rgba(128, 90, 213, 0.15);
  border: 1px solid rgba(128, 90, 213, 0.35);
  color: #e9d8fd;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: #1f2738;
  border-radius: 12px;
  border: 1px solid #3b4152;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  position: relative;
  overflow: hidden;
}

.stat-card h3 {
  margin: 0;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #a0aec0;
}

.stat-value {
  font-size: 2.4rem;
  margin: 0;
  color: #f7fafc;
}

.stat-label {
  margin: 0;
  font-size: 0.85rem;
  color: #a0aec0;
}
.stat-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.stat-pill {
  padding: 0.2rem 0.7rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.15);
  color: #f7fafc;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-pill.subtle {
  background: rgba(203, 213, 224, 0.15);
  color: #cbd5e0;
}

.primary-card {
  background: linear-gradient(135deg, #5a67d8, #805ad5);
  border: none;
  box-shadow: 0 20px 35px rgba(90, 103, 216, 0.45);
}

.accent-card {
  background: linear-gradient(135deg, #319795, #4fd1c5);
  border: none;
  box-shadow: 0 20px 35px rgba(49, 151, 149, 0.35);
}

.outline-card {
  border: 1px solid rgba(203, 213, 224, 0.3);
  background: #1a2133;
}

.chart-card {
  background: linear-gradient(145deg, rgba(32, 42, 68, 0.95), rgba(25, 33, 52, 0.9));
  border-radius: 16px;
  border: 1px solid rgba(128, 90, 213, 0.35);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 25px 45px rgba(0, 0, 0, 0.4);
}

.chart-container {
  position: relative;
  height: 400px;
  width: 100%;
}

.chart-card canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  padding: 0.5rem;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.state-card {
  background: #2d3748;
  border-radius: 16px;
  border: 1px solid #4a5568;
  padding: 2rem;
  text-align: center;
}

.state-card.error {
  border-color: #c53030;
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

.empty-state {
  color: #cbd5e0;
  font-size: 0.9rem;
  margin-top: 0.75rem;
}

@media (max-width: 768px) {
  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }
  .filters-actions {
    justify-content: flex-start;
  }
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
