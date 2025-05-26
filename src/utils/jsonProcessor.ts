import type { JsonFlowData, JsonNodeData, FlowNode, FlowEdge } from '../types/flow';

// Processa arquivo JSON e converte para formato React Flow
export function processJsonToFlow(jsonData: JsonFlowData): { nodes: FlowNode[], edges: FlowEdge[] } {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const nodeMap = new Map<string, JsonNodeData>();

  // Cria mapa de nós para referência rápida
  jsonData.nodes.forEach(nodeData => {
    nodeMap.set(nodeData.id, nodeData);
  });

  // Calcula layout hierárquico da esquerda para direita
  const layoutedNodes = calculateHierarchicalLayout(jsonData.nodes);

  // Converte nós JSON para nós React Flow
  layoutedNodes.forEach((nodeData) => {
    const flowNode: FlowNode = {
      id: nodeData.id,
      type: 'custom',
      position: nodeData.position,
      data: {
        label: nodeData.name,
        summary: nodeData.summary,
        systemPrompt: nodeData.systemPrompt,
        userPrompt: nodeData.userPrompt,
        outputFormat: nodeData.outputFormat,
        context: nodeData.context,
        highlight: nodeData.highlight || 'default',
        nodeType: nodeData.nodeType || 'agentic',
        originalData: nodeData,
        decisions: nodeData.decisions || []
      },
    };
    nodes.push(flowNode);
  });

  // Cria arestas baseadas nas conexões nextNodes - sempre usa bezier
  jsonData.nodes.forEach(nodeData => {
    if (nodeData.nextNodes) {
      nodeData.nextNodes.forEach(nextNodeId => {
        if (nodeMap.has(nextNodeId)) {
          const edge: FlowEdge = {
            id: `${nodeData.id}-${nextNodeId}`,
            source: nodeData.id,
            target: nextNodeId,
            type: 'bezier',
          };
          edges.push(edge);
        }
      });
    }

    // Cria arestas para decisões
    if (nodeData.decisions) {
      nodeData.decisions.forEach(decision => {
        if (decision.targetNodeId && nodeMap.has(decision.targetNodeId)) {
          const edge: FlowEdge = {
            id: `${nodeData.id}-${decision.targetNodeId}-${decision.id}`,
            source: nodeData.id,
            target: decision.targetNodeId,
            type: 'bezier',
            label: decision.label,
            sourceHandle: decision.id
          };
          edges.push(edge);
        }
      });
    }
  });

  return { nodes, edges };
}

