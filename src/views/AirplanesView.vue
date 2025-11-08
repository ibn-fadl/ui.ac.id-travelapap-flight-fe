<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue';
import { useAirplaneStore } from '@/stores/airplane.store';
import type { AirplaneInterface, CreateAirplaneRequestInterface, UpdateAirplaneRequestInterface } from '@/interfaces';
import Modal from '@/components/common/Modal.vue';
import RegisterAirplaneForm from '@/components/airplane/RegisterAirplaneForm.vue';

const airplaneStore = useAirplaneStore();

// --- State for Modals ---
const isRegisterModalOpen = ref(false);
const showSuccessDialog = ref(false);
const formError = ref<string | null>(null);
const registerForm = ref<InstanceType<typeof RegisterAirplaneForm> | null>(null);

const isDeactivateModalOpen = ref(false);
const airplaneToDeactivate = ref<AirplaneInterface | null>(null);
const deactivationError = ref<string | null>(null);
const showDeactivationSuccess = ref(false);

const isActivateModalOpen = ref(false);
const airplaneToActivate = ref<AirplaneInterface | null>(null);
const activationError = ref<string | null>(null);
const showActivationSuccess = ref(false);

const isDetailModalOpen = ref(false);
const isDetailEditMode = ref(false);
const detailError = ref<string | null>(null);
const showUpdateSuccess = ref(false);
const currentAirplaneForDetail = ref<AirplaneInterface | null>(null);

// Form state for the detail/update modal
const detailForm = ref<{
  model: string;
  seatCapacity: number | null;
  manufactureYear: number | null;
}>({
  model: '',
  seatCapacity: null,
  manufactureYear: null,
});

const detailFormErrors = ref({
  seatCapacity: '',
  manufactureYear: '',
});


// --- Data Fetching and Filtering ---
onMounted(() => {
  airplaneStore.fetchAirplanes();
});

const filteredAirplanes = computed(() => airplaneStore.filteredAirplanes);
const uniqueAirlines = computed(() => airplaneStore.uniqueAirlines);
const uniqueYears = computed(() => airplaneStore.uniqueYears);

const handleSearch = (event: Event) => {
  airplaneStore.setSearchQuery((event.target as HTMLInputElement).value);
};
const handleStatusChange = (event: Event) => {
  airplaneStore.setStatusFilter((event.target as HTMLSelectElement).value);
};
const handleAirlineChange = (event: Event) => {
  airplaneStore.setAirlineFilter((event.target as HTMLSelectElement).value);
};
const handleYearChange = (event: Event) => {
  airplaneStore.setYearFilter((event.target as HTMLSelectElement).value);
};
const refreshData = () => {
  airplaneStore.fetchAirplanes();
};
const clearFilters = () => {
  airplaneStore.setSearchQuery('');
  airplaneStore.setStatusFilter('all');
  airplaneStore.setAirlineFilter('all');
  airplaneStore.setYearFilter('all');
};

// --- Register Modal Logic ---
const openRegisterModal = () => {
  formError.value = null;
  isRegisterModalOpen.value = true;
};
const closeRegisterModal = () => isRegisterModalOpen.value = false;
const handleFormSubmit = async (formData: CreateAirplaneRequestInterface) => {
  formError.value = null;
  try {
    await airplaneStore.createAirplane(formData);
  } catch (err: any) {
    formError.value = err.message || 'An unknown error occurred during submission.';
  }
};
watch(() => airplaneStore.newlyCreatedAirplane, (newVal) => {
  if (newVal) {
    isRegisterModalOpen.value = false;
    showSuccessDialog.value = true;
  }
});
const handleRegisterAnother = () => {
  showSuccessDialog.value = false;
  airplaneStore.newlyCreatedAirplane = null;
  registerForm.value?.resetForm();
  openRegisterModal();
};
const handleViewAll = () => {
  showSuccessDialog.value = false;
  airplaneStore.newlyCreatedAirplane = null;
};

