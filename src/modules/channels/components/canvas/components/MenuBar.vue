<script>
import { Editor } from "@tiptap/vue-3";

export default {
  name: "MenuBar",
  props: {
    editor: {
      type: Editor,
      default: null,
    },
  },
};
</script>
<template>
  <div v-if="editor" class="menu-bar">
    <div class="menu-group">
      <!-- Headings -->
      <button
        :class="[
          'menu-btn',
          { active: editor.isActive('heading', { level: 1 }) },
        ]"
        @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
      >
        H1
      </button>
      <button
        :class="[
          'menu-btn',
          { active: editor.isActive('heading', { level: 2 }) },
        ]"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        H2
      </button>
      <button
        :class="[
          'menu-btn',
          { active: editor.isActive('heading', { level: 3 }) },
        ]"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        H3
      </button>

      <div class="divider" />

      <!-- Text style -->
      <button
        :class="['menu-btn', { active: editor.isActive('paragraph') }]"
        @click="editor.chain().focus().setParagraph().run()"
      >
        P
      </button>
      <button
        :class="['menu-btn', { active: editor.isActive('bold') }]"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <b>B</b>
      </button>
      <button
        :class="['menu-btn', { active: editor.isActive('italic') }]"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <i>I</i>
      </button>
      <button
        :class="['menu-btn', { active: editor.isActive('strike') }]"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        S
      </button>
      <button
        :class="['menu-btn', { active: editor.isActive('highlight') }]"
        @click="editor.chain().focus().toggleHighlight().run()"
      >
        H
      </button>

      <div class="divider" />

      <!-- Align -->
      <button
        :class="[
          'menu-btn',
          { active: editor.isActive({ textAlign: 'left' }) },
        ]"
        @click="editor.chain().focus().setTextAlign('left').run()"
      >
        ⬅
      </button>
      <button
        :class="[
          'menu-btn',
          { active: editor.isActive({ textAlign: 'center' }) },
        ]"
        @click="editor.chain().focus().setTextAlign('center').run()"
      >
        ⬍
      </button>
      <button
        :class="[
          'menu-btn',
          { active: editor.isActive({ textAlign: 'right' }) },
        ]"
        @click="editor.chain().focus().setTextAlign('right').run()"
      >
        ➡
      </button>
      <button
        :class="[
          'menu-btn',
          { active: editor.isActive({ textAlign: 'justify' }) },
        ]"
        @click="editor.chain().focus().setTextAlign('justify').run()"
      >
        ☰
      </button>
    </div>
  </div>
</template>
