import js from "@eslint/js";
import vue from "eslint-plugin-vue";
import globals from "globals";

export default [
    js.configs.recommended,

    ...vue.configs["flat/recommended"],

    // Node config files
    {
        files: ["vite.config.*"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },

    // Browser source code
    {
        files: ["src/**/*.{js,vue}"],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            "vue/multi-word-component-names": "off",
        },
    },
];