// Calcula layout hierárquico da esquerda para direita
function calculateHierarchicalLayout(nodes: JsonNodeData[]): (JsonNodeData & { position: { x: number; y: number } })[] {
  const nodeMap = new Map<string, JsonNodeData>();
  const inDegree = new Map<string, number>();
  const layers = new Map<number, string[]>();
  
  // Inicializa mapa de nós e grau de entrada
  nodes.forEach(node => {
    nodeMap.set(node.id, node);
    inDegree.set(node.id, 0);
  });

  // Calcula grau de entrada para cada nó
  nodes.forEach(node => {
    if (node.nextNodes) {
      node.nextNodes.forEach(nextId => {
        if (inDegree.has(nextId)) {
          inDegree.set(nextId, inDegree.get(nextId)! + 1);
        }
      });
    }
    
    // Considera decisões também
    if (node.decisions) {
      node.decisions.forEach(decision => {
        if (decision.targetNodeId && inDegree.has(decision.targetNodeId)) {
          inDegree.set(decision.targetNodeId, inDegree.get(decision.targetNodeId)! + 1);
        }
      });
    }
  });

  // Algoritmo de ordenação topológica por camadas
  const queue: string[] = [];
  const processed = new Set<string>();
  
  // Adiciona nós sem dependências (grau de entrada 0) à primeira camada
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });

  let currentLayer = 0;
  while (queue.length > 0) {
    const layerSize = queue.length;
    const currentLayerNodes: string[] = [];

    for (let i = 0; i < layerSize; i++) {
      const nodeId = queue.shift()!;
      currentLayerNodes.push(nodeId);
      processed.add(nodeId);

      const node = nodeMap.get(nodeId)!;
      
      // Processa nextNodes
      if (node.nextNodes) {
        node.nextNodes.forEach(nextId => {
          if (!processed.has(nextId)) {
            const newDegree = inDegree.get(nextId)! - 1;
            inDegree.set(nextId, newDegree);
            if (newDegree === 0) {
              queue.push(nextId);
            }
          }
        });
      }
      
      // Processa decisões
      if (node.decisions) {
        node.decisions.forEach(decision => {
          if (decision.targetNodeId && !processed.has(decision.targetNodeId)) {
            const newDegree = inDegree.get(decision.targetNodeId)! - 1;
            inDegree.set(decision.targetNodeId, newDegree);
            if (newDegree === 0) {
              queue.push(decision.targetNodeId);
            }
          }
        });
      }
    }

    layers.set(currentLayer, currentLayerNodes);
    currentLayer++;
  }

  // Adiciona nós restantes (ciclos) a camadas extras
  const remaining = nodes.filter(node => !processed.has(node.id));
  remaining.forEach((node, index) => {
    const layerIndex = currentLayer + Math.floor(index / 5);
    if (!layers.has(layerIndex)) {
      layers.set(layerIndex, []);
    }
    layers.get(layerIndex)!.push(node.id);
  });

  // Calcula posições baseadas nas camadas
  const layerWidth = 300;
  const nodeHeight = 180;
  const result: (JsonNodeData & { position: { x: number; y: number } })[] = [];

  layers.forEach((layerNodes, layerIndex) => {
    layerNodes.forEach((nodeId, nodeIndex) => {
      const node = nodeMap.get(nodeId)!;
      result.push({
        ...node,
        position: {
          x: layerIndex * layerWidth,
          y: nodeIndex * nodeHeight + (layerIndex % 2 === 0 ? 0 : nodeHeight / 2),
        },
      });
    });
  });

  return result;
}

// Valida estrutura do JSON
export function validateJsonStructure(jsonData: any): jsonData is JsonFlowData {
  if (!jsonData || typeof jsonData !== 'object') {
    return false;
  }

  if (!Array.isArray(jsonData.nodes)) {
    return false;
  }

  return jsonData.nodes.every((node: any) => {
    return (
      typeof node === 'object' &&
      typeof node.id === 'string' &&
      typeof node.name === 'string' &&
      (node.summary === undefined || typeof node.summary === 'string') &&
      (node.systemPrompt === undefined || typeof node.systemPrompt === 'string') &&
      (node.userPrompt === undefined || typeof node.userPrompt === 'string') &&
      (node.outputFormat === undefined || typeof node.outputFormat === 'string') &&
      (node.context === undefined || typeof node.context === 'string') &&
      (node.highlight === undefined || ['violet', 'red', 'green', 'blue', 'default'].includes(node.highlight)) &&
      (node.nodeType === undefined || ['agentic', 'decision', 'start', 'end', 'memory'].includes(node.nodeType)) &&
      (node.nextNodes === undefined || Array.isArray(node.nextNodes)) &&
      (node.decisions === undefined || Array.isArray(node.decisions))
    );
  });
}

// Lê arquivo JSON do sistema de arquivos
export async function loadJsonFile(file: File): Promise<JsonFlowData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const jsonData = JSON.parse(text);
        
        if (validateJsonStructure(jsonData)) {
          resolve(jsonData);
        } else {
          reject(new Error('Estrutura JSON inválida. Esperado: { nodes: [{ id: string, name: string, ... }], config?: {...} }'));
        }
      } catch (error) {
        reject(new Error('Erro ao analisar JSON: ' + (error as Error).message));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };
    
    reader.readAsText(file);
  });
}

