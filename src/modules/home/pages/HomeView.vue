<script setup>
import { ref, onMounted, computed, watch, onActivated } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import workspaceService from "@/services/workspace.service.js";
import CalmButton from "@/components/calm/CalmButton.vue";
import CalmCard from "@/components/calm/CalmCard.vue";
import CalmHeading from "@/components/calm/CalmHeading.vue";
import CreateWorkspaceModal from "@/modules/home/components/CreateWorkspaceModal.vue";
import * as HomeConstants from "@/constants/home.constants.js";
import AppLoading from "@/components/loading/AppLoading.vue";

const router = useRouter();
const authStore = useAuthStore();

// State
const workspaces = ref([]);
const loading = ref(false);
const isCreateWorkspaceModalOpen = ref(false);

// Computed
const isAuthenticated = computed(() => authStore.isLoggedIn);

// Navigation methods
const goToLogin = () => {
  router.push("/login");
};

const goToRegister = () => {
  router.push("/register");
};

const goToWorkspace = (workspaceId) => {
  router.push(`/workspaces/${workspaceId}`);
};

const goToInviteMember = (workspaceId) => {
  router.push(`/workspaces/${workspaceId}/invite`);
};

// Modal methods
const openCreateWorkspaceModal = () => {
  isCreateWorkspaceModalOpen.value = true;
};

// Data fetching
const fetchWorkspaces = async () => {
  if (!isAuthenticated.value) return;

  loading.value = true;
  try {
    workspaces.value = await workspaceService.getMyWorkspaces();
  } catch {
    // Toast is shown by the global axios interceptor
  } finally {
    loading.value = false;
  }
};

// Lifecycle hooks
onMounted(() => {
  if (isAuthenticated.value) {
    fetchWorkspaces();
  }
});

watch(isAuthenticated, (newVal) => {
  if (newVal) {
    fetchWorkspaces();
  } else {
    workspaces.value = [];
  }
});

onActivated(() => {
  if (isAuthenticated.value) {
    fetchWorkspaces();
  }
});
</script>

