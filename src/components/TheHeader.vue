<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import CalmButton from "@/components/calm/CalmButton.vue";

const router = useRouter();
const authStore = useAuthStore();

const mobileMenu = ref(null);
const userMenuOpen = ref(false);

const isAuthenticated = computed(() => authStore.isLoggedIn);
const userName = computed(() => authStore.userName || authStore.userEmail);

const toggleMobileMenu = () => {
  if (mobileMenu.value) mobileMenu.value.classList.toggle("active");
};

const closeMobileMenu = () => {
  if (mobileMenu.value) mobileMenu.value.classList.remove("active");
};

const toggleUserMenu = () => {
  userMenuOpen.value = !userMenuOpen.value;
};

const closeUserMenu = () => {
  userMenuOpen.value = false;
};

const handleLogout = async () => {
  closeUserMenu();
  await authStore.logout();
  router.push("/login");
};

const goToLogin = () => router.push("/login");
const goToRegister = () => router.push("/register");
</script>

<template>
  <nav class="app-header">
    <div class="container-center">
      <div class="app-header__row">
        <router-link
          :to="{ name: 'home' }"
          class="app-header__brand"
        >
          <img
            class="app-header__logo"
            src="/logos/stack-logo.jpg"
            alt="Stack"
          >
          <span class="app-header__name">Stack</span>
        </router-link>

        <div class="app-header__nav">
          <router-link
            class="app-header__navLink"
            :to="{ name: 'home', hash: '#features' }"
          >
            Features
          </router-link>
          <router-link
            class="app-header__navLink"
            :to="{ name: 'home', hash: '#savings' }"
          >
            Savings
          </router-link>
          <router-link
            class="app-header__navLink"
            :to="{ name: 'home', hash: '#integrations' }"
          >
            Integrations
          </router-link>
        </div>

        <div class="app-header__actions">
          <template v-if="isAuthenticated">
            <div class="app-header__userMenu">
              <button
                type="button"
                class="app-header__userTrigger ui-focusable"
                @click="toggleUserMenu"
              >
                <span class="app-header__user">
                  {{ userName }}
                </span>
                <svg
                  class="app-header__userCaret"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>

              <div
                v-if="userMenuOpen"
                class="app-header__userDropdown"
              >
                <button
                  type="button"
                  class="app-header__userItem app-header__userItem--danger"
                  @click="handleLogout"
                >
                  Sign out
                </button>
              </div>
            </div>
          </template>
          <template v-else>
            <CalmButton
              variant="ghost"
              size="sm"
              @click="goToRegister"
            >
              Create account
            </CalmButton>
            <CalmButton
              variant="primary"
              size="sm"
              @click="goToLogin"
            >
              Sign in
            </CalmButton>
          </template>
        </div>

        <button
          class="app-header__mobileToggle ui-focusable"
          type="button"
          aria-label="Open menu"
          @click="toggleMobileMenu"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <div
        ref="mobileMenu"
        class="app-header__mobileMenu"
      >
        <router-link
          :to="{ name: 'home' }"
          class="app-header__mobileLink"
          @click="closeMobileMenu"
        >
          Home
        </router-link>
        <router-link
          :to="{ name: 'home', hash: '#features' }"
          class="app-header__mobileLink"
          @click="closeMobileMenu"
        >
          Features
        </router-link>
        <router-link
          :to="{ name: 'home', hash: '#savings' }"
          class="app-header__mobileLink"
          @click="closeMobileMenu"
        >
          Savings
        </router-link>
        <router-link
          :to="{ name: 'home', hash: '#integrations' }"
          class="app-header__mobileLink"
          @click="closeMobileMenu"
        >
          Integrations
        </router-link>

        <template v-if="isAuthenticated">
          <div class="app-header__mobileMeta">
            Signed in as <strong>{{ userName }}</strong>
          </div>
          <button
            type="button"
            class="app-header__mobileLink"
            @click="handleLogout"
          >
            Sign out
          </button>
        </template>
        <template v-else>
          <button
            type="button"
            class="app-header__mobileLink"
            @click="goToRegister"
          >
            Create account
          </button>
          <button
            type="button"
            class="app-header__mobileLink"
            @click="goToLogin"
          >
            Sign in
          </button>
        </template>
      </div>
    </div>
  </nav>
</template>

<style scoped lang="scss">
.app-header {
  height: 64px;
  display: flex;
  align-items: center;
  background: #ffffff;
  border-bottom: 1px solid var(--ui-divider);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.app-header__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-16);
  height: 64px;
}

.app-header__brand {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  color: var(--ui-text);
}

.app-header__logo {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  object-fit: contain;
}

.app-header__name {
  font-weight: 600;
  font-size: 15px;
  line-height: 1.3;
}

.app-header__nav {
  display: none;

  @media (min-width: 768px) {
    display: flex;
    align-items: center;
    gap: var(--space-16);
  }
}

.app-header__navLink {
  font-size: 14px;
  font-weight: 600;
  color: var(--ui-text-muted);
  padding: var(--space-8) var(--space-8);
  border-radius: 10px;
  transition: background var(--ui-duration) var(--ui-ease),
    color var(--ui-duration) var(--ui-ease);

  &:hover {
    background: var(--gray-50);
    color: var(--ui-text);
  }
}

.app-header__actions {
  display: none;

  @media (min-width: 768px) {
    display: flex;
    align-items: center;
    gap: var(--space-12);
  }
}

.app-header__user {
  font-size: 12px;
  color: var(--ui-text-muted);
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-header__userMenu {
  position: relative;
}

.app-header__userTrigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-4);
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--ui-text);
  cursor: pointer;
  font-size: 12px;

  &:hover {
    background: var(--gray-50);
    border-color: var(--ui-divider);
  }
}

.app-header__userCaret {
  color: var(--ui-text-hint);
}

.app-header__userDropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  min-width: 160px;
  padding: var(--space-4);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
  border: 1px solid var(--ui-divider);
  z-index: 20;
}

.app-header__userItem {
  width: 100%;
  text-align: left;
  padding: 6px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: var(--gray-50);
  }
}

.app-header__userItem--danger {
  color: #b91c1c;
}

.app-header__mobileToggle {
  display: block;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--ui-divider);
  background: #ffffff;
  color: var(--ui-text);
  cursor: pointer;
  transition: background var(--ui-duration) var(--ui-ease),
    border-color var(--ui-duration) var(--ui-ease);

  &:hover {
    background: var(--gray-50);
    border-color: var(--ui-border);
  }

  @media (min-width: 768px) {
    display: none;
  }
}

.app-header__mobileMenu {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  margin-top: var(--space-8);
  padding: var(--space-12) 0;
  border-top: 1px solid var(--ui-divider);
  max-height: 0;
  overflow: hidden;
  transition: max-height var(--ui-duration) var(--ui-ease);

  &.active {
    max-height: 500px;
  }

  @media (min-width: 768px) {
    display: none;
  }
}

.app-header__mobileLink {
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--space-12) var(--space-12);
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--ui-text);
  cursor: pointer;

  &:hover {
    background: var(--gray-100);
  }
}

.app-header__mobileMeta {
  padding: 0 var(--space-12);
  font-size: 12px;
  color: var(--ui-text-muted);
}
</style>

