<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Globe2, Link2, Search, Trash2, UserRound, X } from "lucide-vue-next";
import canvasService, {
  type CanvasPermissionItem,
  type CanvasPermissionList,
  type CanvasShareRole,
} from "@/services/canvas.service";
import workspaceService from "@/services/workspace.service";

type WorkspaceMember = {
  id: string;
  userId: string;
  email: string;
  name: string;
  avatar?: string | null;
};

type ChannelItem = {
  id: string;
  name?: string;
  title?: string;
};

const props = defineProps<{
  open: boolean;
  canvasId: string;
  canvasTitle: string;
  workspaceId?: string;
  owner?: {
    id?: string;
    name?: string;
    avatar?: string | null;
  };
  currentUser?: {
    userId?: string;
    name?: string;
    email?: string;
    avatar?: string | null;
  } | null;
  channels?: ChannelItem[];
}>();

const emit = defineEmits<{
  close: [];
}>();

const permissions = ref<CanvasPermissionList | null>(null);
const workspaceMembers = ref<WorkspaceMember[]>([]);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const copied = ref(false);

const peopleQuery = ref("");
const selectedMember = ref<WorkspaceMember | null>(null);
const peopleRole = ref<CanvasShareRole>("viewer");

const channelQuery = ref("");
const selectedChannel = ref<ChannelItem | null>(null);
const channelRole = ref<CanvasShareRole>("viewer");

const generalEnabled = computed(() => permissions.value?.generalAccess?.enabled ?? false);
const generalRole = computed<CanvasShareRole>(() => permissions.value?.generalAccess?.role ?? "viewer");

const shareUrl = computed(() => `${window.location.origin}/canvas/${props.canvasId}/edit`);

const ownerName = computed(() => props.owner?.name || props.currentUser?.name || "Owner");
const ownerAvatar = computed(() => props.owner?.avatar || props.currentUser?.avatar || null);

const peopleResults = computed(() => {
  const q = peopleQuery.value.trim().toLowerCase();
  if (!q) return [];
  return workspaceMembers.value
    .filter((member) => {
      const haystack = `${member.name || ""} ${member.email || ""}`.toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, 6);
});

const channelResults = computed(() => {
  const q = channelQuery.value.trim().toLowerCase();
  if (!q) return [];
  return (props.channels || [])
    .filter((channel) => (channel.name || channel.title || "").toLowerCase().includes(q))
    .slice(0, 6);
});

function roleLabel(role: CanvasShareRole) {
  return role === "editor" ? "Write" : "Read";
}

function roleApiLabel(role: CanvasShareRole) {
  return role === "editor" ? "Writer" : "Reader";
}

function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name[0].toUpperCase();
}

async function loadShareState() {
  if (!props.open || !props.canvasId) return;

  try {
    loading.value = true;
    errorMessage.value = "";
    const [permissionData, members] = await Promise.all([
      canvasService.getCanvasPermissions(props.canvasId),
      props.workspaceId ? workspaceService.getWorkspaceMembers(props.workspaceId) : Promise.resolve([]),
    ]);
    permissions.value = permissionData;
    workspaceMembers.value = members as WorkspaceMember[];
  } catch {
    errorMessage.value = "Failed to load sharing settings.";
  } finally {
    loading.value = false;
  }
}

async function shareWithSelectedMember() {
  if (!selectedMember.value) return;

  try {
    saving.value = true;
    errorMessage.value = "";
    permissions.value = await canvasService.shareCanvasWithUser(props.canvasId, {
      email: selectedMember.value.email,
      role: peopleRole.value,
    });
    selectedMember.value = null;
    peopleQuery.value = "";
    peopleRole.value = "viewer";
  } catch {
    errorMessage.value = "Failed to share with this person.";
  } finally {
    saving.value = false;
  }
}

async function shareWithSelectedChannel() {
  if (!selectedChannel.value) return;

  try {
    saving.value = true;
    errorMessage.value = "";
    permissions.value = await canvasService.shareCanvasWithChannel(props.canvasId, {
      channelId: selectedChannel.value.id,
      role: channelRole.value,
    });
    selectedChannel.value = null;
    channelQuery.value = "";
    channelRole.value = "viewer";
  } catch {
    errorMessage.value = "Failed to share with this channel.";
  } finally {
    saving.value = false;
  }
}

async function updateGeneralAccess(enabled: boolean, role = generalRole.value) {
  try {
    saving.value = true;
    errorMessage.value = "";
    permissions.value = await canvasService.updateCanvasVisibility(props.canvasId, {
      visibility: enabled ? "public-workspace" : "private",
      role,
    });
  } catch {
    errorMessage.value = "Failed to update general access.";
  } finally {
    saving.value = false;
  }
}

function handleGeneralModeChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  void updateGeneralAccess(value === "public-workspace");
}

function handleGeneralRoleChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as CanvasShareRole;
  void updateGeneralAccess(true, value);
}

