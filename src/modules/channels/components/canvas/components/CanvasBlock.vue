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

  emits: [
    "update:content",
    "add-after",
    "focus-prev",
    "focus-next",
    "delete",
    "merge-with-prev",
    "split-block",
  ],

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
     * Loại bỏ newline
     */
    normalizeContent(content) {
      if (!content) return "";
      return content.replace(/\u200B/g, "").replace(/\n/g, "");
    },

    /**
     * Kiểm tra xem content có thực sự rỗng không (sau khi normalize)
     */
    isEmptyContent(content) {
      return !content || this.normalizeContent(content) === "";
    },

    /**
     * Kiểm tra xem con trỏ có đang ở đầu dòng (block) không
     */
    isAtStartOfLine() {
      const el = this.$refs.input;
      if (!el) return false;
      if (document.activeElement !== el) return false;

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;

      const range = sel.getRangeAt(0);

      // Chỉ xử lý khi selection đang "collapsed" (1 con trỏ, không bôi đen)
      if (!range.collapsed) return false;

      // Ensure selection nằm trong el
      const { startContainer } = range;
      if (!el.contains(startContainer)) return false;

      // Tạo range từ đầu el -> tới vị trí con trỏ hiện tại
      const preRange = document.createRange();
      preRange.selectNodeContents(el);
      preRange.setEnd(range.startContainer, range.startOffset);

      // Lấy text trước con trỏ
      // Nếu = "" nghĩa là con trỏ đang ở đầu block (đầu dòng)
      const textBeforeCursor = preRange.toString();

      return textBeforeCursor.replace(/\u200B/g, "").trim().length === 0;
    },

    /**
     * Lấy content trước và sau cursor
     * @returns { before: string, after: string } hoặc null nếu không thể lấy
     */
    getContentBeforeAndAfterCursor() {
      const el = this.$refs.input;
      if (!el) return null;
      if (document.activeElement !== el) return null;

      try {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;

        const range = selection.getRangeAt(0);
        if (!range.collapsed) return null; // Chỉ xử lý khi cursor collapsed

        // Tạo range từ đầu element đến cursor
        const beforeRange = document.createRange();
        beforeRange.selectNodeContents(el);
        beforeRange.setEnd(range.startContainer, range.startOffset);
        const before = beforeRange.toString().replace(/\u200B/g, "");

        // Tạo range từ cursor đến cuối element
        const afterRange = document.createRange();
        afterRange.selectNodeContents(el);
        afterRange.setStart(range.startContainer, range.startOffset);
        const after = afterRange.toString().replace(/\u200B/g, "");

        return { before, after };
      } catch (err) {
        console.warn("Error getting content before/after cursor:", err);
        return null;
      }
    },

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

    /**
     * Focus element và đặt cursor ở cuối dòng
     */
    focusElAtEnd() {
      const el = this.$refs.input;
      if (!el) return;

      el.focus();

      // Đặt cursor ở cuối dòng
      this.$nextTick(() => {
        try {
          const selection = window.getSelection();
          const range = document.createRange();

          // Nếu element có text node, đặt cursor ở cuối text node
          if (el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {
            const textNode = el.firstChild;
            const textLength = textNode.textContent?.length || 0;
            range.setStart(textNode, textLength);
            range.setEnd(textNode, textLength);
          } else {
            // Nếu không có text node, đặt cursor ở cuối element
            range.selectNodeContents(el);
            range.collapse(false); // collapse về cuối
          }

          selection?.removeAllRanges();
          selection?.addRange(range);
        } catch (err) {
          // Fallback: chỉ focus nếu có lỗi
          console.warn("Failed to set cursor at end:", err);
        }
      });
    },

    /**
     * Focus element và đặt cursor ở vị trí offset
     * @param offset - vị trí offset cần đặt cursor
     */
    focusElAtOffset(offset) {
      const el = this.$refs.input;
      if (!el) return;

      el.focus();

      this.$nextTick(() => {
        try {
          const selection = window.getSelection();
          const range = document.createRange();

          const textNode = el.firstChild;
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            const safeOffset = Math.min(
              offset,
              textNode.textContent?.length ?? 0
            );
            range.setStart(textNode, safeOffset);
            range.setEnd(textNode, safeOffset);
          } else {
            range.selectNodeContents(el);
            range.collapse(false);
          }

          selection?.removeAllRanges();
          selection?.addRange(range);
        } catch (err) {
          console.warn("Failed to set cursor at offset:", err);
        }
      });
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
      const rawValue = e.target.innerText ?? "";
      // normalize để loại bỏ whitespace & newline
      const value = this.normalizeContent(rawValue);
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

        const contentSplit = this.getContentBeforeAndAfterCursor();
        if (!contentSplit) return;

        const { before, after } = contentSplit;
        const normalizedBefore = this.normalizeContent(before);
        const normalizedAfter = this.normalizeContent(after);

        const el = this.$refs.input;
        if (el) {
          el.innerText = normalizedBefore;
        }

        this.localContent = normalizedBefore;
        this.$emit("update:content", normalizedBefore);

        this.$emit("split-block", {
          before: normalizedBefore,
          after: normalizedAfter,
        });

        return;
      }
      // Nếu nhấn Backspace và content rỗng, xóa block
      if (e.key === "Backspace" && this.isEmptyContent(this.localContent)) {
        e.preventDefault();
        // Focus block trước đó
        this.$emit("focus-prev");
        // Xóa block
        this.$emit("delete");
        return;
      }
      // Nếu nhấn Backspace và con trỏ ở đầu dòng, xóa block, nối block sau vào block hiện tại
      if (e.key === "Backspace" && this.isAtStartOfLine()) {
        e.preventDefault();
        // Nối block sau vào block hiện tại
        this.$emit("merge-with-prev");
        return;
      }
      // Nếu nhấn mũi tên hướng lên, focus block trước đó
      if (e.key === "ArrowUp") {
        e.preventDefault();
        this.$emit("focus-prev");
        return;
      }
      // Nếu nhấn mũi tên hướng xuống, focus block sau đó
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.$emit("focus-next");
        return;
      }
    },
    onFocus() {
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