// Cria dados de exemplo para demonstração
export function createSampleData(): JsonFlowData {
  return {
    nodes: [
      { 
        id: 'START_001', 
        name: 'Entrada do Usuário', 
        summary: 'Recebe input inicial do usuário',
        highlight: 'green',
        nodeType: 'start',
        nextNodes: ['PROC_001'] 
      },
      { 
        id: 'PROC_001', 
        name: 'Análise de Sentimento', 
        summary: 'Analisa o sentimento do texto',
        systemPrompt: 'Analise o sentimento do texto fornecido. Classifique como positivo, negativo ou neutro.',
        userPrompt: 'Analise o sentimento deste texto: {START_001.input}',
        outputFormat: '{"sentimento": "positivo|negativo|neutro", "confianca": 0.95}',
        highlight: 'blue',
        nodeType: 'agentic',
        nextNodes: ['DEC_001'] 
      },
      { 
        id: 'DEC_001', 
        name: 'Decisão por Sentimento', 
        summary: 'Roteia baseado no sentimento',
        highlight: 'violet',
        nodeType: 'decision',
        decisions: [
          {
            id: 'dec_pos',
            condition: '{PROC_001.sentimento} == "positivo"',
            label: 'POSITIVO',
            targetNodeId: 'PROC_002'
          },
          {
            id: 'dec_neg',
            condition: '{PROC_001.sentimento} == "negativo"',
            label: 'NEGATIVO',
            targetNodeId: 'PROC_003'
          }
        ]
      },
      { 
        id: 'PROC_002', 
        name: 'Resposta Positiva', 
        summary: 'Gera resposta para sentimento positivo',
        systemPrompt: 'Gere uma resposta encorajadora e positiva.',
        userPrompt: 'O usuário expressou sentimento positivo: {START_001.input}',
        outputFormat: '{"resposta": "texto_positivo", "emoji": "😊"}',
        highlight: 'green',
        nodeType: 'agentic',
        nextNodes: ['MEM_001'] 
      },
      { 
        id: 'PROC_003', 
        name: 'Resposta Empática', 
        summary: 'Gera resposta empática para sentimento negativo',
        systemPrompt: 'Gere uma resposta empática e de apoio.',
        userPrompt: 'O usuário expressou sentimento negativo: {START_001.input}',
        outputFormat: '{"resposta": "texto_empatico", "sugestao": "dica_de_apoio"}',
        highlight: 'red',
        nodeType: 'agentic',
        nextNodes: ['MEM_001'] 
      },
      { 
        id: 'MEM_001', 
        name: 'Armazenar Contexto', 
        summary: 'Salva o contexto da conversa',
        context: 'Conversa sobre análise de sentimento processada',
        highlight: 'blue',
        nodeType: 'memory',
        nextNodes: ['END_001'] 
      },
      { 
        id: 'END_001', 
        name: 'Finalização', 
        summary: 'Entrega resultado final',
        systemPrompt: 'Finalize a conversa de forma adequada.',
        userPrompt: 'Resultado processado com sucesso.',
        outputFormat: '{"status": "concluido", "resultado_final": "resposta_completa"}',
        highlight: 'default',
        nodeType: 'end'
      }
    ],
    config: {
      defaultModel: 'llama2',
      ollamaAddress: 'http://localhost:11434',
      availableModels: []
    }
  };
}

// Cria dataset grande para testes de performance
export function createLargeDataset(size: number): JsonFlowData {
  const nodes: JsonNodeData[] = [];
  const colors: ('violet' | 'red' | 'green' | 'blue' | 'default')[] = ['violet', 'red', 'green', 'blue', 'default'];
  const nodeTypes: ('agentic' | 'decision' | 'start' | 'end' | 'memory')[] = ['agentic', 'decision', 'start', 'end', 'memory'];
  
  for (let i = 1; i <= size; i++) {
    const nextNodes: string[] = [];
    const maxConnections = Math.min(5, Math.max(1, Math.floor(Math.random() * 5) + 1));
    
    // Conecta com nós subsequentes (evita ciclos)
    for (let j = 0; j < maxConnections && i + j + 1 <= size; j++) {
      nextNodes.push(`NODE_${String(i + j + 1).padStart(3, '0')}`);
    }
    
    nodes.push({
      id: `NODE_${String(i).padStart(3, '0')}`,
      name: `Processo ${i}`,
      summary: `Descrição do processo ${i}`,
      systemPrompt: `System prompt para o nó ${i}`,
      userPrompt: `User prompt para o nó ${i}`,
      outputFormat: `{"resultado_${i}": "valor"}`,
      highlight: colors[i % colors.length],
      nodeType: nodeTypes[i % nodeTypes.length],
      nextNodes: nextNodes.length > 0 ? nextNodes : undefined
    });
  }
  
  return { 
    nodes,
    config: {
      defaultModel: 'llama2',
      ollamaAddress: 'http://localhost:11434',
      availableModels: []
    }
  };
} 