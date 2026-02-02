<script setup lang="ts">
import { EditorContent, Editor } from "@tiptap/vue-3";

// props
const props = defineProps({
  editor: {
    type: Editor,
    required: true,
  },
});
</script>

<template>
  <div class="simple-editor">
    <!-- Toolbar -->
    <div
      v-if="editor"
      class="toolbar"
    >
      <button
        :class="{ active: editor.isActive('bold') }"
        @click="editor.chain().focus().toggleBold().run()"
      >
        B
      </button>

      <button
        :class="{ active: editor.isActive('italic') }"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        I
      </button>

      <button @click="editor.chain().focus().toggleStrike().run()">
        S
      </button>

      <button @click="editor.chain().focus().toggleHeading({ level: 1 }).run()">
        H1
      </button>
      <button @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">
        H2
      </button>

      <button @click="editor.chain().focus().toggleBulletList().run()">
        • List
      </button>

      <button @click="editor.chain().focus().toggleOrderedList().run()">
        1. List
      </button>

      <button @click="editor.chain().focus().toggleBlockquote().run()">
        ❝
      </button>

      <button @click="editor.chain().focus().undo().run()">
        Undo
      </button>
      <button @click="editor.chain().focus().redo().run()">
        Redo
      </button>
    </div>

    <!-- Editor -->
    <EditorContent
      :editor="props.editor"
      class="editor-content"
    />
  </div>
</template>

<style scoped>
.simple-editor {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.toolbar {
  display: flex;
  gap: 6px;
  padding: 8px;
  border-bottom: 1px solid #e5e7eb;
}

button {
  padding: 4px 8px;
  border-radius: 4px;
}

button.active {
  background: #111827;
  color: white;
}

.editor-content {
  padding: 16px;
  min-height: 150px;
}
</style>
