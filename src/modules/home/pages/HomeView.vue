<script setup>
import { ref, onMounted, computed, watch, onActivated } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import workspaceService from "@/services/workspace.service.js";
import StarfieldButton from "@/components/StarfieldButton.vue";
import StarfieldCard from "@/components/StarfieldCard.vue";
import GlowText from "@/components/GlowText.vue";
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

const features = [
  {
    icon: "📋",
    title: "Task Management",
    description:
      "Organize and track your work with powerful task management tools.",
  },
  {
    icon: "💬",
    title: "Team Chat",
    description:
      "Real-time communication with your team. Chat in channels, direct messages, and group conversations.",
  },
  {
    icon: "📄",
    title: "Document Collaboration",
    description:
      "Create, share, and collaborate on documents. Work together in real-time with your team.",
  },
  {
    icon: "🤖",
    title: "AI Assistant",
    description:
      "Boost productivity with integrated AI. Get intelligent suggestions and automation.",
  },
];
</script>

<template>
  <!-- Workspaces Section (if logged in) -->
  <section
    v-if="isAuthenticated"
    class="workspaces-section"
  >
    <div class="container-center">
      <div class="workspaces-header">
        <GlowText
          :level="1"
          class="welcome-title"
        >
          Welcome back 👋
        </GlowText>
        <p class="welcome-subtitle">
          Choose a workspace to get started.
        </p>
      </div>

      <div class="workspaces-content">
        <StarfieldCard class="workspaces-card">
          <div class="workspaces-card-header">
            <div class="card-icon">
              📋
            </div>
            <h2 class="card-title heading-lg">
              My workspaces
            </h2>
          </div>

          <div
            v-if="loading"
            class="loading-state"
          >
            <p>Loading...</p>
          </div>

          <div
            v-else-if="workspaces.length === 0"
            class="empty-state"
          >
            <p class="empty-text">
              Ready to launch
            </p>
            <p class="empty-description">
              You don't have any workspaces yet. Create a new workspace to get
              started!
            </p>
          </div>

          <div
            v-else
            class="workspaces-list"
          >
            <div
              v-for="workspace in workspaces"
              :key="workspace.id"
              class="workspace-item"
              @click="goToWorkspace(workspace.id)"
            >
              <div class="workspace-icon">
                {{ workspace.name.charAt(0).toUpperCase() }}
              </div>
              <div class="workspace-info">
                <h3 class="workspace-name">
                  {{ workspace.name }}
                </h3>
                <p class="workspace-meta">
                  {{ workspace.slug }}
                </p>
              </div>
              <div class="workspace-actions">
                <button
                  class="action-btn"
                  title="Invite members"
                  @click.stop="goToInviteMember(workspace.id)"
                >
                  👤
                </button>
                <span class="arrow-icon">→</span>
              </div>
            </div>
          </div>

          <div class="workspaces-footer">
            <button
              class="link-button"
              @click="openCreateWorkspaceModal"
            >
              Create a new workspace
            </button>
            <button class="link-button">
              Not seeing your workspace? Try a different email
            </button>
          </div>
        </StarfieldCard>

        <StarfieldCard class="template-card">
          <div class="template-content">
            <h2 class="template-title heading-lg">
              Get started with a template.
            </h2>
            <p class="template-description">
              Kickstart projects with one click.
            </p>
            <StarfieldButton
              variant="outline"
              size="md"
              class="template-button"
            >
              Browse templates
            </StarfieldButton>
          </div>
        </StarfieldCard>
      </div>
    </div>
  </section>

  <!-- Hero Section (if not logged in) -->
  <section
    v-else
    class="hero-section"
  >
    <div class="container-center">
      <div class="hero-content">
        <div class="hero-text">
          <div class="hero-badge">
            <span class="badge-dot" />
            <span>AI-Powered Workspace</span>
          </div>
          <GlowText
            :level="1"
            class="hero-title"
          >
            Stack - Your
            <span class="gradient-text">AI-Powered</span>
            Workspace
          </GlowText>
          <p class="hero-description">
            Manage tasks, communicate with your team, collaborate on documents,
            and boost productivity with AI. Everything you need to work smarter,
            all in one place.
          </p>
          <div class="hero-cta">
            <StarfieldButton
              variant="primary"
              size="lg"
              @click="goToLogin"
            >
              Get Started
            </StarfieldButton>
          </div>
        </div>
        <div class="hero-visual">
          <div class="cube-container">
            <div class="cube">
              <div class="cube-face cube-face-front">
                <div class="grid-pattern" />
              </div>
              <div class="cube-face cube-face-back">
                <div class="grid-pattern" />
              </div>
              <div class="cube-face cube-face-right">
                <div class="grid-pattern" />
              </div>
              <div class="cube-face cube-face-left">
                <div class="grid-pattern" />
              </div>
              <div class="cube-face cube-face-top">
                <div class="grid-pattern" />
              </div>
              <div class="cube-face cube-face-bottom">
                <div class="grid-pattern" />
              </div>
            </div>
            <div class="glow-orb glow-orb-1" />
            <div class="glow-orb glow-orb-2" />
            <div class="glow-orb glow-orb-3" />
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section
    id="features"
    class="features-section"
  >
    <div class="container-center">
      <div class="section-header">
        <h2 class="section-title heading-lg">
          Everything You Need to Work Better
        </h2>
        <p class="section-description">
          Task management, team communication, document collaboration, and AI
          assistance - all in one powerful platform
        </p>
      </div>
      <div class="features-grid">
        <StarfieldCard
          v-for="(feature, index) in features"
          :key="index"
          class="feature-card"
        >
          <div class="feature-icon">
            {{ feature.icon }}
          </div>
          <h3 class="feature-title">
            {{ feature.title }}
          </h3>
          <p class="feature-description">
            {{ feature.description }}
          </p>
        </StarfieldCard>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="cta-section">
    <div class="container-center">
      <div class="cta-content">
        <h2 class="cta-title heading-lg">
          Ready to Transform Your Workflow?
        </h2>
        <p class="cta-description">
          Join teams who are already using Stack to manage tasks, communicate
          better, and work smarter with AI.
        </p>
        <div class="cta-buttons">
          <StarfieldButton
            variant="primary"
            size="lg"
            @click="goToLogin"
          >
            Get Started Free
          </StarfieldButton>
        </div>
      </div>
    </div>
  </section>

  <CreateWorkspaceModal
    v-model:open="isCreateWorkspaceModalOpen"
    @created="fetchWorkspaces"
  />
</template>

<style scoped lang="scss" src="./HomeView.scss"></style>
