<script setup>
const props = defineProps({
  workspaceInitials: {
    type: String,
    default: "W",
  },
  currentUserInitials: {
    type: String,
    default: "U",
  },
  unreadCount: {
    type: Number,
    default: 0,
  },
  isAiOpen: {
    type: Boolean,
    default: false,
  },
  isDmOpen: {
    type: Boolean,
    default: false,
  },
  activeRouteName: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["home", "dms", "files", "activity", "ai"]);

const ADMIN_APP_URL = "https://stack-admin-bay.vercel.app/";

const isActive = (name) => props.activeRouteName === name;

const openAdminApp = () => {
  window.open(ADMIN_APP_URL, "_blank", "noopener,noreferrer");
};
</script>

<template>
  <div class="icon-menu-bar">
    <div class="icon-menu-header">
      <div class="workspace-logo">
        <span>{{ workspaceInitials }}</span>
      </div>
    </div>

    <div class="icon-menu-items">
      <button
        class="icon-menu-item"
        :class="{ active: isActive('workspaceDetail') }"
        title="Home"
        type="button"
        @click="emit('home')"
      >
        <span class="icon-wrap">
          <i
            class="pi pi-home icon-menu-svg"
            aria-hidden="true"
          />
        </span>
        <span class="icon-menu-label">Home</span>
      </button>

      <button
        class="icon-menu-item"
        :class="{ active: isDmOpen }"
        title="DMs"
        type="button"
        @click="emit('dms')"
      >
        <span class="icon-wrap">
          <i
            class="pi pi-comments icon-menu-svg"
            aria-hidden="true"
          />
        </span>
        <span class="icon-menu-label">DMs</span>
      </button>

      <button
        class="icon-menu-item"
        title="Activity"
        type="button"
        @click="emit('activity')"
      >
        <span class="icon-wrap">
          <i
            class="pi pi-bell icon-menu-svg"
            aria-hidden="true"
          />
        </span>
        <span
          v-if="unreadCount > 0"
          class="notification-badge"
        >
          {{ unreadCount > 99 ? "99+" : unreadCount }}
        </span>
        <span class="icon-menu-label">Activity</span>
      </button>

      <button
        class="icon-menu-item"
        :class="{ active: isActive('workspaceFiles') }"
        title="Files"
        type="button"
        @click="emit('files')"
      >
        <span class="icon-wrap">
          <i
            class="pi pi-folder icon-menu-svg"
            aria-hidden="true"
          />
        </span>
        <span class="icon-menu-label">Files</span>
      </button>

      <button
        class="icon-menu-item"
        :class="{ active: isAiOpen }"
        title="AI Assistant"
        type="button"
        @click="emit('ai')"
      >
        <span class="icon-wrap">
          <i
            class="pi pi-sparkles icon-menu-svg"
            aria-hidden="true"
          />
        </span>
        <span class="icon-menu-label">AI</span>
      </button>

      <button
        class="icon-menu-item"
        title="More"
        type="button"
      >
        <span class="icon-wrap">
          <i
            class="pi pi-ellipsis-h icon-menu-svg"
            aria-hidden="true"
          />
        </span>
        <span class="icon-menu-label">More</span>
      </button>

      <button
        class="icon-menu-item"
        title="Admin"
        type="button"
        @click="openAdminApp"
      >
        <span class="icon-wrap">
          <i
            class="pi pi-cog icon-menu-svg"
            aria-hidden="true"
          />
        </span>
        <span class="icon-menu-label">Admin</span>
      </button>
    </div>

    <div class="icon-menu-footer">
      <div class="profile-icon">
        {{ currentUserInitials }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.icon-menu-bar {
  background: var(--gray-100);
  border-right: 1px solid var(--ui-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-12) 0;
  gap: var(--space-12);
  overflow-y: auto;
}

.icon-menu-header {
  .workspace-logo {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--primary-100);
    border: 1px solid rgba(233, 92, 71, 0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    color: var(--primary-600);
    font-size: 12px;
    cursor: pointer;
    transition: background var(--ui-duration) var(--ui-ease),
      border-color var(--ui-duration) var(--ui-ease);

    &:hover {
      background: rgba(233, 92, 71, 0.12);
      border-color: rgba(233, 92, 71, 0.28);
    }
  }
}

.icon-menu-items {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  flex: 1;
}

.icon-menu-item {
  width: 52px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 3px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--gray-700);
  cursor: pointer;
  border-radius: 10px;
  position: relative;
  transition:
    background var(--ui-duration) var(--ui-ease),
    color var(--ui-duration) var(--ui-ease);

  .icon-wrap {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    transition: background var(--ui-duration) var(--ui-ease),
      box-shadow var(--ui-duration) var(--ui-ease);
  }

  .icon-menu-svg {
    width: 20px;
    height: 20px;
    opacity: 1;
    font-size: 20px;
  }

  &:hover:not(.active) {
    background: transparent;
    border-color: transparent; /* no outline around label */
    color: var(--gray-900);

    .icon-wrap {
      background: rgba(31, 26, 23, 0.06);
    }
  }

  &.active {
    /* Active không đổi màu text/label, chỉ đổi background icon */
    background: transparent;
    border-color: transparent;
    color: var(--gray-900);
    box-shadow: none;

    .icon-wrap {
      background: var(--ui-bg-surface);
      box-shadow:
        0 0 0 1px rgba(31, 26, 23, 0.08),
        0 8px 18px rgba(31, 26, 23, 0.12);
    }

    .icon-menu-svg {
      color: var(--primary-500);
    }
  }

  .notification-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 16px;
    height: 16px;
    background: var(--error);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    color: #FFFDFB;
    border: 2px solid var(--gray-100);
  }
}

.icon-menu-label {
  font-size: 10px;
  line-height: 1.2;
  font-weight: 600;
  margin-top: 8px;
  color: currentColor;
}

.icon-menu-footer {
  .profile-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--primary-100);
    border: 1px solid rgba(233, 92, 71, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    color: var(--primary-600);
    font-size: 12px;
    cursor: pointer;
    transition: background var(--ui-duration) var(--ui-ease),
      border-color var(--ui-duration) var(--ui-ease),
      color var(--ui-duration) var(--ui-ease);

    &:hover {
      background: var(--primary-200);
      border-color: rgba(233, 92, 71, 0.3);
      color: var(--primary-600);
    }
  }
}
</style>
