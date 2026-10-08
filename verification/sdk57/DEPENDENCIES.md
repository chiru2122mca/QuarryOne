# SDK 57 dependency changes

Versions below are package.json ranges and npm lockfile resolved versions. Expo selected the SDK-matched ranges via `expo install expo@^57.0.0 --fix`; no React Native versions were guessed.

## Changed direct dependency ranges

| Package | Before range | After range | Before resolved | After resolved |
| --- | --- | --- | --- | --- |
| expo | ~55.0.31 | ~57.0.26 | 55.0.31 | 57.0.26 |
| expo-constants | ~55.0.17 | ~57.0.20 | 55.0.17 | 57.0.20 |
| expo-device | ~55.0.21 | ~57.0.2 | 55.0.21 | 57.0.2 |
| expo-font | ~55.0.8 | ~57.0.4 | 55.0.8 | 57.0.4 |
| expo-glass-effect | ~55.0.11 | ~57.0.4 | 55.0.11 | 57.0.4 |
| expo-image | ~55.0.11 | ~57.0.5 | 55.0.11 | 57.0.5 |
| expo-linking | ~55.0.17 | ~57.0.11 | 55.0.17 | 57.0.11 |
| expo-router | ~55.0.18 | ~57.0.24 | 55.0.18 | 57.0.24 |
| expo-splash-screen | ~55.0.25 | ~57.0.9 | 55.0.25 | 57.0.9 |
| expo-status-bar | ~55.0.6 | ~57.0.1 | 55.0.6 | 57.0.1 |
| expo-symbols | ~55.0.9 | ~57.0.3 | 55.0.9 | 57.0.3 |
| expo-system-ui | ~55.0.22 | ~57.0.4 | 55.0.22 | 57.0.4 |
| expo-web-browser | ~55.0.20 | ~57.0.3 | 55.0.20 | 57.0.3 |
| react | 19.2.0 | 19.2.3 | 19.2.0 | 19.2.3 |
| react-dom | 19.2.0 | 19.2.3 | 19.2.0 | 19.2.3 |
| react-native | 0.83.10 | 0.86.3 | 0.83.10 | 0.86.3 |
| react-native-gesture-handler | ~2.30.0 | ~2.32.0 | 2.30.1 | 2.32.0 |
| react-native-reanimated | 4.2.1 | 4.5.1 | 4.2.1 | 4.5.1 |
| react-native-safe-area-context | ~5.6.2 | ~5.7.0 | 5.6.2 | 5.7.0 |
| react-native-screens | ~4.23.0 | ~4.26.0 | 4.23.0 | 4.26.2 |
| react-native-worklets | 0.7.4 | 0.10.1 | 0.7.4 | 0.10.1 |
| eslint-config-expo | ~55.0.0 | ~57.0.2 | 55.0.1 | 57.0.2 |
| typescript | ~5.9.2 | ~6.0.3 | 5.9.3 | 6.0.3 |

## Complete transitive/lockfile changes

Every npm lockfile package path whose version changed, including added and removed entries. Multiple paths for a package indicate distinct installed instances. Full structured data is in `lockfile-changes.json`.