// --- Deactivate Modal Logic ---
const openDeactivateModal = (airplane: AirplaneInterface) => {
  airplaneToDeactivate.value = airplane;
  deactivationError.value = null;
  isDeactivateModalOpen.value = true;
};
const closeDeactivateModal = () => {
  isDeactivateModalOpen.value = false;
  airplaneToDeactivate.value = null;
  deactivationError.value = null;
};
const handleDeactivateConfirm = async () => {
  if (!airplaneToDeactivate.value) return;
  deactivationError.value = null;
  try {
    await airplaneStore.deactivateAirplane(airplaneToDeactivate.value.id);
    closeDeactivateModal();
    showDeactivationSuccess.value = true;
    setTimeout(() => showDeactivationSuccess.value = false, 3000);
  } catch (err: any) {
    deactivationError.value = err.response?.data?.message || 'An unknown error occurred.';
  }
};

// --- Activate Modal Logic ---
const openActivateModal = (airplane: AirplaneInterface) => {
  airplaneToActivate.value = airplane;
  activationError.value = null;
  isActivateModalOpen.value = true;
};
const closeActivateModal = () => {
  isActivateModalOpen.value = false;
  airplaneToActivate.value = null;
  activationError.value = null;
};
const handleActivateConfirm = async () => {
  if (!airplaneToActivate.value) return;
  activationError.value = null;
  try {
    await airplaneStore.activateAirplane(airplaneToActivate.value.id);
    closeActivateModal();
    showActivationSuccess.value = true;
    setTimeout(() => showActivationSuccess.value = false, 3000);
  } catch (err: any) {
    activationError.value = err.response?.data?.message || 'An unknown error occurred.';
  }
};

// --- Detail/Update Modal Logic ---
const openDetailModal = (airplane: AirplaneInterface, editMode: boolean) => {
  detailError.value = null;
  detailFormErrors.value = { seatCapacity: '', manufactureYear: '' };
  isDetailEditMode.value = editMode;
  currentAirplaneForDetail.value = airplane;
  
  detailForm.value = {
    model: airplane.model,
    seatCapacity: airplane.seatCapacity,
    manufactureYear: airplane.manufactureYear,
  };
  
  isDetailModalOpen.value = true;
};

const closeDetailModal = () => {
  isDetailModalOpen.value = false;
  currentAirplaneForDetail.value = null;
  detailError.value = null;
};

const validateUpdateForm = (): boolean => {
  detailFormErrors.value = { seatCapacity: '', manufactureYear: '' };
  let isValid = true;

  if (!detailForm.value.seatCapacity || detailForm.value.seatCapacity <= 0) {
    detailFormErrors.value.seatCapacity = 'Seat capacity must be greater than 0.';
    isValid = false;
  }
  if (!detailForm.value.manufactureYear) {
    detailFormErrors.value.manufactureYear = 'Manufacture year is required.';
    isValid = false;
  } else if (detailForm.value.manufactureYear < 1900 || detailForm.value.manufactureYear > new Date().getFullYear()) {
    detailFormErrors.value.manufactureYear = `Year must be between 1900 and ${new Date().getFullYear()}.`;
    isValid = false;
  }
  
  return isValid;
};

const handleUpdate = async () => {
  if (!validateUpdateForm()) {
    return;
  }
  if (!currentAirplaneForDetail.value) return;

  detailError.value = null;

  const payload: UpdateAirplaneRequestInterface = {
    model: detailForm.value.model,
    seatCapacity: detailForm.value.seatCapacity!,
    manufactureYear: detailForm.value.manufactureYear!,
  };

  try {
    await airplaneStore.updateAirplane(currentAirplaneForDetail.value.id, payload);
    closeDetailModal();
    showUpdateSuccess.value = true;
    setTimeout(() => showUpdateSuccess.value = false, 3000);
  } catch (err: any) {
    detailError.value = err.response?.data?.message || 'An unknown error occurred during update.';
  }
};

</script>

