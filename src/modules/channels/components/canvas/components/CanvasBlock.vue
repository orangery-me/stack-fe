<script>
export default {
  name: "CanvasBlock",
  props: {
    block: {
      type: Object,
      required: true,
      // { id, type: 'paragraph' | 'heading1' | 'heading2' | 'heading3', content }
    },
    placeholder: {
      type: String,
      default: "",
    },
    autoFocus: {
      type: Boolean,
      default: false,
    },
  },

  emits: ["update:content", "add-after", "focus-prev", "delete"],

  data() {
    return {
      localContent: this.block?.content ?? "",
      localPlaceholder: this.autoFocus ? this.placeholder : "",
    };
  },

  watch: {
    "block.content"(val) {
      const next = val ?? "";
      if (next === this.localContent) return;
      this.localContent = next;
      const el = this.$refs.input;
      if (el && document.activeElement !== el) {
        el.innerText = next;
      }
    },
  },

  mounted() {
    this.$nextTick(() => {
      this.syncContentToEl();
      if (this.autoFocus) this.focusEl();
    });
  },

  methods: {
    /**
     * Sync nội dung từ block (param) sang contenteditable element.
     */
    syncContentToEl() {
      const el = this.$refs.input;
      if (!el) return;
      // mới sync nội dung, chưa sync style
      const target = this.block?.content ?? "";
      if (el.innerText !== target) el.innerText = target;
      this.localContent = target;
    },

    focusEl() {
      const el = this.$refs.input;
      if (el) el.focus();
    },

    getTag() {
      const map = {
        paragraph: "p",
        heading1: "h1",
        heading2: "h2",
        heading3: "h3",
      };
      return map[this.block?.type] || "p";
    },

    getInputClass() {
      const base = "canvas-block-input";
      const size = {
        paragraph: "canvas-block-paragraph",
        heading1: "canvas-block-h1",
        heading2: "canvas-block-h2",
        heading3: "canvas-block-h3",
      };
      return [base, size[this.block?.type] || size.paragraph];
    },

    /**
     * Handle input event from the contenteditable element.
     */
    onInput(e) {
      const value = e.target.innerText ?? "";
      // cập nhập local content và emit event để cập nhật content trong block
      this.localContent = value;
      this.$emit("update:content", value);
    },

    /**
     * Handle keydown event from the contenteditable element. (Enter và Backspace)
     */
    onKeydown(e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        // Thêm block mới sau khi nhấn Enter
        this.$emit("add-after");
        return;
      }
      if (e.key === "Backspace" && this.localContent === "") {
        e.preventDefault();
        // Focus block trước đó
        console.log("onKeydown: Backspace");
        this.$emit("delete");
        this.$emit("focus-prev");
        return;
      }
    },
    onFocus () {
      this.localPlaceholder = this.placeholder;
    },
    onBlur() {
      this.localPlaceholder = "";
    },
  },
};
</script>

<template>
  <div class="canvas-block">
    <component
      :is="getTag()"
      ref="input"
      :contenteditable="true"
      :class="getInputClass()"
      :data-placeholder="localPlaceholder"
      spellcheck="false"
      @focus="onFocus"
      @blur="onBlur"
      @input="onInput"
      @keydown="onKeydown"
    />
  </div>
</template>

<style scoped lang="scss">
.canvas-block {
  margin-bottom: 2px;
}

.canvas-block-input {
  outline: none;
  width: 100%;
  min-height: 1.5em;
  padding: 2px 0;
  background: transparent;
  border: none;
  word-wrap: break-word;
  white-space: pre-wrap;

  &:empty::before {
    content: attr(data-placeholder);
    color: var(--ui-text-hint, #94a3b8);
    pointer-events: none;
  }
}

.canvas-block-paragraph {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ui-text);
}

.canvas-block-h1 {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--ui-text);
}

.canvas-block-h2 {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--ui-text);
}

.canvas-block-h3 {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--ui-text);
}
</style>
