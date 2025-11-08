import { defineStore } from 'pinia';
import airplaneService from '../services/airplane.service';
import type { AirplaneInterface, CreateAirplaneRequestInterface, UpdateAirplaneRequestInterface } from '../interfaces';

export const useAirplaneStore = defineStore('airplane', {
  state: () => ({
    airplanes: [] as AirplaneInterface[],
    loading: false,
    error: null as string | null,
    searchQuery: '',
    statusFilter: 'all',
    airlineFilter: 'all',
    yearFilter: 'all',
    newlyCreatedAirplane: null as AirplaneInterface | null,
  }),
  getters: {
    uniqueAirlines(state): string[] {
      const airlines = state.airplanes.map(airplane => airplane.airlineId);
      return [...new Set(airlines)];
    },
    uniqueYears(state): number[] {
      const years = state.airplanes.map(airplane => airplane.manufactureYear);
      return [...new Set(years)].sort((a, b) => b - a); // Sort descending
    },
    filteredAirplanes(state): AirplaneInterface[] {
      return state.airplanes.filter(airplane => {
        const matchesSearch = 
          airplane.id.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
          airplane.model.toLowerCase().includes(state.searchQuery.toLowerCase());

        const matchesStatus = 
          state.statusFilter === 'all' || 
          (state.statusFilter === 'active' && !airplane.isDeleted) ||
          (state.statusFilter === 'inactive' && airplane.isDeleted);

        const matchesAirline =
          state.airlineFilter === 'all' || airplane.airlineId === state.airlineFilter;

        const matchesYear =
          state.yearFilter === 'all' || airplane.manufactureYear.toString() === state.yearFilter;

        return matchesSearch && matchesStatus && matchesAirline && matchesYear;
      });
    }
  },
  actions: {
    async fetchAirplanes() {
      this.loading = true;
      this.error = null;
      try {
        const data = await airplaneService.getAllAirplanes();
        this.airplanes = data;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        this.error = 'Failed to fetch airplanes.';
      } finally {
        this.loading = false;
      }
    },
    async createAirplane(data: CreateAirplaneRequestInterface) {
      this.loading = true;
      this.error = null;
      this.newlyCreatedAirplane = null;
try {
        const newAirplane = await airplaneService.createAirplane(data);
        this.newlyCreatedAirplane = newAirplane;
        await this.fetchAirplanes();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to create airplane.';
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async updateAirplane(id: string, data: UpdateAirplaneRequestInterface) {
      this.loading = true;
      this.error = null;
      try {
        const updatedAirplane = await airplaneService.updateAirplane(id, data);
        // Also update the airplane in the main list
        const index = this.airplanes.findIndex(a => a.id === id);
        if (index !== -1) {
          this.airplanes[index] = updatedAirplane;
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to update airplane.';
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async deactivateAirplane(id: string) {
      this.loading = true;
      this.error = null;
      try {
        await airplaneService.deactivateAirplane(id);
        await this.fetchAirplanes(); // Refresh the list
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to deactivate airplane.';
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async activateAirplane(id: string) {
      this.loading = true;
      this.error = null;
      try {
        await airplaneService.activateAirplane(id);
        await this.fetchAirplanes(); // Refresh the list
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to activate airplane.';
        throw err;
      } finally {
        this.loading = false;
      }
    },
    setSearchQuery(query: string) {
      this.searchQuery = query;
    },
    setStatusFilter(status: string) {
      this.statusFilter = status;
    },
    setAirlineFilter(airline: string) {
      this.airlineFilter = airline;
    },
    setYearFilter(year: string) {
      this.yearFilter = year;
    },
  }
});