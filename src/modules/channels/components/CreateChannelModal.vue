<script setup>
import { ref, computed, watch } from "vue";
import CalmModal from "@/components/calm/CalmModal.vue";
import CalmButton from "@/components/calm/CalmButton.vue";
import { useToast } from "@/composables/useToast.js";
import { useChannelStore } from "@/modules/channels/stores/channel.store.js";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  workspaceId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["update:open", "created"]);

const toast = useToast();
const channelStore = useChannelStore();

const isCreateChannelModalOpen = computed({
  get() {
    return props.open;
  },
  set(value) {
    emit("update:open", value);
  },
});

const createChannelForm = ref({
  name: "",
  type: "public",
});

const createChannelErrors = ref({});

const createChannelLoading = computed(() => channelStore.createChannelLoading);

const resetCreateChannelForm = () => {
  createChannelForm.value = {
    name: "",
    type: "public",
  };
  createChannelErrors.value = {};
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetCreateChannelForm();
    }
  }
);

const closeCreateChannelModal = () => {
  if (createChannelLoading.value) return;
  isCreateChannelModalOpen.value = false;
};

const validateCreateChannelForm = () => {
  const errors = {};
  const { name, type } = createChannelForm.value;

  if (!name || name.trim().length < 1) {
    errors.name = "Channel name is required";
  } else if (name.length > 255) {
    errors.name = "Channel name must not exceed 255 characters";
  }

  if (!["public", "private"].includes(type)) {
    errors.type = "Please select a valid channel type";
  }

  createChannelErrors.value = errors;
  return Object.keys(errors).length === 0;
};

const handleCreateChannel = async () => {
  if (!validateCreateChannelForm()) return;

  try {
    const channelData = {
      name: createChannelForm.value.name.trim().toLowerCase(),
      type: createChannelForm.value.type,
    };

    const channel = await channelStore.createChannel(
      props.workspaceId,
      channelData
    );

    toast.success("Channel created successfully!");

    emit("created", channel);
    isCreateChannelModalOpen.value = false;
  } catch (error) {
    // Toast is shown by the global axios interceptor
    if (error?.errors && typeof error.errors === "object") {
      createChannelErrors.value = {
        ...createChannelErrors.value,
        ...error.errors,
      };
    }
  }
};
</script>

<template>
  <CalmModal
    v-model:open="isCreateChannelModalOpen"
    title="Create channel"
    :busy="createChannelLoading"
  >
    <p class="create-channel__description">
      Create a channel to organize conversations.
    </p>

    <form
      class="create-channel__form"
      @submit.prevent="handleCreateChannel"
    >
      <div class="calm-field">
        <label for="channelName" class="calm-field__label">
          Channel name <span class="calm-field__required">*</span>
        </label>
        <div class="channel-name-input-wrapper">
          <span class="channel-hashtag-prefix">#</span>
          <input
            id="channelName"
            type="text"
            v-model="createChannelForm.name"
            class="premium-channel-input"
            :class="{ 'calm-input--error': !!createChannelErrors.name }"
            placeholder="e.g. general, marketing, engineering"
            required
            :disabled="createChannelLoading"
            :aria-invalid="!!createChannelErrors.name"
          />
        </div>
        <p v-if="createChannelErrors.name" class="calm-field__error">
          {{ createChannelErrors.name }}
        </p>
      </div>

      <div class="calm-field">
        <label class="calm-field__label">Channel visibility</label>
        <div class="channel-type-cards">
          <div
            class="type-card"
            :class="{ active: createChannelForm.type === 'public' }"
            @click="!createChannelLoading ? createChannelForm.type = 'public' : undefined"
          >
            <div class="card-icon-wrapper public">
              <i class="pi pi-globe" />
            </div>
            <div class="card-info">
              <div class="card-title">Public Channel</div>
              <div class="card-desc">Anyone in the workspace can view, search, and join this channel.</div>
            </div>
            <div class="card-badge">Default</div>
          </div>

          <div
            class="type-card"
            :class="{ active: createChannelForm.type === 'private' }"
            @click="!createChannelLoading ? createChannelForm.type = 'private' : undefined"
          >
            <div class="card-icon-wrapper private">
              <i class="pi pi-lock" />
            </div>
            <div class="card-info">
              <div class="card-title">Private Channel</div>
              <div class="card-desc">Only invited members can view or join. Completely search-hidden.</div>
            </div>
            <div class="card-badge shadow-only">Invite Only</div>
          </div>
        </div>
        <p v-if="createChannelErrors.type" class="calm-field__error">
          {{ createChannelErrors.type }}
        </p>
      </div>
    </form>

    <template #actions>
      <CalmButton
        variant="secondary"
        type="button"
        :disabled="createChannelLoading"
        @click="closeCreateChannelModal"
      >
        Cancel
      </CalmButton>
      <CalmButton
        variant="primary"
        type="submit"
        :loading="createChannelLoading"
        :disabled="createChannelLoading"
        @click="handleCreateChannel"
      >
        Create channel
      </CalmButton>
    </template>
  </CalmModal>
</template>

<style scoped lang="scss" src="./CreateChannelModal.scss"></style>