async function removePermission(permission: CanvasPermissionItem) {
  try {
    saving.value = true;
    errorMessage.value = "";
    permissions.value = await canvasService.removeCanvasPermission(props.canvasId, permission.id);
  } catch {
    errorMessage.value = "Failed to remove access.";
  } finally {
    saving.value = false;
  }
}

async function copyLink() {
  await navigator.clipboard.writeText(shareUrl.value);
  copied.value = true;
  window.setTimeout(() => {
    copied.value = false;
  }, 1600);
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      void loadShareState();
    }
  },
  { immediate: true },
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="canvas-share-backdrop"
      @click.self="emit('close')"
    >
      <section
        class="canvas-share-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Share canvas"
      >
        <header class="canvas-share-header">
          <h2>Share "{{ canvasTitle || "Untitled" }}"</h2>
          <button
            type="button"
            class="canvas-share-icon-btn"
            aria-label="Close"
            @click="emit('close')"
          >
            <X :size="20" />
          </button>
        </header>

        <div
          v-if="loading"
          class="canvas-share-loading"
        >
          Loading...
        </div>

        <template v-else>
          <p
            v-if="errorMessage"
            class="canvas-share-error"
          >
            {{ errorMessage }}
          </p>

          <div class="canvas-share-input-grid">
            <div class="canvas-share-picker">
              <Search :size="17" />
              <input
                v-model="peopleQuery"
                type="text"
                placeholder="Add people by name or email"
                @input="selectedMember = null"
              >
              <select v-model="peopleRole">
                <option value="viewer">Read</option>
                <option value="editor">Write</option>
              </select>
              <button
                type="button"
                :disabled="!selectedMember || saving"
                @click="shareWithSelectedMember"
              >
                Share
              </button>
              <div
                v-if="peopleResults.length && !selectedMember"
                class="canvas-share-results"
              >
                <button
                  v-for="member in peopleResults"
                  :key="member.id"
                  type="button"
                  @click="
                    selectedMember = member;
                    peopleQuery = `${member.name} (${member.email})`;
                  "
                >
                  <span>{{ member.name || member.email }}</span>
                  <small>{{ member.email }}</small>
                </button>
              </div>
            </div>

            <div class="canvas-share-picker">
              <Search :size="17" />
              <input
                v-model="channelQuery"
                type="text"
                placeholder="Share with a channel"
                @input="selectedChannel = null"
              >
              <select v-model="channelRole">
                <option value="viewer">Read</option>
                <option value="editor">Write</option>
              </select>
              <button
                type="button"
                :disabled="!selectedChannel || saving"
                @click="shareWithSelectedChannel"
              >
                Share
              </button>
              <div
                v-if="channelResults.length && !selectedChannel"
                class="canvas-share-results"
              >
                <button
                  v-for="channel in channelResults"
                  :key="channel.id"
                  type="button"
                  @click="
                    selectedChannel = channel;
                    channelQuery = `#${channel.name || channel.title || 'Channel'}`;
                  "
                >
                  <span>#{{ channel.name || channel.title || "Channel" }}</span>
                  <small>Channel</small>
                </button>
              </div>
            </div>
          </div>

          <h3>People with access</h3>
          <div class="canvas-share-access-list">
            <div class="canvas-share-access-row">
              <div
                class="canvas-share-avatar"
                :style="{ backgroundImage: ownerAvatar ? `url(${ownerAvatar})` : undefined }"
              >
                <span v-if="!ownerAvatar">{{ getInitials(ownerName) }}</span>
              </div>
              <div class="canvas-share-access-main">
                <strong>{{ ownerName }} (owner)</strong>
                <span>{{ currentUser?.email || "" }}</span>
              </div>
              <span class="canvas-share-muted">Owner</span>
            </div>

            <div
              v-for="permission in permissions?.items || []"
              :key="permission.id"
              class="canvas-share-access-row"
            >
              <div class="canvas-share-avatar canvas-share-avatar--plain">
                <UserRound
                  v-if="permission.type === 'user'"
                  :size="18"
                />
                <span v-else>#</span>
              </div>
              <div class="canvas-share-access-main">
                <strong>{{ permission.type === "channel" ? `#${permission.label}` : permission.label }}</strong>
                <span>{{ permission.type === "channel" ? "Channel access" : "Direct access" }}</span>
              </div>
              <span class="canvas-share-role">{{ roleApiLabel(permission.role) }}</span>
              <button
                type="button"
                class="canvas-share-icon-btn"
                title="Remove access"
                :disabled="saving"
                @click="removePermission(permission)"
              >
                <Trash2 :size="16" />
              </button>
            </div>
          </div>

          <h3>General access</h3>
          <div class="canvas-share-general">
            <div class="canvas-share-avatar canvas-share-avatar--workspace">
              <Globe2 :size="20" />
            </div>
            <div class="canvas-share-general-main">
              <select
                :value="generalEnabled ? 'public-workspace' : 'private'"
                :disabled="saving"
                @change="handleGeneralModeChange"
              >
                <option value="private">Restricted</option>
                <option value="public-workspace">Anyone in this workspace with the link</option>
              </select>
              <span>
                {{
                  generalEnabled
                    ? "Workspace members with the link can access this canvas."
                    : "Only people and channels with access can open this canvas."
                }}
              </span>
            </div>
            <select
              :value="generalRole"
              :disabled="!generalEnabled || saving"
              @change="handleGeneralRoleChange"
            >
              <option value="viewer">Read</option>
              <option value="editor">Write</option>
            </select>
          </div>

          <footer class="canvas-share-footer">
            <button
              type="button"
              class="canvas-share-copy-btn"
              @click="copyLink"
            >
              <Link2 :size="17" />
              {{ copied ? "Copied" : "Copy link" }}
            </button>
            <button
              type="button"
              class="canvas-share-done-btn"
              @click="emit('close')"
            >
              Done
            </button>
          </footer>
        </template>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.canvas-share-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(17, 24, 39, 0.48);
}

