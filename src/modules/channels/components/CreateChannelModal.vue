<script setup>
import { ref, computed, watch } from "vue";
import CalmModal from "@/components/calm/CalmModal.vue";
import CalmButton from "@/components/calm/CalmButton.vue";
import CalmInput from "@/components/calm/CalmInput.vue";
import CalmSelect from "@/components/calm/CalmSelect.vue";
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
const typeOptions = [
  { value: "public", label: "Public — anyone in the workspace can join" },
  { value: "private", label: "Private — invite only" },
];

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
    <p class="create-channel__description ui-muted">
      Create a channel to organize conversations.
    </p>

    <form class="create-channel__form" @submit.prevent="handleCreateChannel">
      <CalmInput
        id="channelName"
        v-model="createChannelForm.name"
        label="Channel name"
        placeholder="e.g. general, marketing, engineering"
        :required="true"
        :error="createChannelErrors.name"
      />

      <CalmSelect
        id="channelType"
        v-model="createChannelForm.type"
        label="Channel type"
        :required="true"
        :options="typeOptions"
        :error="createChannelErrors.type"
      />
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
