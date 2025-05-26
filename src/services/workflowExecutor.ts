import type { 
  FlowNode, 
  FlowEdge, 
  WorkflowExecution, 
  WorkflowLog, 
  WorkflowConfig
} from '../types/flow';
import { ollamaService } from './ollamaService';

class WorkflowExecutor {
  private execution: WorkflowExecution | null = null;
  private nodes: FlowNode[] = [];
  private edges: FlowEdge[] = [];
  private config: WorkflowConfig;
  private nodeOutputs: Map<string, any> = new Map();
  private logCallback?: (log: WorkflowLog) => void;

  constructor(config: WorkflowConfig) {
    this.config = config;
  }

  setLogCallback(callback: (log: WorkflowLog) => void) {
    this.logCallback = callback;
  }

  private log(nodeId: string, nodeName: string, type: 'info' | 'error' | 'success' | 'node_start' | 'node_complete' | 'user_input' | 'database' | 'warning', message: string, input?: any, output?: any) {
    const logEntry: WorkflowLog = {
      timestamp: new Date(),
      nodeId,
      nodeName,
      type,
      message,
      input,
      output
    };

    if (this.execution) {
      this.execution.logs.push(logEntry);
    }

    // Chama o callback imediatamente para atualização em tempo real
    if (this.logCallback) {
      this.logCallback(logEntry);
    }

    // Log no console também
    console.log(`[${type.toUpperCase()}] ${nodeName} (${nodeId}): ${message}`, { input, output });
  }

  async startExecution(nodes: FlowNode[], edges: FlowEdge[], userInput?: string): Promise<WorkflowExecution> {
    this.nodes = nodes;
    this.edges = edges;
    this.nodeOutputs.clear();

    this.execution = {
      id: `exec_${Date.now()}`,
      status: 'running',
      startTime: new Date(),
      logs: [],
      userInput
    };

    // 1. Loga input do usuário antes de tudo
    if (userInput) {
      // O input do usuário é registrado como primeiro log
      this.log('USER', 'Usuário', 'user_input', userInput, { userInput });
    }

    this.log('SYSTEM', 'Sistema', 'info', 'Iniciando execução do workflow');

    // 2. Step: Pré-carregamento do modelo
    this.log('OLLAMA', 'Ollama', 'info', 'Carregando o modelo na memória...');
    if (this.config.defaultModel) {
      try {
        await ollamaService.preloadModel(this.config.defaultModel);
        this.log('OLLAMA', 'Ollama', 'info', 'Modelo carregado com sucesso.');
      } catch (error) {
        this.log('OLLAMA', 'Ollama', 'error', `Erro ao carregar modelo: ${(error as Error).message}`);
        this.execution.status = 'error';
        this.execution.endTime = new Date();
        throw error;
      }
    }

    try {
      // Encontra o nó inicial (tipo 'start')
      const startNode = nodes.find(node => node.data.nodeType === 'start');
      if (!startNode) {
        throw new Error('Nenhum nó de início encontrado');
      }

      // Se há input do usuário, armazena como saída do nó inicial
      if (userInput) {
        this.nodeOutputs.set(startNode.id, { input: userInput, timestamp: new Date().toISOString() });
        // Não loga novamente o input aqui
      }

      // Executa o workflow a partir do nó inicial
      await this.executeFromNode(startNode.id);

      this.execution.status = 'completed';
      this.execution.endTime = new Date();
      this.log('SYSTEM', 'Sistema', 'success', 'Workflow concluído com sucesso');

    } catch (error) {
      this.execution.status = 'error';
      this.execution.endTime = new Date();
      this.log('SYSTEM', 'Sistema', 'error', `Erro na execução: ${(error as Error).message}`);
      throw error;
    }

    return this.execution;
  }

  stopExecution() {
    if (this.execution && this.execution.status === 'running') {
      this.execution.status = 'stopped';
      this.execution.endTime = new Date();
      this.log('SYSTEM', 'Sistema', 'info', 'Execução interrompida pelo usuário');
    }
  }

  private async executeFromNode(nodeId: string): Promise<void> {
    if (this.execution?.status !== 'running') {
      return; // Execução foi parada
    }

    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) {
      throw new Error(`Nó ${nodeId} não encontrado`);
    }

    this.execution!.currentNodeId = nodeId;
    this.log(nodeId, node.data.label, 'node_start', `Executando ${nodeId} [${node.data.label}]`);

