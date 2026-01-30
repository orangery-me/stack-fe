import js from "@eslint/js";
import vue from "eslint-plugin-vue";
import tsParser from "@typescript-eslint/parser";
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

    // Browser source code (JS and Vue)
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

    // Vue files with TypeScript: delegate script parsing to TS parser
    {
        files: ["src/**/*.vue"],
        languageOptions: {
            parserOptions: {
                parser: tsParser,
                extraFileExtensions: [".vue"],
            },
        },
    },
];
