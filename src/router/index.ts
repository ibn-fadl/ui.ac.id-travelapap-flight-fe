import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AirplanesView from '../views/AirplanesView.vue'
import FlightsView from '../views/FlightsView.vue'
import BookingsView from '../views/BookingsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/airplanes',
      name: 'airplanes',
      component: AirplanesView,
    },
    {
      path: '/flights',
      name: 'flights',
      component: FlightsView,
    },
    {
      path: '/flights/:id',
      name: 'flight-detail',
      component: () => import('../views/FlightDetailView.vue'),
    },
    {
      path: '/flights/create',
      name: 'create-flight',
      component: () => import('../views/CreateFlightView.vue'),
    },
    {
      path: '/flights/:id/update',
      name: 'update-flight',
      component: () => import('../views/UpdateFlightView.vue'),
    },
    {
      path: '/bookings',
      name: 'bookings',
      component: BookingsView,
    },
    {
      path: '/bookings/:id',
      name: 'booking-detail',
      component: () => import('../views/BookingDetailView.vue'),
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

export default router
