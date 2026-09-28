import { defineConfig } from 'eslint/config';
import next from 'eslint-config-next/core-web-vitals';
export default defineConfig([...next, {rules: {'react-hooks/set-state-in-effect': 'off', 'react-hooks/immutability': 'off', 'react-hooks/exhaustive-deps': 'warn'}}]);
