// Flat ESLint config — runs against extension source + tests.
// Purpose: catch undefined references, unused vars, common bugs.
// Intentionally lean — we don't enforce style here.

module.exports = [
  {
    files: ["**/*.js"],
    ignores: [
      "node_modules/**",
      "tests/fixtures/**",
      "icons/**",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        // Browser
        window: "readonly",
        document: "readonly",
        location: "readonly",
        navigator: "readonly",
        console: "readonly",
        fetch: "readonly",
        URLSearchParams: "readonly",
        MutationObserver: "readonly",
        NodeFilter: "readonly",
        Node: "readonly",
        atob: "readonly",
        btoa: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        Promise: "readonly",
        Number: "readonly",
        Math: "readonly",
        Set: "readonly",
        Map: "readonly",

        // Chrome extension APIs
        chrome: "readonly",

        // Service worker (background.js)
        importScripts: "readonly",
        self: "readonly",

        // Node / Jest (tests)
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        process: "readonly",
        global: "readonly",
        Buffer: "readonly",
        describe: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        beforeEach: "readonly",
        afterAll: "readonly",
        afterEach: "readonly",
        jest: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-redeclare": "error",
      "no-dupe-keys": "error",
      "no-unreachable": "error",
      "no-constant-condition": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-prototype-builtins": "warn",
    },
  },

  // background.js — service worker — pulls in lib/scoring.js via
  // importScripts(), which makes top-level function declarations there
  // available as globals in this worker's scope.
  {
    files: ["background.js"],
    languageOptions: {
      globals: {
        scoreCandidates: "readonly",
        deptMatchesSubject: "readonly",
        SUBJECT_TO_DEPT: "readonly",
      },
    },
  },

  // content/adapters/*.js — content scripts share scope with all other files
  // listed in the same content_scripts.js[] entry in manifest.json, loaded in
  // declaration order. name-parser.js loads first, so its functions are
  // globals by the time adapter scripts run.
  {
    files: ["content/adapters/*.js"],
    languageOptions: {
      globals: {
        parseInstructorCell: "readonly",
      },
    },
  },
];
