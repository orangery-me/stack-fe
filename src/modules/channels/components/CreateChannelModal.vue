<script setup>
import { ref, computed, watch } from "vue";
import StarfieldButton from "@/components/StarfieldButton.vue";
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
    const message = error?.message || "Unable to create channel";
    toast.error(message);

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
  <div
    v-if="isCreateChannelModalOpen"
    class="create-channel-modal"
  >
    <div
      class="create-channel-modal__backdrop"
      @click="closeCreateChannelModal"
    />
    <div class="create-channel-modal__dialog">
      <div class="create-channel-modal__header">
        <h2 class="heading-lg create-channel-modal__title">
          Create new channel
        </h2>
        <button
          type="button"
          class="create-channel-modal__close"
          @click="closeCreateChannelModal"
        >
          ×
        </button>
      </div>
      <p class="create-channel-modal__description">
        Create a channel to organize conversations with your team.
      </p>
      <form
        class="create-channel-modal__form"
        @submit.prevent="handleCreateChannel"
      >
        <div class="form-group">
          <label for="channelName">
            Channel name <span class="required">*</span>
          </label>
          <input
            id="channelName"
            v-model="createChannelForm.name"
            type="text"
            placeholder="e.g. general, marketing, engineering"
            :class="{ error: createChannelErrors.name }"
          >
          <span
            v-if="createChannelErrors.name"
            class="error-message"
          >
            {{ createChannelErrors.name }}
          </span>
        </div>

        <div class="form-group">
          <label for="channelType">
            Channel type <span class="required">*</span>
          </label>
          <select
            id="channelType"
            v-model="createChannelForm.type"
            class="channel-type-select"
            :class="{ error: createChannelErrors.type }"
          >
            <option value="public">
              Public - Anyone in the workspace can join
            </option>
            <option value="private">
              Private - Only people you invite can join
            </option>
          </select>
          <span
            v-if="createChannelErrors.type"
            class="error-message"
          >
            {{ createChannelErrors.type }}
          </span>
        </div>

        <div class="create-channel-modal__actions">
          <StarfieldButton
            variant="outline"
            type="button"
            :disabled="createChannelLoading"
            @click="closeCreateChannelModal"
          >
            Cancel
          </StarfieldButton>
          <StarfieldButton
            variant="primary"
            type="submit"
            :disabled="createChannelLoading"
          >
            {{ createChannelLoading ? "Creating..." : "Create channel" }}
          </StarfieldButton>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./CreateChannelModal.scss"></style>