| Package path | Before | After |
| --- | --- | --- |
| node_modules/@babel/highlight | 7.25.9 | — |
| node_modules/@babel/highlight/node_modules/ansi-styles | 3.2.1 | — |
| node_modules/@babel/highlight/node_modules/chalk | 2.4.2 | — |
| node_modules/@babel/highlight/node_modules/color-convert | 1.9.3 | — |
| node_modules/@babel/highlight/node_modules/color-name | 1.1.3 | — |
| node_modules/@babel/highlight/node_modules/escape-string-regexp | 1.0.5 | — |
| node_modules/@babel/highlight/node_modules/has-flag | 3.0.0 | — |
| node_modules/@babel/highlight/node_modules/supports-color | 5.5.0 | — |
| node_modules/@babel/plugin-syntax-async-generators | 7.8.4 | — |
| node_modules/@babel/plugin-syntax-bigint | 7.8.3 | — |
| node_modules/@babel/plugin-syntax-class-properties | 7.12.13 | — |
| node_modules/@babel/plugin-syntax-class-static-block | 7.14.5 | — |
| node_modules/@babel/plugin-syntax-import-attributes | 7.29.7 | — |
| node_modules/@babel/plugin-syntax-import-meta | 7.10.4 | — |
| node_modules/@babel/plugin-syntax-json-strings | 7.8.3 | — |
| node_modules/@babel/plugin-syntax-logical-assignment-operators | 7.10.4 | — |
| node_modules/@babel/plugin-syntax-numeric-separator | 7.10.4 | — |
| node_modules/@babel/plugin-syntax-object-rest-spread | 7.8.3 | — |
| node_modules/@babel/plugin-syntax-optional-catch-binding | 7.8.3 | — |
| node_modules/@babel/plugin-syntax-private-property-in-object | 7.14.5 | — |
| node_modules/@babel/plugin-syntax-top-level-await | 7.14.5 | — |
| node_modules/@babel/plugin-transform-arrow-functions | 7.27.1 | 7.29.7 |
| node_modules/@babel/plugin-transform-class-properties | 7.27.1 | 7.29.7 |
| node_modules/@babel/plugin-transform-classes | 7.28.4 | 7.29.7 |
| node_modules/@babel/plugin-transform-computed-properties | 7.29.7 | — |
| node_modules/@babel/plugin-transform-function-name | 7.29.7 | — |
| node_modules/@babel/plugin-transform-literals | 7.29.7 | — |
| node_modules/@babel/plugin-transform-nullish-coalescing-operator | 7.27.1 | 7.29.7 |
| node_modules/@babel/plugin-transform-numeric-separator | 7.29.7 | — |
| node_modules/@babel/plugin-transform-optional-chaining | 7.27.1 | 7.29.7 |
| node_modules/@babel/plugin-transform-shorthand-properties | 7.27.1 | 7.29.7 |
| node_modules/@babel/plugin-transform-spread | 7.29.8 | — |
| node_modules/@babel/plugin-transform-sticky-regex | 7.29.7 | — |
| node_modules/@babel/plugin-transform-template-literals | 7.27.1 | 7.29.7 |
| node_modules/@babel/plugin-transform-unicode-regex | 7.27.1 | 7.29.7 |
| node_modules/@babel/preset-react | 7.29.7 | — |
| node_modules/@babel/preset-typescript | 7.27.1 | 7.29.7 |
| node_modules/@eslint/eslintrc/node_modules/argparse | 2.0.1 | — |
| node_modules/@eslint/eslintrc/node_modules/js-yaml | 4.3.2 | — |
| node_modules/@expo/config | 55.0.21 | 57.0.9 |
| node_modules/@expo/config-plugins | 55.0.11 | 57.0.9 |
| node_modules/@expo/config-plugins/node_modules/@babel/code-frame | 7.10.4 | — |
| node_modules/@expo/config-plugins/node_modules/@expo/json-file | 10.0.16 | — |
| node_modules/@expo/config-types | 55.0.6 | 57.0.2 |
| node_modules/@expo/devtools | 55.0.3 | 57.0.1 |
| node_modules/@expo/dom-webview | 55.0.6 | 57.0.1 |
| node_modules/@expo/expo-modules-macros-plugin | — | 0.6.1 |
| node_modules/@expo/fingerprint | 0.16.8 | 0.20.13 |
| node_modules/@expo/image-utils | 0.8.17 | 0.11.5 |
| node_modules/@expo/inline-modules | — | 0.1.7 |
| node_modules/@expo/json-file | 10.2.0 | 11.0.1 |
| node_modules/@expo/local-build-cache-provider | 55.0.16 | 57.0.8 |
| node_modules/@expo/log-box | 55.0.13 | 57.0.4 |
| node_modules/@expo/metro | 55.1.2 | 56.0.2 |
| node_modules/@expo/metro-config | — | 57.0.12 |
| node_modules/@expo/metro-file-map | — | 57.0.3 |
| node_modules/@expo/metro-runtime | 55.0.12 | 57.0.16 |
| node_modules/@expo/metro/node_modules/metro-config | — | 0.84.5 |
| node_modules/@expo/metro/node_modules/metro-runtime | — | 0.84.5 |
| node_modules/@expo/package-manager/node_modules/@expo/json-file | 11.0.1 | — |
| node_modules/@expo/plist | 0.5.4 | 0.8.1 |
| node_modules/@expo/prebuild-config | 55.0.22 | 57.0.16 |
| node_modules/@expo/require-utils | 55.0.8 | 57.0.5 |
| node_modules/@expo/schema-utils | 55.0.5 | 57.0.2 |
| node_modules/@expo/ui | — | 57.0.21 |
| node_modules/@expo/ws-tunnel | 1.0.6 | — |
| node_modules/@expo/xcpretty/node_modules/argparse | 2.0.1 | — |
| node_modules/@expo/xcpretty/node_modules/js-yaml | 4.3.2 | — |
| node_modules/@istanbuljs/load-nyc-config | 1.1.0 | — |
| node_modules/@istanbuljs/load-nyc-config/node_modules/camelcase | 5.3.1 | — |
| node_modules/@istanbuljs/schema | 0.1.6 | — |
| node_modules/@jest/create-cache-key-function | 29.7.0 | — |
| node_modules/@jest/environment | 29.7.0 | — |
| node_modules/@jest/fake-timers | 29.7.0 | — |
| node_modules/@jest/transform | 29.7.0 | — |
| node_modules/@radix-ui/react-direction | 1.1.4 | 1.1.5 |
| node_modules/@radix-ui/react-slot | 1.3.3 | 1.4.0 |
| node_modules/@react-native-masked-view/masked-view | — | 0.3.2 |
| node_modules/@react-native/assets-registry | 0.83.10 | 0.86.3 |
| node_modules/@react-native/babel-plugin-codegen | 0.83.10 | 0.86.3 |
| node_modules/@react-native/babel-preset | 0.83.10 | 0.86.3 |
| node_modules/@react-native/babel-preset/node_modules/babel-plugin-syntax-hermes-parser | — | 0.36.0 |
| node_modules/@react-native/babel-preset/node_modules/hermes-estree | — | 0.36.0 |
| node_modules/@react-native/babel-preset/node_modules/hermes-parser | — | 0.36.0 |
| node_modules/@react-native/codegen | 0.83.10 | 0.86.3 |
| node_modules/@react-native/codegen/node_modules/balanced-match | 1.0.2 | — |
| node_modules/@react-native/codegen/node_modules/brace-expansion | 1.1.21 | — |
| node_modules/@react-native/codegen/node_modules/glob | 7.2.3 | — |
| node_modules/@react-native/codegen/node_modules/hermes-estree | 0.32.0 | 0.36.0 |
| node_modules/@react-native/codegen/node_modules/hermes-parser | 0.32.0 | 0.36.0 |
| node_modules/@react-native/codegen/node_modules/minimatch | 3.1.5 | — |
| node_modules/@react-native/community-cli-plugin | 0.83.10 | 0.86.3 |
| node_modules/@react-native/debugger-frontend | 0.83.10 | 0.86.3 |
| node_modules/@react-native/debugger-shell | 0.83.10 | 0.86.3 |
| node_modules/@react-native/dev-middleware | 0.83.10 | 0.86.3 |
| node_modules/@react-native/gradle-plugin | 0.83.10 | 0.86.3 |
| node_modules/@react-native/js-polyfills | 0.83.10 | 0.86.3 |
| node_modules/@react-native/metro-babel-transformer | — | 0.86.3 |
| node_modules/@react-native/metro-babel-transformer/node_modules/hermes-estree | — | 0.36.0 |
| node_modules/@react-native/metro-babel-transformer/node_modules/hermes-parser | — | 0.36.0 |
| node_modules/@react-native/metro-config | — | 0.86.3 |
| node_modules/@react-native/normalize-colors | 0.83.10 | 0.86.3 |
| node_modules/@react-native/virtualized-lists | — | 0.86.3 |
| node_modules/@react-navigation/native-stack | 7.20.0 | — |
| node_modules/@sinonjs/commons | 3.0.1 | — |
| node_modules/@sinonjs/fake-timers | 10.3.0 | — |
| node_modules/@types/babel__core | 7.20.5 | — |
| node_modules/@types/babel__generator | 7.27.0 | — |
| node_modules/@types/babel__template | 7.4.4 | — |
| node_modules/@types/babel__traverse | 7.28.0 | — |
| node_modules/@types/graceful-fs | 4.1.9 | — |
| node_modules/@types/react-test-renderer | — | 19.3.0 |
| node_modules/@types/stack-utils | 2.0.3 | — |
| node_modules/anymatch | 3.1.3 | — |
| node_modules/argparse | 1.0.10 | 2.0.1 |
| node_modules/babel-jest | 29.7.0 | — |
| node_modules/babel-plugin-istanbul | 6.1.1 | — |
| node_modules/babel-plugin-jest-hoist | 29.6.3 | — |
| node_modules/babel-plugin-syntax-hermes-parser | 0.32.0 | 0.36.1 |
| node_modules/babel-plugin-syntax-hermes-parser/node_modules/hermes-estree | 0.32.0 | — |
| node_modules/babel-plugin-syntax-hermes-parser/node_modules/hermes-parser | 0.32.0 | — |
| node_modules/babel-preset-current-node-syntax | 1.2.0 | — |
| node_modules/babel-preset-expo | — | 57.0.13 |
| node_modules/babel-preset-jest | 29.6.3 | — |
| node_modules/better-opn | 3.0.2 | — |
| node_modules/better-opn/node_modules/open | 8.4.2 | — |
| node_modules/chromium-edge-launcher | 0.2.0 | 0.3.0 |
| node_modules/define-lazy-prop | 2.0.0 | — |
| node_modules/electron-to-chromium | 1.5.444 | 1.5.445 |
| node_modules/eslint-config-expo | 55.0.1 | 57.0.2 |
| node_modules/eslint-plugin-react-hooks | 5.2.0 | 7.1.1 |
| node_modules/eslint-plugin-react-hooks/node_modules/hermes-estree | — | 0.25.1 |
| node_modules/eslint-plugin-react-hooks/node_modules/hermes-parser | — | 0.25.1 |
| node_modules/esprima | 4.0.1 | — |
| node_modules/expo | 55.0.31 | 57.0.26 |
| node_modules/expo-asset | — | 57.0.18 |
| node_modules/expo-constants | 55.0.17 | 57.0.20 |
| node_modules/expo-constants/node_modules/@expo/env | 2.1.3 | — |
| node_modules/expo-device | 55.0.21 | 57.0.2 |
| node_modules/expo-file-system | — | 57.0.7 |
| node_modules/expo-font | 55.0.8 | 57.0.4 |
| node_modules/expo-glass-effect | 55.0.11 | 57.0.4 |
| node_modules/expo-image | 55.0.11 | 57.0.5 |
| node_modules/expo-keep-awake | — | 57.0.2 |
| node_modules/expo-linking | 55.0.17 | 57.0.11 |
| node_modules/expo-modules-autolinking | 55.0.27 | 57.0.13 |
| node_modules/expo-modules-core | 55.0.26 | 57.0.20 |
| node_modules/expo-modules-jsi | — | 57.1.1 |
| node_modules/expo-router | 55.0.18 | 57.0.24 |
| node_modules/expo-router/node_modules/@radix-ui/react-collection | 1.1.15 | 1.1.16 |
| node_modules/expo-router/node_modules/@radix-ui/react-presence | 1.1.10 | 1.1.11 |
| node_modules/expo-router/node_modules/@radix-ui/react-primitive | 2.1.10 | 2.1.11 |
| node_modules/expo-router/node_modules/@radix-ui/react-roving-focus | 1.1.19 | 1.1.20 |
| node_modules/expo-router/node_modules/@radix-ui/react-tabs | 1.1.21 | 1.1.22 |
| node_modules/expo-router/node_modules/semver | 7.6.3 | — |
| node_modules/expo-router/node_modules/standard-navigation | — | 0.0.5 |
| node_modules/expo-server | 55.0.12 | 57.0.3 |
| node_modules/expo-splash-screen | 55.0.25 | 57.0.9 |
| node_modules/expo-status-bar | 55.0.6 | 57.0.1 |
| node_modules/expo-symbols | 55.0.9 | 57.0.3 |
| node_modules/expo-system-ui | 55.0.22 | 57.0.4 |
| node_modules/expo-web-browser | 55.0.20 | 57.0.3 |
| node_modules/expo/node_modules/@expo/cli | 55.0.36 | 57.0.27 |
| node_modules/expo/node_modules/@expo/cli/node_modules/@expo/router-server | 55.0.19 | 57.0.11 |
| node_modules/expo/node_modules/@expo/env | 2.1.3 | — |
| node_modules/expo/node_modules/@expo/json-file | 10.0.16 | — |
| node_modules/expo/node_modules/@expo/json-file/node_modules/@babel/code-frame | 7.10.4 | — |
| node_modules/expo/node_modules/@expo/metro-config | 55.0.27 | — |
| node_modules/expo/node_modules/@expo/vector-icons | 15.1.1 | — |
| node_modules/expo/node_modules/@expo/ws-tunnel | — | 2.0.1 |
| node_modules/expo/node_modules/babel-preset-expo | 55.0.25 | — |
| node_modules/expo/node_modules/expo-asset | 55.0.20 | — |
| node_modules/expo/node_modules/expo-file-system | 55.0.26 | — |
| node_modules/expo/node_modules/expo-keep-awake | 55.0.8 | — |
| node_modules/expo/node_modules/hermes-estree | 0.32.1 | — |
| node_modules/expo/node_modules/hermes-parser | 0.32.1 | — |
| node_modules/expo/node_modules/picomatch | 4.0.7 | — |
| node_modules/find-up | 4.1.0 | — |
| node_modules/fs.realpath | 1.0.0 | — |
| node_modules/fsevents | 2.3.3 | — |
| node_modules/get-package-type | 0.1.0 | — |
| node_modules/hermes-compiler | 0.14.1 | 250829098.0.17 |
| node_modules/hermes-estree | 0.35.0 | 0.36.1 |
| node_modules/hermes-parser | 0.35.0 | 0.36.1 |
| node_modules/inflight | 1.0.6 | — |
| node_modules/istanbul-lib-coverage | 3.2.2 | — |
| node_modules/istanbul-lib-instrument | 5.2.1 | — |
| node_modules/istanbul-lib-instrument/node_modules/semver | 6.3.1 | — |
| node_modules/jest-environment-node | 29.7.0 | — |
| node_modules/jest-haste-map | 29.7.0 | — |
| node_modules/jest-message-util | 29.7.0 | — |
| node_modules/jest-mock | 29.7.0 | — |
| node_modules/jest-regex-util | 29.6.3 | — |
| node_modules/jest-util/node_modules/picomatch | — | 2.3.2 |
| node_modules/js-yaml | 3.15.2 | 4.3.2 |
| node_modules/locate-path | 5.0.0 | — |
| node_modules/metro | 0.83.8 | 0.84.5 |
| node_modules/metro-babel-transformer | 0.83.8 | 0.84.5 |
| node_modules/metro-babel-transformer/node_modules/hermes-estree | — | 0.35.0 |
| node_modules/metro-babel-transformer/node_modules/hermes-parser | — | 0.35.0 |
| node_modules/metro-cache | 0.83.8 | 0.84.5 |
| node_modules/metro-cache-key | 0.83.8 | 0.84.5 |
| node_modules/metro-config | 0.83.8 | 0.84.6 |
| node_modules/metro-config/node_modules/hermes-estree | — | 0.35.0 |
| node_modules/metro-config/node_modules/hermes-parser | — | 0.35.0 |
| node_modules/metro-config/node_modules/metro | — | 0.84.6 |
| node_modules/metro-config/node_modules/metro-babel-transformer | — | 0.84.6 |
| node_modules/metro-config/node_modules/metro-cache | — | 0.84.6 |
| node_modules/metro-config/node_modules/metro-cache-key | — | 0.84.6 |
| node_modules/metro-config/node_modules/metro-core | — | 0.84.6 |
| node_modules/metro-config/node_modules/metro-file-map | — | 0.84.6 |
| node_modules/metro-config/node_modules/metro-minify-terser | — | 0.84.6 |
| node_modules/metro-config/node_modules/metro-resolver | — | 0.84.6 |
| node_modules/metro-config/node_modules/metro-source-map | — | 0.84.6 |
| node_modules/metro-config/node_modules/metro-symbolicate | — | 0.84.6 |
| node_modules/metro-config/node_modules/metro-transform-plugins | — | 0.84.6 |
| node_modules/metro-config/node_modules/metro-transform-worker | — | 0.84.6 |
| node_modules/metro-config/node_modules/ob1 | — | 0.84.6 |
| node_modules/metro-core | 0.83.8 | 0.84.5 |
| node_modules/metro-file-map | 0.83.8 | 0.84.5 |
| node_modules/metro-minify-terser | 0.83.8 | 0.84.5 |
| node_modules/metro-resolver | 0.83.8 | 0.84.5 |
| node_modules/metro-runtime | 0.83.8 | 0.84.6 |
| node_modules/metro-source-map | 0.83.8 | 0.84.5 |
| node_modules/metro-symbolicate | 0.83.8 | 0.84.5 |
| node_modules/metro-transform-plugins | 0.83.8 | 0.84.5 |
| node_modules/metro-transform-worker | 0.83.8 | 0.84.5 |
| node_modules/metro/node_modules/hermes-estree | — | 0.35.0 |
| node_modules/metro/node_modules/hermes-parser | — | 0.35.0 |
| node_modules/metro/node_modules/metro-config | — | 0.84.5 |
| node_modules/metro/node_modules/metro-runtime | — | 0.84.5 |
| node_modules/micromatch/node_modules/picomatch | — | 2.3.2 |
| node_modules/normalize-path | 3.0.0 | — |
| node_modules/ob1 | 0.83.8 | 0.84.5 |
| node_modules/once | 1.4.0 | — |
| node_modules/p-limit | 2.3.0 | — |
| node_modules/p-locate | 4.1.0 | — |
| node_modules/p-try | 2.2.0 | — |
| node_modules/path-is-absolute | 1.0.1 | — |
| node_modules/picomatch | 2.3.2 | 4.0.7 |
| node_modules/pirates | 4.0.7 | — |
| node_modules/react | 19.2.0 | 19.2.3 |
| node_modules/react-dom | 19.2.0 | 19.2.3 |
| node_modules/react-native | 0.83.10 | 0.86.3 |
| node_modules/react-native-drawer-layout | — | 4.2.11 |
| node_modules/react-native-gesture-handler | 2.30.1 | 2.32.0 |
| node_modules/react-native-reanimated | 4.2.1 | 4.5.1 |
| node_modules/react-native-reanimated/node_modules/react-native-is-edge-to-edge | 1.2.1 | — |
| node_modules/react-native-reanimated/node_modules/semver | 7.7.3 | — |
| node_modules/react-native-safe-area-context | 5.6.2 | 5.7.0 |
| node_modules/react-native-screens | 4.23.0 | 4.26.2 |
| node_modules/react-native-worklets | 0.7.4 | 0.10.1 |
| node_modules/react-native-worklets/node_modules/semver | 7.7.3 | — |
| node_modules/react-native/node_modules/@react-native/virtualized-lists | 0.83.10 | — |
| node_modules/react-native/node_modules/babel-plugin-syntax-hermes-parser | — | 0.36.0 |
| node_modules/react-native/node_modules/balanced-match | 1.0.2 | — |
| node_modules/react-native/node_modules/brace-expansion | 1.1.21 | — |
| node_modules/react-native/node_modules/glob | 7.2.3 | — |
| node_modules/react-native/node_modules/hermes-estree | — | 0.36.0 |
| node_modules/react-native/node_modules/hermes-parser | — | 0.36.0 |
| node_modules/react-native/node_modules/minimatch | 3.1.5 | — |
| node_modules/regexpu-core | 6.5.2 | 6.5.3 |
| node_modules/rimraf | 3.0.2 | — |
| node_modules/rimraf/node_modules/balanced-match | 1.0.2 | — |
| node_modules/rimraf/node_modules/brace-expansion | 1.1.21 | — |
| node_modules/rimraf/node_modules/glob | 7.2.3 | — |
| node_modules/rimraf/node_modules/minimatch | 3.1.5 | — |
| node_modules/sandbox-cli-detector | — | 0.2.0 |
| node_modules/slash | 3.0.0 | — |
| node_modules/sprintf-js | 1.0.3 | — |
| node_modules/stack-utils | 2.0.6 | — |
| node_modules/stack-utils/node_modules/escape-string-regexp | 2.0.0 | — |
| node_modules/test-exclude | 6.0.0 | — |
| node_modules/test-exclude/node_modules/balanced-match | 1.0.2 | — |
| node_modules/test-exclude/node_modules/brace-expansion | 1.1.21 | — |
| node_modules/test-exclude/node_modules/glob | 7.2.3 | — |
| node_modules/test-exclude/node_modules/minimatch | 3.1.5 | — |
| node_modules/tinyglobby/node_modules/picomatch | 4.0.7 | — |
| node_modules/type-detect | 4.0.8 | — |
| node_modules/typescript | 5.9.3 | 6.0.3 |
| node_modules/vaul/node_modules/@radix-ui/react-dialog | 1.1.23 | 1.2.0 |
| node_modules/vaul/node_modules/@radix-ui/react-dismissable-layer | 1.1.19 | 1.1.20 |
| node_modules/vaul/node_modules/@radix-ui/react-focus-scope | 1.1.16 | 1.2.0 |
| node_modules/vaul/node_modules/@radix-ui/react-portal | 1.1.17 | 1.1.18 |
| node_modules/vaul/node_modules/@radix-ui/react-presence | 1.1.10 | 1.1.11 |
| node_modules/vaul/node_modules/@radix-ui/react-primitive | 2.1.10 | 2.1.11 |
| node_modules/wrappy | 1.0.2 | — |
| node_modules/write-file-atomic | 4.0.2 | — |
| node_modules/zod-validation-error | — | 4.0.2 |