.canvas-share-dialog {
  width: min(760px, 100%);
  max-height: min(820px, calc(100vh - 48px));
  overflow: auto;
  border-radius: 8px;
  background: #fff;
  color: #1f2937;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.26);
  padding: 28px 32px 24px;
}

.canvas-share-header,
.canvas-share-access-row,
.canvas-share-general,
.canvas-share-footer,
.canvas-share-picker {
  display: flex;
  align-items: center;
}

.canvas-share-header {
  gap: 16px;
  justify-content: space-between;
}

.canvas-share-header h2 {
  margin: 0;
  font-size: 28px;
  line-height: 1.25;
  font-weight: 500;
}

.canvas-share-icon-btn {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #4b5563;
  cursor: pointer;
}

.canvas-share-icon-btn:hover {
  background: #f3f4f6;
}

.canvas-share-input-grid {
  display: grid;
  gap: 12px;
  margin: 24px 0 28px;
}

.canvas-share-picker {
  position: relative;
  gap: 10px;
  min-height: 48px;
  padding: 0 10px 0 14px;
  border: 1px solid #2563eb;
  border-radius: 6px;
}

.canvas-share-picker input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  font-size: 15px;
}

.canvas-share-picker select,
.canvas-share-general select {
  min-height: 34px;
  border: 0;
  background: transparent;
  color: #111827;
  font-size: 14px;
}

.canvas-share-picker button,
.canvas-share-done-btn {
  min-height: 34px;
  border: 0;
  border-radius: 18px;
  background: #2563eb;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  padding: 0 16px;
  cursor: pointer;
}

.canvas-share-picker button:disabled,
.canvas-share-icon-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.canvas-share-results {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  z-index: 2;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12);
}

.canvas-share-results button {
  display: flex;
  width: 100%;
  height: auto;
  min-height: 48px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  border-radius: 0;
  background: transparent;
  color: #111827;
  text-align: left;
}

.canvas-share-results button:hover {
  background: #f9fafb;
}

.canvas-share-results small,
.canvas-share-access-main span,
.canvas-share-general-main span,
.canvas-share-muted {
  color: #6b7280;
}

.canvas-share-dialog h3 {
  margin: 24px 0 12px;
  font-size: 18px;
  font-weight: 600;
}

.canvas-share-access-list {
  display: grid;
  gap: 8px;
}

.canvas-share-access-row {
  gap: 14px;
  min-height: 52px;
}

.canvas-share-avatar {
  display: flex;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #dbeafe center / cover;
  color: #1d4ed8;
  font-weight: 700;
}

.canvas-share-avatar--plain {
  background: #eef2ff;
  color: #3730a3;
}

.canvas-share-avatar--workspace {
  background: #dcfce7;
  color: #166534;
}

.canvas-share-access-main,
.canvas-share-general-main {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.canvas-share-access-main strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.canvas-share-role {
  color: #374151;
  font-size: 14px;
}

.canvas-share-general {
  gap: 14px;
  padding: 6px 0 18px;
}

.canvas-share-general-main select {
  width: fit-content;
  max-width: 100%;
  font-weight: 600;
}

.canvas-share-footer {
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
}

.canvas-share-copy-btn {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  gap: 10px;
  border: 1px solid #d1d5db;
  border-radius: 21px;
  background: #fff;
  color: #1d4ed8;
  font-weight: 600;
  padding: 0 18px;
  cursor: pointer;
}

.canvas-share-error {
  margin: 16px 0 0;
  color: #b91c1c;
}

.canvas-share-loading {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

@media (max-width: 640px) {
  .canvas-share-backdrop {
    align-items: stretch;
    padding: 12px;
  }

  .canvas-share-dialog {
    max-height: calc(100vh - 24px);
    padding: 22px 18px;
  }

  .canvas-share-header h2 {
    font-size: 22px;
  }

  .canvas-share-picker,
  .canvas-share-general,
  .canvas-share-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .canvas-share-picker select,
  .canvas-share-picker button,
  .canvas-share-general select,
  .canvas-share-done-btn,
  .canvas-share-copy-btn {
    width: 100%;
  }
}
</style>
