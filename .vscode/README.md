# Configuração do VS Code para o Backend

Esta pasta contém as configurações do VS Code para o projeto backend.

## Extensões Recomendadas

As seguintes extensões são recomendadas (sugeridas automaticamente pelo VS Code):

- **Prettier - Code formatter** (`esbenp.prettier-vscode`)
- **ESLint** (`dbaeumer.vscode-eslint`)
- **Jest Runner** (`firsttris.vscode-jest-runner`)

## Funcionalidades Configuradas

### 1. Formatação Automática ao Salvar

Quando você salvar um arquivo (Ctrl+S / Cmd+S), o código será automaticamente:

- **Formatado** com Prettier
- **Lintado** com ESLint e corrigido automaticamente quando possível
- **Imports não utilizados removidos** automaticamente

### 2. Remoção de Imports Não Utilizados

A regra `unused-imports/no-unused-imports` está configurada como `error`, então:

- Imports não utilizados são **removidos automaticamente** ao salvar
- Você verá erros no editor se houver imports não utilizados
- O ESLint corrige automaticamente ao salvar (via `source.fixAll.eslint`)

### 3. Configuração do Prettier

O Prettier está configurado para:

- Usar aspas simples (`singleQuote: true`)
- Adicionar vírgula no final (`trailingComma: 'all'`)
- Largura máxima de linha: 100 caracteres
- 2 espaços de indentação
- Final de linha: LF

## Como Usar

1. **Instale as extensões recomendadas** (VS Code irá sugerir automaticamente)
2. **Salve qualquer arquivo TypeScript** - a formatação e remoção de imports acontecerá automaticamente
3. **Verifique os erros do ESLint** na aba "Problems" do VS Code

## Comandos Disponíveis

Você também pode executar manualmente:

```bash
# Formatar todos os arquivos
yarn format

# Executar lint e corrigir automaticamente
yarn lint

# Executar lint com remoção de imports não utilizados
yarn lint:fix
```

