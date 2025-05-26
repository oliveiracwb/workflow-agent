# Agent Workflow Editor

Editor visual de workflows para construção de diálogos de agentes. Rápido, leve e porável usando Electron

## 🚀 Características

- **Leve ! O mais leve do mercado.**
- **Interface Visual Intuitiva**
- **Tipos de Nós Diversos**: Agentic, Decision, Memory, Start, End,
- **Execução em Tempo Real**: Execute workflows e veja o progresso em tempo real
- **Integração com Ollama**: Conecte com modelos de IA locais
- **Aplicação Desktop**: Funciona 100% offline como aplicação nativa
- **Multiplataforma**: Windows, macOS e Linux com Eletron

## 📦 Instalação

### Opção 1: Executável Pronto (Windows)

1.  Baixe um dos arquivos da pasta `dist-electron/`:
    
    - **`React Flow Workflow Editor Setup 1.0.0.exe`** - Instalador completo
    - **`React Flow Workflow Editor 1.0.0.exe`** - Versão portátil (não requer instalação)
2.  Execute o arquivo baixado e siga as instruções
    

### Opção 2: Desenvolvimento

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd flow

# Instale as dependências
npm install

# Execute em modo desenvolvimento
npm run electron-dev
```

## 🛠️ Scripts Disponíveis

```bash
# Uso, desenvolvimentos e testes:
npm run dev              # Servidor web (http://localhost:6987)

Compilar o exe Eletron
npm run electron-dev     # Aplicação Electron (opcional)

# Build
npm run build           # Build da aplicação web
npm run electron-build  # Build da aplicação Electron (todas as plataformas)

# Build específico por plataforma
npm run electron-build-win    # Windows (.exe + instalador)
npm run electron-build-mac    # macOS (.dmg)
npm run electron-build-linux  # Linux (.AppImage + .deb)
```

## 🎯 Como Usar

### 1\. Criando um Workflow

1.  **Abra a aplicação**
2.  **Acesse o menu hamburger**
3.  **Crie nós, configure prompts ! Não se esqueça do inívio e fim.**
4.  **Salve seu trabalho em JSON onde quiser.**

### 2\. Tipos de Nós

- **🚀 Start**: Ponto de início do workflow
- **🤖 Agentic**: Nós com IA que processam prompts
- **❓ Decision**: Nós de decisão com múltiplas saídas
- **💾 Memory**: Nós de armazenamento de contexto
- **🏁 End**: Ponto final do workflow

### 3\. Executando Workflows

1.  **Configure Ollama**: Certifique-se que o Ollama está rodando
2.  **Abra o Chat**: Clique em “💬 Execute” 
3.  **Digite entrada**: Forneça input inicial para o workflow
4.  **Acompanhe**: Veja e veja execução em tempo real

### 4\. Dica

1.  **Use modelos instructs: são mais propensos a responder adequadamente as saidas JSON**
2.  **Requer Node.js >= 20.1**

### 5\. Configuração do Ollama

```bash
# Instale o Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Baixe um modelo (exemplo)
ollama pull llama2

# Execute o servidor (porta padrão 11434)
ollama serve
```

## 📁 Estrutura de Arquivos JSON

```json
{
  "nodes": [
    {
      "id": "start_1",
      "name": "Início",
      "nodeType": "start",
      "nextNodes": ["agent_1"]
    },
    {
      "id": "agent_1", 
      "name": "Processador IA",
      "nodeType": "agentic",
      "systemPrompt": "Você é um assistente útil",
      "userPrompt": "Processe: {input}",
      "nextNodes": ["end_1"]
    },
    {
      "id": "end_1",
      "name": "Fim",
      "nodeType": "end"
    }
  ],
  "config": {
    "defaultModel": "llama2",
    "ollamaAddress": "http://localhost:11434"
  }
}
```

## ⌨️ Atalhos de Teclado

- **Ctrl+N**: Novo workflow
- **Ctrl+O**: Abrir workflow
- **Ctrl+S**: Salvar workflow
- **Ctrl+Shift+N**: Criar novo nó
- **F5**: Executar workflow
- **Shift+F5**: Parar execução
- **Delete/Backspace**: Deletar aresta selecionada

## 🔧 Configurações

### Variáveis de Ambiente

```bash
# Endereço do Ollama (padrão: http://localhost:11434)
VITE_WF_OLLAMA_ADDRESS=http://localhost:11434
```

### Configuração no JSON

```json
{
  "config": {
    "defaultModel": "llama2",
    "ollamaAddress": "http://localhost:11434",
    "availableModels": ["llama2", "codellama", "mistral"]
  }
}
```

## 🐛 Solução de Problemas

### Erro de Conexão com Ollama

1.  Verifique se o Ollama está rodando: `ollama list`
2.  Teste a conexão: `curl http://localhost:11434/api/tags`
3.  Configure o endereço correto nas configurações

### Aplicação não Abre

1.  Verifique se tem permissões de execução
2.  Execute como administrador se necessário
3.  Verifique logs no console (F12 em desenvolvimento)

## 🏗️ Arquitetura Técnica

- **Frontend**: React + TypeScript + React Flow
- **Desktop**: Electron
- **Build**: Vite + Electron Builder
- **IA**: Integração com Ollama
- **Styling**: CSS-in-JS

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🤝 Contribuição

1.  Fork o projeto
2.  Crie uma branch para sua feature
3.  Commit suas mudanças
4.  Push para a branch
5.  Abra um Pull Request

## 📞 Suporte

- **Issues**: Use o GitHub Issues para reportar bugs
- **Documentação**: Consulte a documentação do React Flow
- **Comunidade**: Participe das discussões no GitHub

* * *

**Desenvolvido por Oliveira com ❤️ usando React Flow e Electron**