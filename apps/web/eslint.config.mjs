import { defineConfig } from 'eslint/config';
import next from 'eslint-config-next/core-web-vitals';
import typescript from '@typescript-eslint/eslint-plugin';
export default defineConfig([...next, {plugins: {'@typescript-eslint': typescript}, rules: {'@typescript-eslint/no-explicit-any': 'error', 'eqeqeq': ['error', 'always', { null: 'ignore' }], 'no-debugger': 'error', 'no-console': ['error', { allow: ['warn', 'error'] }], 'react-hooks/set-state-in-effect': 'off', 'react-hooks/immutability': 'off', 'react-hooks/exhaustive-deps': 'warn'}}]);