<template>
  <section v-if="isAuthenticated" class="home-auth">
    <div class="container-center">
      <header class="home-auth__header">
        <CalmHeading :level="1"> Workspaces </CalmHeading>
        <p class="home-auth__subtitle ui-muted">
          Choose where you want to work.
        </p>
      </header>

      <div class="home-auth__grid">
        <CalmCard class="home-auth__card">
          <div class="home-auth__cardHeader">
            <div class="home-auth__cardTitleWrap">
              <h2 class="ui-h3 home-auth__cardTitle">My workspaces</h2>
              <p class="ui-hint home-auth__cardHint">Recent and active work.</p>
            </div>
            <CalmButton
              variant="secondary"
              size="sm"
              @click="openCreateWorkspaceModal"
            >
              Create
            </CalmButton>
          </div>

          <div v-if="loading" class="home-auth__state ui-muted">
            <AppLoading
              :active="true"
              variant="inline"
              label="Loading workspaces…"
              min-height="140px"
            />
          </div>

          <div v-else-if="workspaces.length === 0" class="home-auth__state">
            <p class="ui-h3 home-auth__emptyTitle">No workspaces yet</p>
            <p class="ui-muted home-auth__emptyDesc">
              Create a workspace to start working with your team.
            </p>
            <CalmButton
              variant="primary"
              size="md"
              @click="openCreateWorkspaceModal"
            >
              Create workspace
            </CalmButton>
          </div>

          <div v-else class="home-auth__list">
            <div
              v-for="workspace in workspaces"
              :key="workspace.id"
              class="home-auth__item"
              @click="goToWorkspace(workspace.id)"
            >
              <div class="home-auth__avatar" aria-hidden="true">
                {{ workspace.name?.charAt(0)?.toUpperCase() }}
              </div>
              <div class="home-auth__info">
                <div class="home-auth__name">
                  {{ workspace.name }}
                </div>
                <div class="home-auth__meta ui-hint">
                  {{ workspace.slug }}
                </div>
              </div>
              <div class="home-auth__actions">
                <button
                  type="button"
                  class="home-auth__iconBtn ui-focusable"
                  title="Invite members"
                  aria-label="Invite members"
                  @click.stop="goToInviteMember(workspace.id)"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                    <path
                      d="M9 11a4 4 0 100-8 4 4 0 000 8z"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                    <path
                      d="M20 8v6M23 11h-6"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  class="home-auth__iconBtn ui-focusable"
                  title="Open workspace"
                  aria-label="Open workspace"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 12h14"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                    <path
                      d="M13 6l6 6-6 6"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div class="home-auth__footer">
            <p class="ui-hint">
              Need a different account? Sign out and sign in again.
            </p>
          </div>
        </CalmCard>

        <div class="home-auth__side">
          <CalmCard padding="md">
            <h3 class="ui-h3 home-auth__sideTitle">Get started</h3>
            <p class="ui-muted home-auth__sideText">
              Create a workspace, invite people, and start a channel.
            </p>
            <CalmButton
              variant="primary"
              size="md"
              @click="openCreateWorkspaceModal"
            >
              Create workspace
            </CalmButton>
          </CalmCard>

          <CalmCard padding="md">
            <h3 class="ui-h3 home-auth__sideTitle">Invite your team</h3>
            <p class="ui-muted home-auth__sideText">
              Add members when you create a workspace or from the invite page.
            </p>
            <CalmButton
              variant="secondary"
              size="md"
              @click="openCreateWorkspaceModal"
            >
              Invite members
            </CalmButton>
          </CalmCard>
        </div>
      </div>
    </div>
  </section>

  <section v-if="isAuthenticated" class="ui-section home-discover">
    <div class="container-center">
      <div class="home-discover__header">
        <span class="home-discover__sparkle" aria-hidden="true">✶</span>
        <span class="home-discover__label">Discover more</span>
      </div>
      <div class="home-discover__grid">
        <CalmCard
          v-for="card in HomeConstants.DISCOVER_CARDS"
          :key="card.key"
          class="home-discover__card"
        >
          <div class="home-discover__inner">
            <div class="home-discover__text">
              <h3 class="ui-h4 home-discover__title">
                {{ card.title }}
              </h3>
              <p class="ui-muted home-discover__desc">
                {{ card.description }}
              </p>
              <CalmButton variant="secondary" size="sm">
                {{ card.cta }}
              </CalmButton>
            </div>
            <div class="home-discover__media" aria-hidden="true">
              <img
                v-if="card.imageUrl"
                class="home-discover__img"
                :src="card.imageUrl"
                :alt="card.title"
                loading="lazy"
              />
              <div v-else class="home-placeholder">
                Placeholder for illustration
              </div>
            </div>
          </div>
        </CalmCard>
      </div>
    </div>
  </section>

  <div v-if="!isAuthenticated" class="home-public">
    <section v-if="!isAuthenticated" class="home-hero ui-section">
      <div class="container-center">
        <div class="home-hero__grid">
          <div class="home-hero__text">
            <!-- <div class="home-hero__badge">
              <span class="home-hero__badgeDot" aria-hidden="true" />
              <span>Enterprise Calm UI</span>
            </div> -->

            <CalmHeading :level="1" class="home-hero__title">
              Workspaces that keep teams aligned
            </CalmHeading>

            <p class="home-hero__desc ui-muted">
              Tasks, channels, docs, and AI — designed to stay calm and usable
              throughout the day.
            </p>

            <div class="home-hero__cta">
              <CalmButton variant="primary" size="lg" @click="goToLogin">
                Sign in
              </CalmButton>
              <CalmButton variant="secondary" size="lg" @click="goToRegister">
                Create account
              </CalmButton>
            </div>
          </div>

          <CalmCard padding="lg" class="home-hero__preview">
            <div class="home-preview__header">
              <div class="home-preview__title">Today</div>
              <div class="home-preview__pill">Calm</div>
            </div>

            <div class="ui-divider" />

            <div class="home-preview__list">
              <div class="home-preview__row">
                <span class="home-preview__dot home-preview__dot--primary" />
                <div class="home-preview__main">
                  <div class="home-preview__rowTitle">Review roadmap</div>
                  <div class="home-preview__rowMeta">
                    In “Product” workspace
                  </div>
                </div>
              </div>
              <div class="home-preview__row">
                <span class="home-preview__dot" />
                <div class="home-preview__main">
                  <div class="home-preview__rowTitle">Draft kickoff notes</div>
                  <div class="home-preview__rowMeta">Docs</div>
                </div>
              </div>
              <div class="home-preview__row">
                <span class="home-preview__dot" />
                <div class="home-preview__main">
                  <div class="home-preview__rowTitle">Summarize updates</div>
                  <div class="home-preview__rowMeta">AI</div>
                </div>
              </div>
            </div>

            <div class="home-preview__footer ui-hint">
              Preview only — sign in to view your workspaces.
            </div>
          </CalmCard>
        </div>
      </div>
    </section>

    <section id="features" class="ui-section home-workflows">
      <div class="container-center">
        <div class="ui-sectionHeader">
          <CalmHeading :level="1">
            Pick everything you need with Stack
          </CalmHeading>
          <p class="ui-muted">
            A minimal, consistent UI designed for daily work.
          </p>
        </div>
        <div class="home-workflows__grid">
          <article
            v-for="item in HomeConstants.WORKFLOW_COLUMNS"
            :key="item.title"
            class="home-workflows__card"
          >
            <div class="home-workflows__media" aria-hidden="true">
              <img
                v-if="item.imageUrl"
                class="home-workflows__img"
                :src="item.imageUrl"
                :alt="item.title"
                loading="lazy"
              />
              <div v-else class="home-placeholder">
                Placeholder for illustration
              </div>
            </div>
            <div class="home-workflows__body">
              <h3 class="ui-h3">
                {{ item.title }}
              </h3>
              <p class="ui-muted">
                {{ item.description }}
              </p>
              <a class="home-link" href="#"> {{ item.cta }} → </a>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section id="savings" class="ui-section home-metrics">
      <div class="container-center home-metrics__content">
        <div class="home-metrics__copy">
          <CalmHeading :level="1"> Fewer tools, fewer costs </CalmHeading>
          <p class="ui-muted">
            Cut software bloat while keeping teams fast, clear, and connected.
          </p>
          <CalmButton
            class="home-metrics__pillButton"
            variant="secondary"
            size="lg"
            style="margin-top: 30px"
          >
            Unlock your savings
          </CalmButton>
        </div>
        <div class="home-metrics__stats">
          <div
            v-for="stat in HomeConstants.EFFICIENCY_STATS"
            :key="stat.value"
            class="home-metrics__stat"
          >
            <div class="home-metrics__value">
              {{ stat.value }}
            </div>
            <div class="home-metrics__label ui-muted">
              {{ stat.label }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Integrated Suite -->
    <section id="integrations" class="ui-section ui-section--muted home-suite">
      <div class="container-center">
        <div class="home-suite__header">
          <div class="home-suite__titles">
            <CalmHeading :level="1">
              One platform. One subscription. Fully integrated.
            </CalmHeading>
            <p class="ui-muted">
              Replace scattered tools with one unified superapp.
            </p>
            <CalmButton class="home-suite__cta" variant="primary" size="lg">
              Get started for free
            </CalmButton>
          </div>
          <div class="home-suite__orbit" aria-hidden="true">
            <img
              class="home-suite__orbitImg"
              src="https://p16-hera-overseas.larksuitecdn.com/tos-mya-i-lojyj5t9n9/44204f81c7314ba4a0c52b0d690142ec.png~tplv-lojyj5t9n9-png:0:0.png"
              alt="Suite overview"
              loading="lazy"
            />
          </div>
        </div>

        <div class="home-suite__grid">
          <CalmCard
            v-for="app in HomeConstants.SUITE_APPS"
            :key="app.name"
            class="home-suite__card"
          >
            <div class="home-suite__icon">
              <img
                v-if="app.icon"
                class="home-suite__iconImg"
                :src="app.icon"
                :alt="app.name"
                loading="lazy"
              />
              <div v-else class="home-placeholder home-placeholder--icon">
                Icon
              </div>
            </div>
            <h3 class="ui-h4 home-suite__name">
              {{ app.name }}
            </h3>
            <p class="ui-muted home-suite__desc">
              {{ app.description }}
            </p>
          </CalmCard>
        </div>
      </div>
    </section>

    <section v-if="!isAuthenticated" class="ui-section">
      <div class="container-center">
        <div class="home-cta">
          <div class="home-cta__copy">
            <CalmHeading :level="2">
              Start with a brand new workspace
            </CalmHeading>
            <p class="ui-muted">
              Sign in to access your workspaces and start collaborating.
            </p>
          </div>
          <div class="home-cta__actions">
            <CalmButton variant="primary" size="lg" @click="goToLogin">
              Sign in
            </CalmButton>
            <CalmButton variant="secondary" size="lg" @click="goToRegister">
              Create account
            </CalmButton>
          </div>
        </div>
      </div>
    </section>
  </div>

  <CreateWorkspaceModal
    v-model:open="isCreateWorkspaceModalOpen"
    @created="fetchWorkspaces"
  />
</template>

<style scoped lang="scss" src="./HomeView.scss"></style>
