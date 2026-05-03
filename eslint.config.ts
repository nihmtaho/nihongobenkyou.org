import antfu from '@antfu/eslint-config'

export default antfu(
  {
    react: true,
    typescript: true,
    ignores: [
      '.github/agents/**',
      '.github/copilot-instructions.md',
      '.specify/**',
      '.claude/**',
      '.agents/**',
      '.playwright-mcp/**',
      'CLAUDE.md',
      'STRUCTURE.md',
      'node_modules/**',
      'dist/**',
      'public/data/**',
      'coverage/**',
      'dataset/**',
      '.kanjium/**',
    ],
    rules: {
      'ts/no-explicit-any': 'error',
      'no-unused-vars': 'error',
    },
  },
  // TanStack Router route files export both `Route` and component functions by design
  {
    files: ['src/routes/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
)
