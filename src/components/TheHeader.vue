<script setup>
import { ref, computed } from 'vue';
import { useRouter } from "vue-router";
import { useAuthStore } from '@/modules/auth/stores/auth.store.js';
import StarfieldButton from "@/components/StarfieldButton.vue";

const router = useRouter();
const authStore = useAuthStore();
const title = 'Stack';

const mobileMenu = ref(null);
const mobileMenuBtn = ref(null);

const isAuthenticated = computed(() => authStore.isLoggedIn);
const userName = computed(() => authStore.userName || authStore.userEmail);

const toggleMobileMenu = () => {
	if (mobileMenu.value) {
		mobileMenu.value.classList.toggle('active');
	}
};

const closeMobileMenu = () => {
	if (mobileMenu.value) {
		mobileMenu.value.classList.remove('active');
	}
};

const handleLogout = async () => {
	await authStore.logout();
	router.push('/login');
};

const goToLogin = () => {
	router.push('/login');
};
</script>

<template>
  <nav class="starfield-navbar">
    <div class="container-center">
      <div class="navbar-content">
        <!-- Logo -->
        <router-link
          :to="{ name: 'home' }"
          class="navbar-logo"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="#B8A7FF"
              stroke-width="2"
              fill="none"
              opacity="0.5"
            />
            <circle
              cx="16"
              cy="16"
              r="8"
              stroke="#B8A7FF"
              stroke-width="1"
              fill="none"
              opacity="0.3"
            />
            <circle
              cx="16"
              cy="16"
              r="2"
              fill="#B8A7FF"
            />
          </svg>
          <span class="logo-text">{{ title }}</span>
        </router-link>

        <!-- Desktop Navigation -->
        <div class="navbar-nav-desktop">
          <router-link
            :to="{ name: 'home' }"
            class="nav-link"
            :class="{ 'nav-link--active': router.currentRoute.value.name === 'home' }"
          >
            Home
          </router-link>
          <a
            href="#features"
            class="nav-link"
          >Features</a>
          <a
            href="#about"
            class="nav-link"
          >About</a>
        </div>

        <!-- CTA Button / User Menu -->
        <div class="navbar-cta">
          <template v-if="isAuthenticated">
            <div class="user-menu">
              <span class="user-name">{{ userName }}</span>
              <StarfieldButton
                variant="outline"
                size="sm"
                @click="handleLogout"
              >
                Sign out
              </StarfieldButton>
            </div>
          </template>
          <template v-else>
            <StarfieldButton
              variant="primary"
              size="md"
              @click="goToLogin"
            >
              Sign in
            </StarfieldButton>
          </template>
        </div>

        <!-- Mobile Menu Button -->
        <button
          ref="mobileMenuBtn"
          class="mobile-menu-btn"
          @click="toggleMobileMenu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      <!-- Mobile Navigation -->
      <div
        ref="mobileMenu"
        class="navbar-nav-mobile"
      >
        <router-link
          :to="{ name: 'home' }"
          class="nav-link-mobile"
          @click="closeMobileMenu"
        >
          Home
        </router-link>
        <a
          href="#features"
          class="nav-link-mobile"
          @click="closeMobileMenu"
        >Features</a>
        <a
          href="#about"
          class="nav-link-mobile"
          @click="closeMobileMenu"
        >About</a>
        <template v-if="isAuthenticated">
          <div class="nav-link-mobile user-info-mobile">
            <span>{{ userName }}</span>
          </div>
          <button
            class="nav-link-mobile logout-btn-mobile"
            @click="handleLogout"
          >
            Đăng xuất
          </button>
        </template>
        <template v-else>
          <router-link
            to="/login"
            class="nav-link-mobile"
            @click="closeMobileMenu"
          >
            Đăng nhập
          </router-link>
        </template>
      </div>
    </div>
  </nav>
</template>


