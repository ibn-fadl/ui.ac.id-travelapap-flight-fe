<script setup lang="ts">
import { ref } from 'vue';

const isMenuOpen = ref(false);

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};
</script>

<template>
  <nav class="navbar">
    <div class="navbar-container">
      <div class="navbar-brand">
        <router-link to="/">
          <img src="@/assets/images/fasilkom.png" alt="Fasilkom Logo" class="navbar-logo" />
          <span>TravelAPAP</span>
        </router-link>
      </div>
      <div class="navbar-menu" :class="{ 'is-active': isMenuOpen }">
        <router-link to="/" class="navbar-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span>Home</span>
        </router-link>
        <router-link to="/airplanes" class="navbar-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path></svg>
          <span>Airplanes</span>
        </router-link>
        <router-link to="/flights" class="navbar-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05a2.12 2.12 0 0 0-3.03 0l-9.5 9.5a2.12 2.12 0 0 0 3.03 3.03l9.5-9.5a2.12 2.12 0 0 0 0-3.03z"></path><path d="M12.5 11.5 2.5 21.5"></path><path d="m12 1-1.25 1.25"></path><path d="m15 4-1.25 1.25"></path><path d="m18 7-1.25 1.25"></path><path d="m3 21 1.5-1.5"></path></svg>
          <span>Flights</span>
        </router-link>
        <router-link to="/bookings" class="navbar-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path><path d="M13 5v2"></path><path d="M13 17v2"></path><path d="M13 11v2"></path></svg>
          <span>Bookings</span>
        </router-link>
      </div>
      <div class="navbar-burger" :class="{ 'is-active': isMenuOpen }" @click="toggleMenu">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  background: rgba(45, 55, 72, 0.7);
  backdrop-filter: blur(10px);
  padding: 1rem 2rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.navbar-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.navbar-brand a {
  color: white;
  font-weight: bold;
  font-size: 1.5rem;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.navbar-logo {
  height: 40px;
  width: auto;
}

.navbar-menu {
  display: flex;
  gap: 0.5rem; /* Reduced gap */
}

.navbar-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: white;
  text-decoration: none;
  font-size: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: background-color 0.3s, transform 0.2s;
}

.navbar-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.router-link-exact-active {
  background-color: rgba(255, 255, 255, 0.2);
  font-weight: 600;
}

.navbar-brand .router-link-exact-active {
  background-color: transparent;
  font-weight: bold; /* Keep original font-weight */
}

.navbar-burger {
  display: none;
  cursor: pointer;
  width: 28px;
  height: 28px;
  position: relative;
}

.navbar-burger span {
  display: block;
  width: 25px;
  height: 3px;
  background-color: white;
  transition: all 0.3s ease-in-out;
  position: absolute;
  left: 0;
}

.navbar-burger span:nth-child(1) {
  top: 5px;
}

.navbar-burger span:nth-child(2) {
  top: 12px;
}

.navbar-burger span:nth-child(3) {
  top: 19px;
}

.navbar-burger.is-active span:nth-child(1) {
  transform: rotate(45deg);
  top: 12px;
}

.navbar-burger.is-active span:nth-child(2) {
  opacity: 0;
}

.navbar-burger.is-active span:nth-child(3) {
  transform: rotate(-45deg);
  top: 12px;
}

@media (max-width: 768px) {
  .navbar-menu {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #5a4bff, #7d6bff);
    flex-direction: column;
    padding: 1rem;
    text-align: center;
    gap: 1rem;
  }

  .navbar-menu.is-active {
    display: flex;
  }

  .navbar-burger {
    display: block;
  }
}
</style>
