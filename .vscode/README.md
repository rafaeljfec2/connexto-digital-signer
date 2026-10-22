# VS Code Configuration for the Backend

This folder contains VS Code settings for the backend project.

## Recommended Extensions

The following extensions are recommended (VS Code will suggest them automatically):

- **Prettier - Code formatter** (`esbenp.prettier-vscode`)
- **ESLint** (`dbaeumer.vscode-eslint`)
- **Jest Runner** (`firsttris.vscode-jest-runner`)

## Configured Features

### 1. Format on Save

When you save a file (Ctrl+S / Cmd+S), the code will automatically:

- **Format** with Prettier
- **Lint** with ESLint and auto-fix when possible
- **Remove unused imports**

### 2. Unused Import Removal

The `unused-imports/no-unused-imports` rule is set to `error`, so:

- Unused imports are **removed automatically** on save
- You will see errors in the editor if unused imports remain
- ESLint auto-fixes on save (via `source.fixAll.eslint`)

### 3. Prettier Settings

Prettier is configured to:

- Use single quotes (`singleQuote: true`)
- Add trailing commas (`trailingComma: 'all'`)
- Max line width: 100 characters
- 2-space indentation
- Line endings: LF

## How to Use

1. **Install the recommended extensions** (VS Code will prompt you)
2. **Save any TypeScript file** — formatting and import cleanup run automatically
3. **Check ESLint errors** in the VS Code Problems panel

## Available Commands

You can also run manually:

```bash
# Format all files
yarn format

# Run lint and auto-fix
yarn lint

# Run lint with unused import removal
yarn lint:fix
```