<style scoped lang="scss">
.starfield-navbar {
	background: rgba(0, 0, 0, 0.6);
	backdrop-filter: blur(20px);
	border-bottom: 1px solid rgba(184, 167, 255, 0.2);
	padding: 1rem 0;
	position: sticky;
	top: 0;
	z-index: 1000;
	box-shadow: 0 0 20px rgba(184, 167, 255, 0.1);
}

.navbar-content {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 2rem;
}

.navbar-logo {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	text-decoration: none;
	color: #F1F5F9;
	font-family: 'JetBrains Mono', monospace;
	font-weight: 700;
	font-size: 1.5rem;
	letter-spacing: 0.05em;
	transition: all 0.3s ease;
	
	&:hover {
		text-shadow: 0 0 20px rgba(184, 167, 255, 0.5);
		transform: scale(1.05);
	}
	
	.logo-text {
		background: linear-gradient(135deg, #F1F5F9 0%, #B8A7FF 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
}

.navbar-nav-desktop {
	display: none;
	align-items: center;
	gap: 2rem;
	
	@media (min-width: 768px) {
		display: flex;
	}
}

.nav-link {
	color: #F1F5F9;
	text-decoration: none;
	font-weight: 300;
	font-size: 1rem;
	padding: 0.5rem 0;
	position: relative;
	transition: all 0.3s ease;
	
	&::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		width: 0;
		height: 1px;
		background: #B8A7FF;
		transition: width 0.3s ease;
		box-shadow: 0 0 10px #B8A7FF;
	}
	
	&:hover::after,
	&--active::after {
		width: 100%;
	}
	
	&:hover {
		color: #B8A7FF;
		text-shadow: 0 0 10px rgba(184, 167, 255, 0.5);
	}
	
	&--active {
		color: #B8A7FF;
	}
}

.navbar-cta {
	display: none;
	
	@media (min-width: 768px) {
		display: block;
	}
}

.mobile-menu-btn {
	display: block;
	background: transparent;
	border: 1px solid rgba(184, 167, 255, 0.3);
	border-radius: 2px;
	padding: 0.5rem;
	color: #F1F5F9;
	cursor: pointer;
	transition: all 0.3s ease;
	
	&:hover {
		border-color: #B8A7FF;
		box-shadow: 0 0 10px rgba(184, 167, 255, 0.3);
	}
	
	@media (min-width: 768px) {
		display: none;
	}
}

.navbar-nav-mobile {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	margin-top: 1rem;
	padding-top: 1rem;
	border-top: 1px solid rgba(184, 167, 255, 0.2);
	max-height: 0;
	overflow: hidden;
	transition: max-height 0.3s ease;
	
	&.active {
		max-height: 500px;
	}
	
	@media (min-width: 768px) {
		display: none;
	}
}

.nav-link-mobile {
	color: #F1F5F9;
	text-decoration: none;
	font-weight: 300;
	padding: 0.75rem 1rem;
	border-radius: 2px;
	transition: all 0.3s ease;
	
	&:hover {
		background: rgba(184, 167, 255, 0.1);
		color: #B8A7FF;
		padding-left: 1.5rem;
	}
}

.user-menu {
	display: flex;
	align-items: center;
	gap: 1rem;
}

.user-name {
	color: #F1F5F9;
	font-size: 0.875rem;
	font-weight: 300;
	font-family: 'Merriweather', serif;
	
	@media (max-width: 767px) {
		display: none;
	}
}

.user-info-mobile {
	color: rgba(241, 245, 249, 0.7);
	font-size: 0.875rem;
	cursor: default;
	
	&:hover {
		background: transparent;
		padding-left: 1rem;
		color: rgba(241, 245, 249, 0.7);
	}
}

.logout-btn-mobile {
	background: none;
	border: none;
	color: #F1F5F9;
	text-decoration: none;
	font-weight: 300;
	padding: 0.75rem 1rem;
	border-radius: 2px;
	transition: all 0.3s ease;
	cursor: pointer;
	width: 100%;
	text-align: left;
	font-family: 'Merriweather', serif;
	
	&:hover {
		background: rgba(184, 167, 255, 0.1);
		color: #B8A7FF;
		padding-left: 1.5rem;
	}
}
</style>