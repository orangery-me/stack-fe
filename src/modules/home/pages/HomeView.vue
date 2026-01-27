<script setup>
import { ref, onMounted, computed, watch, onActivated } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import workspaceService from "@/services/workspace.service.js";
import CalmButton from "@/components/calm/CalmButton.vue";
import CalmCard from "@/components/calm/CalmCard.vue";
import CalmHeading from "@/components/calm/CalmHeading.vue";
import CreateWorkspaceModal from "@/modules/home/components/CreateWorkspaceModal.vue";

const router = useRouter();
const authStore = useAuthStore();

const workspaces = ref([]);
const loading = ref(false);
const isAuthenticated = computed(() => authStore.isLoggedIn);
const isCreateWorkspaceModalOpen = ref(false);

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

const openCreateWorkspaceModal = () => {
  isCreateWorkspaceModalOpen.value = true;
};

const fetchWorkspaces = async () => {
  if (!isAuthenticated.value) return;

  loading.value = true;
  try {
    workspaces.value = await workspaceService.getMyWorkspaces();
  } catch (error) {
    console.error("Failed to fetch workspaces:", error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (isAuthenticated.value) {
    fetchWorkspaces();
  }
});

// Watch for auth state changes
watch(isAuthenticated, (newVal) => {
  if (newVal) {
    fetchWorkspaces();
  } else {
    workspaces.value = [];
  }
});

// Refresh when component is activated (e.g., coming back from create workspace)
onActivated(() => {
  if (isAuthenticated.value) {
    fetchWorkspaces();
  }
});

const workflowColumns = [
  {
    title: "Global collaboration",
    description:
      "Work across regions, time zones, and 100+ languages, powered by AI in one platform.",
    cta: "Unite your workforce",
    imageUrl:
      "https://p16-hera-sg.larksuitecdn.com/tos-alisg-i-hn4qzgxq2n-sg/a05c3f0a117b4f06b3ba8a9f97102f48.png~tplv-hn4qzgxq2n-png:0:0.png",
  },
  {
    title: "AI-powered workflows",
    description:
      "Automate workflows that use AI to trigger alerts, generate content, and extract insights.",
    cta: "Automate with AI",
    imageUrl:
      "https://p16-hera-sg.larksuitecdn.com/tos-alisg-i-hn4qzgxq2n-sg/44cf80b1bbd24ed8a2755a002d2ea7d7.png~tplv-hn4qzgxq2n-png:0:0.png",
  },
  {
    title: "Smarter meetings",
    description:
      "Turn meetings into action with real-time AI notes and summaries built into every meeting.",
    cta: "Capture meeting insights",
    imageUrl:
      "https://p16-hera-sg.larksuitecdn.com/tos-alisg-i-hn4qzgxq2n-sg/5704209159f746f5bd7a3f765c343442.png~tplv-hn4qzgxq2n-png:0:0.png",
  },
  {
    title: "Frontline operations",
    description:
      "Keep frontline teams connected and acting fast with automatic updates and feedback from HQ.",
    cta: "Connect frontline teams",
    imageUrl:
      "https://p16-hera-sg.larksuitecdn.com/tos-alisg-i-hn4qzgxq2n-sg/e106d3b0976d4cf189486bc65608ff36.png~tplv-hn4qzgxq2n-png:0:0.png",
  },
];

const efficiencyStats = [
  { value: "10x", label: "operational efficiency" },
  { value: "39%", label: "more productive" },
  { value: "70%", label: "cost savings" },
];

const suiteApps = [
  {
    name: "Messenger",
    description: "Teams, tasks, tools in one chat",
    icon: "/icons/messenger.svg",
  },
  {
    name: "Base",
    description: "Build dashboards and workflows without code",
    icon: "/icons/base.svg",
  },
  {
    name: "Approval",
    description: "Automate and track decisions",
    icon: "/icons/approve.svg",
  },
  {
    name: "Docs",
    description: "Create, edit, and share documents",
    icon: "/icons/docs.svg",
  },
  {
    name: "Email",
    description: "Manage team email in one place",
    icon: "/icons/mail.svg",
  },
  {
    name: "Wiki",
    description: "Centralized team knowledge base",
    icon: "/icons/wiki.svg",
  },
  {
    name: "Calendar",
    description: "Schedule and sync across teams",
    icon: "/icons/calendar.svg",
  },
  {
    name: "Meetings",
    description: "Smart, secure video calls",
    icon: "/icons/meeting.svg",
  },
];
</script>

<template>
  <!-- Workspaces Section (if logged in) -->
  <section
    v-if="isAuthenticated"
    class="home-auth"
  >
    <div class="container-center">
      <header class="home-auth__header">
        <CalmHeading :level="1">
          Workspaces
        </CalmHeading>
        <p class="home-auth__subtitle ui-muted">
          Choose where you want to work.
        </p>
      </header>

      <div class="home-auth__grid">
        <CalmCard class="home-auth__card">
          <div class="home-auth__cardHeader">
            <div class="home-auth__cardTitleWrap">
              <h2 class="ui-h3 home-auth__cardTitle">
                My workspaces
              </h2>
              <p class="ui-hint home-auth__cardHint">
                Recent and active work.
              </p>
            </div>
            <CalmButton
              variant="secondary"
              size="sm"
              @click="openCreateWorkspaceModal"
            >
              Create
            </CalmButton>
          </div>

          <div
            v-if="loading"
            class="home-auth__state ui-muted"
          >
            <p>Loading...</p>
          </div>

          <div
            v-else-if="workspaces.length === 0"
            class="home-auth__state"
          >
            <p class="ui-h3 home-auth__emptyTitle">
              No workspaces yet
            </p>
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

          <div
            v-else
            class="home-auth__list"
          >
            <div
              v-for="workspace in workspaces"
              :key="workspace.id"
              class="home-auth__item"
              @click="goToWorkspace(workspace.id)"
            >
              <div
                class="home-auth__avatar"
                aria-hidden="true"
              >
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
            <h3 class="ui-h3 home-auth__sideTitle">
              Get started
            </h3>
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
            <h3 class="ui-h3 home-auth__sideTitle">
              Invite your team
            </h3>
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

  <div
    v-else
    class="home-public"
  >
    <section class="home-hero ui-section">
      <div class="container-center">
        <div class="home-hero__grid">
          <div class="home-hero__text">
            <!-- <div class="home-hero__badge">
              <span class="home-hero__badgeDot" aria-hidden="true" />
              <span>Enterprise Calm UI</span>
            </div> -->

            <CalmHeading
              :level="1"
              class="home-hero__title"
            >
              Workspaces that keep teams aligned
            </CalmHeading>

            <p class="home-hero__desc ui-muted">
              Tasks, channels, docs, and AI — designed to stay calm and usable
              throughout the day.
            </p>

            <div class="home-hero__cta">
              <CalmButton
                variant="primary"
                size="lg"
                @click="goToLogin"
              >
                Sign in
              </CalmButton>
              <CalmButton
                variant="secondary"
                size="lg"
                @click="goToRegister"
              >
                Create account
              </CalmButton>
            </div>
          </div>

          <CalmCard
            padding="lg"
            class="home-hero__preview"
          >
            <div class="home-preview__header">
              <div class="home-preview__title">
                Today
              </div>
              <div class="home-preview__pill">
                Calm
              </div>
            </div>

            <div class="ui-divider" />

            <div class="home-preview__list">
              <div class="home-preview__row">
                <span class="home-preview__dot home-preview__dot--primary" />
                <div class="home-preview__main">
                  <div class="home-preview__rowTitle">
                    Review roadmap
                  </div>
                  <div class="home-preview__rowMeta">
                    In “Product” workspace
                  </div>
                </div>
              </div>
              <div class="home-preview__row">
                <span class="home-preview__dot" />
                <div class="home-preview__main">
                  <div class="home-preview__rowTitle">
                    Draft kickoff notes
                  </div>
                  <div class="home-preview__rowMeta">
                    Docs
                  </div>
                </div>
              </div>
              <div class="home-preview__row">
                <span class="home-preview__dot" />
                <div class="home-preview__main">
                  <div class="home-preview__rowTitle">
                    Summarize updates
                  </div>
                  <div class="home-preview__rowMeta">
                    AI
                  </div>
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

    <!-- Features Section -->

    <!-- Workflow Highlights (placeholder images) -->
    <section class="ui-section home-workflows">
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
            v-for="item in workflowColumns"
            :key="item.title"
            class="home-workflows__card"
          >
            <div
              class="home-workflows__media"
              aria-hidden="true"
            >
              <img
                v-if="item.imageUrl"
                class="home-workflows__img"
                :src="item.imageUrl"
                :alt="item.title"
                loading="lazy"
              >
              <div
                v-else
                class="home-placeholder"
              >
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
              <a
                class="home-link"
                href="#"
              >
                {{ item.cta }} →
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- Efficiency Stats -->
    <section class="ui-section home-metrics">
      <div class="container-center home-metrics__content">
        <div class="home-metrics__copy">
          <CalmHeading :level="1">
            Fewer tools, fewer costs
          </CalmHeading>
          <p class="ui-muted">
            Cut software bloat while keeping teams fast, clear, and connected.
          </p>
          <CalmButton
  class="home-metrics__pillButton"
  variant="secondary"
  size="lg"
>
  Unlock your savings
</CalmButton>
        </div>
        <div class="home-metrics__stats">
          <div
            v-for="stat in efficiencyStats"
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
    <section class="ui-section ui-section--muted home-suite">
      <div class="container-center">
        <div class="home-suite__header">
          <div class="home-suite__titles">
            <CalmHeading :level="1">
              One platform. One subscription. Fully integrated.
            </CalmHeading>
            <p class="ui-muted">
              Replace scattered tools with one unified superapp.
            </p>
            <CalmButton
              class="home-suite__cta"
              variant="primary"
              size="lg"
            >
              Get started for free
            </CalmButton>
          </div>
        </div>

        <div
          class="home-suite__orbit"
          aria-hidden="true"
        >
          <img
            class="home-suite__orbitImg"
            src="https://p16-hera-overseas.larksuitecdn.com/tos-mya-i-lojyj5t9n9/44204f81c7314ba4a0c52b0d690142ec.png~tplv-lojyj5t9n9-png:0:0.png"
            alt="Suite overview"
            loading="lazy"
          >
        </div>

        <div class="home-suite__grid">
          <CalmCard
            v-for="app in suiteApps"
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
              >
              <div
                v-else
                class="home-placeholder home-placeholder--icon"
              >
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

    <!-- CTA Section -->
    <section class="ui-section">
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
            <CalmButton
              variant="primary"
              size="lg"
              @click="goToLogin"
            >
              Sign in
            </CalmButton>
            <CalmButton
              variant="secondary"
              size="lg"
              @click="goToRegister"
            >
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