<template>
  <div class="airplanes-page">
    <!-- Header -->
    <header class="page-header">
      <h1>Airplane Management</h1>
      <div class="header-actions">
        <button @click="refreshData" class="btn btn-secondary" :disabled="airplaneStore.loading && airplaneStore.airplanes.length > 0">
          <span v-if="airplaneStore.loading && airplaneStore.airplanes.length === 0" class="spinner"></span>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          <span>Refresh</span>
        </button>
        <button @click="openRegisterModal" class="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Register Airplane</span>
        </button>
      </div>
    </header>

    <!-- Success Notifications -->
    <div v-if="showDeactivationSuccess" class="alert alert-success top-notification">
      Airplane successfully deactivated.
    </div>
    <div v-if="showActivationSuccess" class="alert alert-success top-notification">
      Airplane successfully activated.
    </div>
    <div v-if="showUpdateSuccess" class="alert alert-success top-notification">
      Airplane successfully updated.
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <input type="text" placeholder="Search..." class="search-input" :value="airplaneStore.searchQuery" @input="handleSearch" />
      <select class="filter-select" :value="airplaneStore.statusFilter" @change="handleStatusChange">
        <option value="all">All Statuses</option>
        <option value="active">Active Only</option>
        <option value="inactive">Inactive Only</option>
      </select>
      <select class="filter-select" :value="airplaneStore.airlineFilter" @change="handleAirlineChange">
        <option value="all">All Airlines</option>
        <option v-for="airline in uniqueAirlines" :key="airline" :value="airline">{{ airline }}</option>
      </select>
      <select class="filter-select" :value="airplaneStore.yearFilter" @change="handleYearChange">
        <option value="all">All Years</option>
        <option v-for="year in uniqueYears" :key="year" :value="year">{{ year }}</option>
      </select>
    </div>

    <!-- Main Content -->
    <div v-if="airplaneStore.loading && airplaneStore.airplanes.length === 0" class="loader-container">
      <div class="loader"></div>
    </div>
    <div v-else-if="airplaneStore.error && airplaneStore.airplanes.length === 0" class="error-container">
      <p>{{ airplaneStore.error }}</p>
    </div>
    <div v-else-if="filteredAirplanes.length === 0" class="empty-state">
      <h2>No Airplanes Found</h2>
      <p>No airplanes match the current filter criteria.</p>
      <button class="btn btn-secondary" @click="clearFilters">Clear Filters</button>
    </div>
    <div v-else class="table-wrapper">
      <div v-if="airplaneStore.loading && airplaneStore.airplanes.length > 0" class="reloading-overlay">
        <div class="loader"></div>
      </div>
      <div class="table-container" :class="{ 'is-reloading': airplaneStore.loading && airplaneStore.airplanes.length > 0 }">
        <table class="airplanes-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Registration</th>
              <th>Airline</th>
              <th>Model</th>
              <th>Seat Capacity</th>
              <th>Manufacture Year</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Updated At</th>
              <th class="sticky-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(airplane, index) in filteredAirplanes" :key="airplane.id">
              <td>{{ index + 1 }}</td>
              <td class="clickable">{{ airplane.id }}</td>
              <td>{{ airplane.airlineId }}</td>
              <td>{{ airplane.model }}</td>
              <td>{{ airplane.seatCapacity }}</td>
              <td>{{ airplane.manufactureYear }}</td>
              <td>
                <span :class="['status-badge', !airplane.isDeleted ? 'active' : 'inactive']">
                  {{ !airplane.isDeleted ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>{{ new Date(airplane.createdAt).toLocaleDateString() }}</td>
              <td>{{ new Date(airplane.updatedAt).toLocaleDateString() }}</td>
              <td class="actions sticky-col">
                <template v-if="!airplane.isDeleted">
                  <button class="btn-action update" @click="openDetailModal(airplane, true)">Update</button>
                  <button class="btn-action deactivate" @click="openDeactivateModal(airplane)">Deactivate</button>
                </template>
                <template v-else>
                  <button class="btn-action detail" @click="openDetailModal(airplane, false)">Detail</button>
                  <button class="btn-action activate" @click="openActivateModal(airplane)">Activate</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Register Airplane Modal -->
    <Modal :show="isRegisterModalOpen" @close="closeRegisterModal">
      <template #header>
        <h2>Register New Airplane</h2>
      </template>
      <template #body>
        <RegisterAirplaneForm ref="registerForm" @submit="handleFormSubmit" />
        <div v-if="formError" class="alert alert-danger global-error">
          {{ formError }}
        </div>
      </template>
      <template #footer>
        <button class="btn btn-secondary" @click="closeRegisterModal">Cancel</button>
        <button class="btn btn-primary" @click="() => registerForm?.handleSubmit()" :disabled="airplaneStore.loading">
          <span v-if="airplaneStore.loading" class="spinner"></span>
          <span v-else>Submit Registration</span>
        </button>
      </template>
    </Modal>

    <!-- Deactivate Confirmation Modal -->
    <Modal :show="isDeactivateModalOpen" @close="closeDeactivateModal">
      <template #header>
        <h2>Confirm Deactivation</h2>
      </template>
      <template #body>
        <div v-if="airplaneToDeactivate" class="confirmation-body">
          <div class="dialog-icon warning">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
          <p>Are you sure you want to deactivate airplane <strong>{{ airplaneToDeactivate.id }}</strong>?</p>
          <p class="warning-text">This airplane cannot be used for new flights once deactivated.</p>
          <div v-if="deactivationError" class="alert alert-danger global-error">
            {{ deactivationError }}
          </div>
        </div>
      </template>
      <template #footer>
        <button class="btn btn-secondary" @click="closeDeactivateModal" :disabled="airplaneStore.loading">Cancel</button>
        <button class="btn btn-danger" @click="handleDeactivateConfirm" :disabled="airplaneStore.loading">
          <span v-if="airplaneStore.loading" class="spinner"></span>
          <span v-else>Deactivate</span>
        </button>
      </template>
    </Modal>

    <!-- Activate Confirmation Modal -->
    <Modal :show="isActivateModalOpen" @close="closeActivateModal">
      <template #header>
        <h2>Confirm Activation</h2>
      </template>
      <template #body>
        <div v-if="airplaneToActivate" class="confirmation-body">
          <div class="dialog-icon success">
             <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <p>Are you sure you want to activate airplane <strong>{{ airplaneToActivate.id }}</strong>?</p>
          <p class="warning-text">This airplane will be available for new flights.</p>
          <div v-if="activationError" class="alert alert-danger global-error">
            {{ activationError }}
          </div>
        </div>
      </template>
      <template #footer>
        <button class="btn btn-secondary" @click="closeActivateModal" :disabled="airplaneStore.loading">Cancel</button>
        <button class="btn btn-success" @click="handleActivateConfirm" :disabled="airplaneStore.loading">
          <span v-if="airplaneStore.loading" class="spinner"></span>
          <span v-else>Activate</span>
        </button>
      </template>
    </Modal>

    <!-- Success Dialog (for Register) -->
    <Modal :show="showSuccessDialog" @close="handleViewAll">
        <template #header>
            <h2>Registration Successful</h2>
        </template>
        <template #body>
            <div class="success-dialog-body">
                <div class="dialog-icon success">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <p>A new airplane has been added to the fleet.</p>
                <div class="summary" v-if="airplaneStore.newlyCreatedAirplane">
                    <p><strong>Registration:</strong> {{ airplaneStore.newlyCreatedAirplane.id }}</p>
                    <p><strong>Model:</strong> {{ airplaneStore.newlyCreatedAirplane.model }}</p>
                    <p><strong>Airline:</strong> {{ airplaneStore.newlyCreatedAirplane.airlineId }}</p>
                </div>
            </div>
        </template>
        <template #footer>
            <button @click="handleRegisterAnother" class="btn btn-secondary">Register Another</button>
            <button @click="handleViewAll" class="btn btn-primary">Close</button>
        </template>
    </Modal>

    <!-- Detail/Update Modal -->
    <Modal :show="isDetailModalOpen" @close="closeDetailModal">
      <template #header>
        <h2>{{ isDetailEditMode ? 'Update Airplane' : 'Airplane Details' }}</h2>
      </template>
      <template #body>
        <div v-if="currentAirplaneForDetail" class="detail-form">
          <div class="form-grid">
            <div class="form-group">
              <label for="detail-airlineId">Airline</label>
              <input type="text" id="detail-airlineId" :value="currentAirplaneForDetail.airlineId" disabled />
            </div>
            <div class="form-group">
              <label for="detail-model">Aircraft Model</label>
              <input type="text" id="detail-model" v-model="detailForm.model" :disabled="!isDetailEditMode" />
            </div>
            <div class="form-group">
              <label for="detail-seatCapacity">Seat Capacity</label>
              <input type="number" id="detail-seatCapacity" v-model.number="detailForm.seatCapacity" :disabled="!isDetailEditMode" :class="{ 'is-invalid': detailFormErrors.seatCapacity }" />
              <small v-if="detailFormErrors.seatCapacity" class="error-text">{{ detailFormErrors.seatCapacity }}</small>
            </div>
            <div class="form-group">
              <label for="detail-manufactureYear">Manufacture Year</label>
              <input type="number" id="detail-manufactureYear" v-model.number="detailForm.manufactureYear" :disabled="!isDetailEditMode" :class="{ 'is-invalid': detailFormErrors.manufactureYear }" />
              <small v-if="detailFormErrors.manufactureYear" class="error-text">{{ detailFormErrors.manufactureYear }}</small>
            </div>
          </div>
          <div v-if="detailError" class="alert alert-danger global-error">
            {{ detailError }}
          </div>
        </div>
      </template>
      <template #footer>
        <button class="btn btn-secondary" @click="closeDetailModal">Close</button>
        <button v-if="isDetailEditMode" class="btn btn-primary" @click="handleUpdate" :disabled="airplaneStore.loading">
          <span v-if="airplaneStore.loading" class="spinner"></span>
          <span v-else>Save Changes</span>
        </button>
      </template>
    </Modal>

  </div>
</template>

<style scoped>
.airplanes-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a202c, #2d3748);
  padding: 2rem;
  color: #e2e8f0;
  position: relative;
}
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.page-header h1 { font-size: 2.5rem; font-weight: 700; color: #ffffff; }
.header-actions { display: flex; gap: 1rem; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem; }
.search-input, .filter-select { background-color: #2d3748; color: #e2e8f0; border: 1px solid #4a5568; border-radius: 8px; padding: 0.75rem 1rem; font-size: 1rem; }
.search-input { flex-grow: 1; min-width: 250px; }
.search-input::placeholder { color: #a0aec0; }

.table-wrapper {
  position: relative;
}

.table-container { 
  background: #2d3748; 
  border-radius: 12px; 
  border: 1px solid #4a5568; 
  overflow-x: auto; 
  overflow-y: auto;
  max-height: 65vh;
  transition: filter 0.3s ease;
}
.table-container.is-reloading {
  filter: blur(2px);
  opacity: 0.6;
}

.reloading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(45, 55, 72, 0.5);
  z-index: 10;
  border-radius: 12px;
}

.airplanes-table { width: 100%; border-collapse: collapse; color: #e2e8f0; }
.airplanes-table th, .airplanes-table td { padding: 1rem 1.5rem; text-align: left; white-space: nowrap; }

.airplanes-table thead th {
  position: sticky;
  top: 0;
  background-color: #4a5568; 
  color: #ffffff; 
  font-size: 0.875rem; 
  text-transform: uppercase; 
  letter-spacing: 0.05em;
  z-index: 3;
}

.airplanes-table tbody tr { border-bottom: 1px solid #4a5568; }
.airplanes-table tbody tr:last-child { border-bottom: none; }
.airplanes-table tbody tr:hover { background-color: #4a5568; }

/* Sticky Column Styles */
.sticky-col {
  position: sticky;
  right: 0;
  z-index: 2;
}

thead th.sticky-col {
  z-index: 4; /* Must be higher than thead th */
}

tbody td.sticky-col {
  background-color: #2d3748;
  transition: background-color 0.2s ease;
}

tbody tr:hover td.sticky-col {
  background-color: #4a5568;
}


.clickable { color: #805ad5; font-weight: 600; cursor: pointer; }
.status-badge { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; }
.status-badge.active { background-color: #2f855a; color: #c6f6d5; }
.status-badge.inactive { background-color: #c53030; color: #fed7d7; }
.actions { display: flex; gap: 0.5rem; }
.btn-action { background: none; border: none; cursor: pointer; padding: 0.5rem; border-radius: 4px; color: #a0aec0; transition: all 0.2s ease; font-size: 1rem; font-weight: 600; }
.btn-action.update { color: #63b3ed; }
.btn-action.update:hover { color: #3182ce; }
.btn-action.deactivate { color: #e53e3e; }
.btn-action.deactivate:hover { color: #c53030; }
.btn-action.activate { color: #48bb78; }
.btn-action.activate:hover { color: #2f855a; }
.btn-action.detail { color: #a0aec0; }
.btn-action.detail:hover { color: #cbd5e0; }

.loader-container, .error-container, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; background: #2d3748; border-radius: 12px; border: 1px solid #4a5568; text-align: center; }
.empty-state h2 { font-size: 1.5rem; color: #ffffff; margin-bottom: 0.5rem; }
.empty-state p { color: #a0aec0; margin-bottom: 1.5rem; }
.loader { border: 4px solid rgba(255, 255, 255, 0.2); border-radius: 50%; border-top: 4px solid #805ad5; width: 40px; height: 40px; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.btn { padding: 0.75rem 1.5rem; border: 1px solid transparent; border-radius: 8px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.3s ease; }
.btn-primary { background: linear-gradient(135deg, #6b46c1, #805ad5); color: white; }
.btn-primary:hover { filter: brightness(1.1); }
.btn-secondary { background-color: #4a5568; color: #e2e8f0; }
.btn-secondary:hover { background-color: #718096; }
.btn-danger { background-color: #c53030; color: white; }
.btn-danger:hover { background-color: #e53e3e; }
.btn-success { background-color: #2f855a; color: white; }
.btn-success:hover { background-color: #38a169; }
.global-error { margin-top: 1rem; }
.alert { padding: 1rem 1.5rem; border-radius: 8px; margin-bottom: 1rem; }
.alert-danger { background-color: #c53030; color: white; }
.alert-success { background-color: #2f855a; color: white; }
.top-notification {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.spinner { width: 20px; height: 20px; border: 2px solid rgba(255, 255, 255, 0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
.success-dialog-body, .confirmation-body { display: flex; flex-direction: column; align-items: center; text-align: center; }
.dialog-icon { margin-bottom: 1rem; }
.dialog-icon.success { color: #38a169; }
.dialog-icon.warning { color: #dd6b20; }
.warning-text { font-size: 0.9rem; color: #a0aec0; margin-top: 0.5rem; }
.summary { background: #1a202c; padding: 1rem; border-radius: 8px; text-align: left; margin-top: 1rem; margin-bottom: 2rem; width: 100%; }
.summary p { margin: 0.5rem 0; color: #e2e8f0; }
.summary strong { color: #a0aec0; }

/* Detail/Update Modal Form Styles */
.detail-form .form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}
.detail-form .form-group {
  display: flex;
  flex-direction: column;
}
.detail-form .form-group label {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #cbd5e0;
}
.detail-form .form-group input,
.detail-form .form-group select {
  background-color: #2d3748;
  color: #e2e8f0;
  border: 1px solid #4a5568;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
}
.detail-form .form-group input:disabled,
.detail-form .form-group select:disabled {
  background-color: #1a202c;
  cursor: not-allowed;
  opacity: 0.7;
}
.detail-form .form-group input.is-invalid,
.detail-form .form-group select.is-invalid {
  border-color: #c53030;
}
.error-text {
  color: #f56565;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}
</style>