    try {
      let output: any = null;

      // Executa baseado no tipo do nó
      switch (node.data.nodeType) {
        case 'start':
          output = await this.executeStartNode(node);
          break;
        case 'agentic':
          output = await this.executeAgenticNode(node);
          break;
        case 'decision':
          output = await this.executeDecisionNode(node);
          break;
        case 'memory':
          output = await this.executeMemoryNode(node);
          break;
        case 'end':
          output = await this.executeEndNode(node);
          break;
        default:
          throw new Error(`Tipo de nó desconhecido: ${node.data.nodeType}`);
      }

      // Armazena a saída do nó
      if (output !== null) {
        this.nodeOutputs.set(nodeId, output);
        this.log(nodeId, node.data.label, 'node_complete', `${nodeId} [${node.data.label}] concluído`, null, output);
      }

      // Continua para os próximos nós
      await this.executeNextNodes(nodeId);

    } catch (error) {
      this.log(nodeId, node.data.label, 'error', `Erro em ${nodeId} [${node.data.label}]: ${(error as Error).message}`);
      throw error;
    }
  }

  private async executeStartNode(node: FlowNode): Promise<any> {
    // Nó inicial não executa nada, apenas passa o input adiante
    const existingOutput = this.nodeOutputs.get(node.id);
    const result = existingOutput || { status: 'started', timestamp: new Date().toISOString() };
    
    this.log(node.id, node.data.label, 'info', `${node.id} [${node.data.label}] - Nó inicial processado`);
    return result;
  }

  private async executeAgenticNode(node: FlowNode): Promise<any> {
    const { systemPrompt, userPrompt, outputFormat } = node.data;
    
    if (!systemPrompt && !userPrompt) {
      this.log(node.id, node.data.label, 'info', `${node.id} [${node.data.label}] - Sem prompts definidos, pulando execução`);
      return { status: 'skipped', reason: 'no_prompts' };
    }

    // Substitui variáveis nos prompts
    const processedSystemPrompt = this.replaceVariables(systemPrompt || '');
    const processedUserPrompt = this.replaceVariables(userPrompt || '');

    this.log(node.id, node.data.label, 'info', `${node.id} [${node.data.label}] - Preparando prompts...`);
    await new Promise(resolve => setTimeout(resolve, 300)); // Pequeno delay para visualização
    
    this.log(node.id, node.data.label, 'info', `${node.id} [${node.data.label}] - Conectando com Ollama...`);
    await new Promise(resolve => setTimeout(resolve, 200)); // Pequeno delay para visualização
    
    this.log(node.id, node.data.label, 'info', `${node.id} [${node.data.label}] - Enviando requisição para o modelo...`);

    try {
      const response = await ollamaService.generateResponse(
        this.config.defaultModel,
        processedSystemPrompt,
        processedUserPrompt,
        outputFormat
      );

      this.log(node.id, node.data.label, 'info', `${node.id} [${node.data.label}] - Processando resposta...`);
      await new Promise(resolve => setTimeout(resolve, 200)); // Pequeno delay para visualização

      // Tenta parsear como JSON se possível
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(response);
      } catch {
        parsedResponse = { response, raw: true };
      }

      this.log(node.id, node.data.label, 'success', `${node.id} [${node.data.label}] - Resposta do Ollama recebida`, null, parsedResponse);

      return parsedResponse;

    } catch (error) {
      this.log(node.id, node.data.label, 'error', `${node.id} [${node.data.label}] - Erro no Ollama: ${(error as Error).message}`);
      throw error;
    }
  }

  private async executeDecisionNode(node: FlowNode): Promise<any> {
    this.log(node.id, node.data.label, 'info', `${node.id} [${node.data.label}] - Avaliando decisões...`);
    
    // Avalia as decisões
    if (node.data.decisions && node.data.decisions.length > 0) {
      for (const decision of node.data.decisions) {
        this.log(node.id, node.data.label, 'info', `${node.id} [${node.data.label}] - Testando condição: ${decision.condition}`);
        
        if (this.evaluateCondition(decision.condition)) {
          this.log(node.id, node.data.label, 'success', `${node.id} [${node.data.label}] - Decisão tomada: ${decision.label}`);
          
          // Busca a aresta conectada a este handle específico da decisão
          const decisionEdge = this.edges.find(edge => 
            edge.source === node.id && edge.sourceHandle === decision.id
          );
          
          if (decisionEdge) {
            await this.executeFromNode(decisionEdge.target);
            return { 
              decision: decision.label, 
              targetNode: decisionEdge.target, 
              timestamp: new Date().toISOString() 
            };
          } else {
            this.log(node.id, node.data.label, 'info', `${node.id} [${node.data.label}] - Decisão ${decision.label} não tem conexão definida`);
            return { 
              decision: decision.label, 
              targetNode: null, 
              timestamp: new Date().toISOString() 
            };
          }
        }
      }
      
      this.log(node.id, node.data.label, 'warning', `${node.id} [${node.data.label}] - Nenhuma condição de decisão foi atendida`);
      return { status: 'no_decision', timestamp: new Date().toISOString() };
    }

    this.log(node.id, node.data.label, 'info', `${node.id} [${node.data.label}] - Nó de decisão sem regras definidas`);
    return { status: 'no_decisions', timestamp: new Date().toISOString() };
  }

  private async executeMemoryNode(node: FlowNode): Promise<any> {
    // Nó de memória armazena contexto
    const context = node.data.context || '';
    const processedContext = this.replaceVariables(context);
    
    this.log(node.id, node.data.label, 'database', `${node.id} [${node.data.label}] - Armazenando contexto: ${processedContext}`);
    
    const result = {
      context: processedContext,
      stored: true,
      timestamp: new Date().toISOString()
    };

    this.log(node.id, node.data.label, 'database', `${node.id} [${node.data.label}] - Contexto armazenado com sucesso`, null, result);
    
    return result;
  }

  private async executeEndNode(node: FlowNode): Promise<any> {
    this.log(node.id, node.data.label, 'info', `${node.id} [${node.data.label}] - Nó final alcançado`);
    
    // Nó END é apenas um sinalizador de fim - não executa prompts
    // É uma máquina sem estado que serve como memória de finalização
    const result = {
      status: 'completed',
      timestamp: new Date().toISOString(),
      finalNode: true,
      message: 'Workflow finalizado com sucesso'
    };

    this.log(node.id, node.data.label, 'success', `${node.id} [${node.data.label}] - Workflow finalizado`, null, result);
    
    return result;
  }

  private async executeNextNodes(currentNodeId: string): Promise<void> {
    // Encontra as arestas que saem do nó atual (exceto decisões, que são tratadas separadamente)
    const outgoingEdges = this.edges.filter(edge => 
      edge.source === currentNodeId && !edge.label // Arestas sem label são conexões normais
    );

    for (const edge of outgoingEdges) {
      await this.executeFromNode(edge.target);
    }
  }

  private replaceVariables(text: string): string {
    // Substitui variáveis no formato {NODE_ID.campo} ou {NODE_ID.campo.subcampo}
    return text.replace(/\{([^}]+)\}/g, (match, variable) => {
      const parts = variable.split('.');
      const nodeId = parts[0];
      const nodeOutput = this.nodeOutputs.get(nodeId);
      
      if (nodeOutput && parts.length > 1) {
        let value = nodeOutput;
        // Navega pelos campos aninhados
        for (let i = 1; i < parts.length; i++) {
          if (value && typeof value === 'object' && parts[i] in value) {
            value = value[parts[i]];
          } else {
            console.log('Campo não encontrado:', parts[i], 'em', value);
            return match; // Retorna o match original se não encontrar
          }
        }
        
        // Se o valor é string, adiciona aspas para comparação
        if (typeof value === 'string') {
          return `"${value}"`;
        }
        
        return String(value);
      }
      
      console.log('Variável não encontrada:', variable, 'Outputs disponíveis:', Array.from(this.nodeOutputs.keys()));
      return match;
    });
  }

  private evaluateCondition(condition: string): boolean {
    try {
      // Substitui variáveis na condição
      const processedCondition = this.replaceVariables(condition);
      
      console.log('Avaliando condição:', condition, '→', processedCondition);
      
      // Avaliação simples de condições (pode ser expandida)
      // Por exemplo: {NODE_01.sentimento} == "positivo"
      // Se torna: "positivo" == "positivo"
      
      // Para segurança, apenas permite comparações simples
      const simpleComparison = /^"([^"]*)" == "([^"]*)"$/.exec(processedCondition);
      if (simpleComparison) {
        const result = simpleComparison[1] === simpleComparison[2];
        console.log('Resultado da comparação:', simpleComparison[1], '==', simpleComparison[2], '→', result);
        return result;
      }
      
      // Tenta comparação sem aspas
      const simpleComparisonNoQuotes = /^([^=\s]+) == "([^"]*)"$/.exec(processedCondition);
      if (simpleComparisonNoQuotes) {
        const result = simpleComparisonNoQuotes[1] === simpleComparisonNoQuotes[2];
        console.log('Resultado da comparação (sem aspas):', simpleComparisonNoQuotes[1], '==', simpleComparisonNoQuotes[2], '→', result);
        return result;
      }
      
      // Outras comparações podem ser adicionadas aqui
      this.log('DECISION', 'Avaliador', 'error', `Condição não suportada: ${condition} → ${processedCondition}`);
      return false;
      
    } catch (error) {
      this.log('DECISION', 'Avaliador', 'error', `Erro ao avaliar condição: ${condition} - ${(error as Error).message}`);
      return false;
    }
  }

  getExecution(): WorkflowExecution | null {
    return this.execution;
  }

  getNodeOutputs(): Map<string, any> {
    return this.nodeOutputs;
  }
}

export default WorkflowExecutor; 