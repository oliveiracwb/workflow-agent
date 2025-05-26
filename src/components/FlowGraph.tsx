import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  useReactFlow,
  Panel,
} from 'reactflow';
import type {
  OnConnect,
  NodeTypes,
  Connection,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';

import CustomNode from './CustomNode';
import SideMenu from './SideMenu';
import NodeEditModal from './NodeEditModal';
import WorkflowToolbar from './WorkflowToolbar';
import ExecutionChat from './ExecutionChat';
import { 
  processJsonToFlow, 
  createSampleData
} from '../utils/jsonProcessor';
import { calculateGraphMetrics } from '../utils/performance';
import { ollamaService } from '../services/ollamaService';
import WorkflowExecutor from '../services/workflowExecutor';
import { useElectron } from '../hooks/useElectron';
import type { 
  JsonFlowData, 
  GraphMetrics, 
  FlowNode, 
  WorkflowConfig,
  WorkflowExecution,
  WorkflowLog
} from '../types/flow';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
  default: CustomNode,
  cluster: CustomNode,
};

const FlowGraph: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [, setMetrics] = useState<GraphMetrics>({
    nodeCount: 0,
    edgeCount: 0,
    maxDepth: 0,
    clusters: 0,
  });
  const [menuVisible, setMenuVisible] = useState(false);
  const [executionChatVisible, setExecutionChatVisible] = useState(false);
  const [, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    node: FlowNode | null;
    isCreating: boolean;
  }>({
    isOpen: false,
    node: null,
    isCreating: false
  });
  const [config, setConfig] = useState<WorkflowConfig>({
    defaultModel: '',
    ollamaAddress: import.meta.env.VITE_WF_OLLAMA_ADDRESS || 'http://localhost:11434',
    availableModels: []
  });
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<string>('dagre');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const workflowExecutor = useRef<WorkflowExecutor | null>(null);
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // Integração com Electron
  useElectron({
    onNewWorkflow: () => {
      // Limpa o workflow atual
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      setSelectedEdgeId(null);
    },
    onOpenWorkflow: async (filePath: string) => {
      try {
        const response = await fetch(`file://${filePath}`);
        const text = await response.text();
        const data = JSON.parse(text) as JsonFlowData;
        await processJsonData(data);
      } catch (error) {
        setError(`Erro ao abrir workflow: ${(error as Error).message}`);
      }
    },
    onSaveWorkflow: () => {
      handleSaveData();
    },
    onExecuteWorkflow: () => {
      handleOpenExecutionChat();
    },
    onStopExecution: () => {
      handleStopExecution();
    },
    onCreateNode: () => {
      handleCreateNode();
    }
  });

  // Inicializa o executor
  useEffect(() => {
    workflowExecutor.current = new WorkflowExecutor(config);
    workflowExecutor.current.setLogCallback((log: WorkflowLog) => {
      console.log('Workflow Log:', log);
      // Atualiza a execução com o novo log IMEDIATAMENTE
      setExecution(prev => {
        if (!prev) return prev;
        const newExecution = {
          ...prev,
          logs: [...prev.logs, log]
        };
        return newExecution;
      });
    });
  }, [config]);

  // Carrega modelos do Ollama na inicialização
  useEffect(() => {
    loadOllamaModels();
  }, []);

  const loadOllamaModels = async () => {
    try {
      const models = await ollamaService.getModels();
      setAvailableModels(models);
      
      if (models.length > 0 && !config.defaultModel) {
        setConfig(prev => ({
          ...prev,
          defaultModel: models[0],
          availableModels: models
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
    }
  };

  // Processa dados JSON e atualiza o grafo
  const processJsonData = useCallback(async (jsonData: JsonFlowData) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const { nodes: newNodes, edges: newEdges } = processJsonToFlow(jsonData);
      
      // Todas as arestas usam bezier
      const edgesWithType = newEdges.map(edge => ({
        ...edge,
        type: 'bezier'
      }));
      
      setNodes(newNodes as Node[]);
      setEdges(edgesWithType);
      
      // Atualiza configurações se presentes no JSON
      if (jsonData.config) {
        setConfig(prev => ({
          ...prev,
          ...jsonData.config
        }));
      }
      
      // Calcula métricas
      const newMetrics = calculateGraphMetrics(newNodes, newEdges);
      setMetrics(newMetrics);
      
      // Ajusta visualização
      setTimeout(() => {
        fitView({ padding: 0.1 });
      }, 100);
      
      setIsProcessing(false);
    } catch (err) {
      setError(`Erro ao processar dados: ${(err as Error).message}`);
      setIsProcessing(false);
    }
  }, [fitView, setNodes, setEdges]);

  // Handler para carregar dados
  const handleLoadData = useCallback(async (jsonData: JsonFlowData) => {
    await processJsonData(jsonData);
  }, [processJsonData]);

  // Handler para salvar dados
  const handleSaveData = useCallback((): JsonFlowData => {
    const jsonNodes = nodes.map(node => {
      const flowNode = node as FlowNode;
      return {
        id: flowNode.id,
        name: flowNode.data.label,
        summary: flowNode.data.summary,
        systemPrompt: flowNode.data.systemPrompt,
        userPrompt: flowNode.data.userPrompt,
        outputFormat: flowNode.data.outputFormat,
        context: flowNode.data.context,
        highlight: flowNode.data.highlight,
        nodeType: flowNode.data.nodeType,
        decisions: flowNode.data.decisions,
        nextNodes: edges
          .filter(edge => edge.source === flowNode.id && !edge.label)
          .map(edge => edge.target)
      };
    });

    return { 
      nodes: jsonNodes,
      config
    };
  }, [nodes, edges, config]);

  // Handler para criar novo nó
  const handleCreateNode = useCallback(() => {
    setModalState({
      isOpen: true,
      node: null,
      isCreating: true
    });
  }, []);

  // Handler para editar nó
  const handleEditNode = useCallback((node: FlowNode) => {
    setModalState({
      isOpen: true,
      node,
      isCreating: false
    });
  }, []);

  // Handler para salvar nó (criar ou editar)
  const handleSaveNode = useCallback((nodeData: any) => {
    if (modalState.isCreating) {
      // Criar novo nó (padrão antigo)
      const newId = `NODE_${Date.now()}`;
      const newNode: FlowNode = {
        id: newId,
        type: 'custom',
        position: { 
          x: Math.random() * 400 + 100, 
          y: Math.random() * 400 + 100 
        },
        data: {
          label: nodeData.name,
          summary: nodeData.summary,
          systemPrompt: nodeData.systemPrompt,
          userPrompt: nodeData.userPrompt,
          outputFormat: nodeData.outputFormat,
          context: nodeData.context,
          highlight: nodeData.highlight,
          nodeType: nodeData.nodeType,
          decisions: nodeData.decisions || [],
          originalData: {
            id: newId,
            name: nodeData.name,
            summary: nodeData.summary,
            systemPrompt: nodeData.systemPrompt,
            userPrompt: nodeData.userPrompt,
            outputFormat: nodeData.outputFormat,
            context: nodeData.context,
            highlight: nodeData.highlight,
            nodeType: nodeData.nodeType,
            decisions: nodeData.decisions
          }
        }
      };
      setNodes((currentNodes) => [...currentNodes, newNode as Node]);
    } else if (modalState.node) {
      // Editar nó existente (padrão antigo)
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === modalState.node!.id
            ? { 
                ...node, 
                data: { 
                  ...node.data, 
                  label: nodeData.name,
                  summary: nodeData.summary,
                  systemPrompt: nodeData.systemPrompt,
                  userPrompt: nodeData.userPrompt,
                  outputFormat: nodeData.outputFormat,
                  context: nodeData.context,
                  nodeType: nodeData.nodeType,
                  decisions: nodeData.decisions || []
                } 
              }
            : node
        )
      );
      if (selectedNode && selectedNode.id === modalState.node.id) {
        setSelectedNode(prev => prev ? { 
          ...prev, 
          data: { 
            ...prev.data, 
            label: nodeData.name,
            summary: nodeData.summary,
            systemPrompt: nodeData.systemPrompt,
            userPrompt: nodeData.userPrompt,
            outputFormat: nodeData.outputFormat,
            context: nodeData.context,
            nodeType: nodeData.nodeType,
            decisions: nodeData.decisions || []
          } 
        } : null);
      }
    }
    setModalState({ isOpen: false, node: null, isCreating: false });
  }, [modalState, setNodes, selectedNode]);

  // Handler para excluir nó
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((currentNodes) => currentNodes.filter(node => node.id !== nodeId));
    setEdges((currentEdges) => currentEdges.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
    
    // Limpa seleção se o nó excluído estava selecionado
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode(null);
    }
  }, [setNodes, setEdges, selectedNode]);

  // Atualiza indicação visual de execução nos nós
  const updateNodeExecutionState = useCallback((executingNodeId: string | null) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isExecuting: node.id === executingNodeId
        }
      }))
    );
  }, [setNodes]);

  // Handlers de execução do workflow
  const handleStartExecution = useCallback(async (userInput: string) => {
    if (!workflowExecutor.current) return;

    try {
      // Limpa erros anteriores
      setError(null);
      
      // Adiciona o input do usuário imediatamente ao chat
      setExecution(prev => prev ? {
        ...prev,
        logs: [...prev.logs, {
          timestamp: new Date(),
          nodeId: 'USER',
          nodeName: 'Usuário',
          type: 'user_input',
          message: userInput,
          input: userInput
        }]
      } : {
        id: `exec_${Date.now()}`,
        status: 'running',
        startTime: new Date(),
        logs: [{
          timestamp: new Date(),
          nodeId: 'USER',
          nodeName: 'Usuário',
          type: 'user_input',
          message: userInput,
          input: userInput
        }],
        userInput
      });
      
      const exec = await workflowExecutor.current.startExecution(
        nodes as FlowNode[], 
        edges as any,
        userInput
      );
      setExecution(exec);

      // Monitora mudanças no nó atual para atualizar indicação visual
      // Intervalo menor para atualizações mais frequentes
      const checkExecution = () => {
        const currentExec = workflowExecutor.current?.getExecution();
        if (currentExec) {
          setExecution(currentExec);
          updateNodeExecutionState(currentExec.currentNodeId || null);
          
          if (currentExec.status === 'running') {
            // Intervalo reduzido para 200ms para atualizações mais rápidas
            setTimeout(checkExecution, 200);
          } else {
            updateNodeExecutionState(null);
          }
        }
      };
      
      // Inicia o monitoramento imediatamente
      setTimeout(checkExecution, 100);

    } catch (error) {
      // Não mostra erro aqui, deixa o workflowExecutor logar no chat
      updateNodeExecutionState(null);
      
      // Atualiza o status da execução para erro
      if (workflowExecutor.current) {
        const currentExec = workflowExecutor.current.getExecution();
        if (currentExec) {
          setExecution(currentExec);
        }
      }
    }
  }, [nodes, edges, updateNodeExecutionState]);

  const handleOpenExecutionChat = useCallback(() => {
    setExecutionChatVisible(true);
  }, []);

  const handleStopExecution = useCallback(() => {
    if (workflowExecutor.current) {
      workflowExecutor.current.stopExecution();
      setExecution(workflowExecutor.current.getExecution());
      updateNodeExecutionState(null);
    }
  }, [updateNodeExecutionState]);

  // Handlers React Flow
  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      const newEdge = { ...params, type: 'bezier' };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node as FlowNode);
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: any) => {
    event.stopPropagation();
    setSelectedEdgeId(edge.id);
    setSelectedNode(null); // deseleciona nó
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdgeId(null);
  }, []);

  // Handler para deletar aresta selecionada
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedEdgeId && (e.key === 'Delete' || e.key === 'Backspace')) {
        setEdges((eds) => eds.filter(edge => edge.id !== selectedEdgeId));
        setSelectedEdgeId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEdgeId, setEdges]);

  // Custom edge style para destacar a aresta selecionada
  const getEdgeStyle = (edge: any) => {
    if (edge.id === selectedEdgeId) {
      return {
        stroke: '#111',
        strokeWidth: 4,
        zIndex: 10
      };
    }
    return { stroke: '#888', strokeWidth: 2 };
  };

  // Adiciona labels nas arestas de decisão
  const processEdgesWithLabels = (edges: any[]) => {
    return edges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source) as FlowNode;
      
      // Se é uma aresta de nó de decisão e tem sourceHandle
      if (sourceNode?.data.nodeType === 'decision' && edge.sourceHandle && sourceNode.data.decisions) {
        const decision = sourceNode.data.decisions.find(d => d.id === edge.sourceHandle);
        if (decision) {
          return {
            ...edge,
            label: decision.label,
            style: getEdgeStyle(edge),
            labelStyle: { 
              fontSize: '11px', 
              fontWeight: '500',
              fill: '#374151',
              backgroundColor: 'rgba(255,255,255,0.9)',
              padding: '2px 6px',
              borderRadius: '4px'
            },
            labelBgStyle: { 
              fill: 'rgba(255,255,255,0.9)', 
              fillOpacity: 0.9,
              stroke: '#e5e7eb',
              strokeWidth: 1
            }
          };
        }
      }
      
      return { ...edge, style: getEdgeStyle(edge) };
    });
  };

  // Efeito para carregar dados de exemplo na inicialização
  useEffect(() => {
    const sampleData = createSampleData();
    processJsonData(sampleData);
  }, [processJsonData]);

  // Handler para auto-organização do layout
  const handleLayoutChange = useCallback((layout: string, nodeSpacingX?: number, nodeSpacingY?: number) => {
    setSelectedLayout(layout);
    // Espaçamento padrão
    const spacingX = nodeSpacingX ?? 400;
    const spacingY = nodeSpacingY ?? 300;
    // Tamanho alvo do grafo
    let width = 2048;
    let height = 2048;
    if (containerRef.current) {
      width = (containerRef.current.offsetWidth || 1024) * 2;
      height = (containerRef.current.offsetHeight || 1024) * 2;
    }
    // Centralização
    const centerX = width / 2;
    const centerY = height / 2;
    setNodes((nodes) => nodes.map((node, i) => {
      switch (layout) {
        case 'dagre':
          return { ...node, position: { x: centerX + (i % 5) * spacingX - 500, y: centerY + Math.floor(i / 5) * spacingY - 500 } };
        case 'elk':
          return { ...node, position: { x: centerX + (i % 7) * spacingX - 500, y: centerY + Math.floor(i / 7) * spacingY - 500 } };
        case 'grid':
          return { ...node, position: { x: centerX + (i % 10) * spacingX - 500, y: centerY + Math.floor(i / 10) * spacingY - 500 } };
        case 'forca':
          return { ...node, position: { x: centerX + Math.sin(i) * spacingX, y: centerY + Math.cos(i) * spacingY } };
        case 'circular':
          return { ...node, position: { x: centerX + Math.cos((i / nodes.length) * 2 * Math.PI) * spacingX, y: centerY + Math.sin((i / nodes.length) * 2 * Math.PI) * spacingY } };
        case 'vertical':
          return { ...node, position: { x: centerX, y: centerY + i * spacingY - 500 } };
        case 'horizontal':
          return { ...node, position: { x: centerX + i * spacingX - 500, y: centerY } };
        case 'random':
          return { ...node, position: { x: centerX + (Math.random() - 0.5) * width, y: centerY + (Math.random() - 0.5) * height } };
        case 'tree':
          return { ...node, position: { x: centerX + (i % 4) * spacingX - 500, y: centerY + Math.floor(i / 4) * spacingY - 500 } };
        case 'camadas':
          return { ...node, position: { x: centerX + (i % 3) * spacingX - 500, y: centerY + Math.floor(i / 3) * spacingY - 500 } };
        default:
          return node;
      }
    }));
    setTimeout(() => {
      fitView({ padding: 0.1 });
    }, 100);
  }, [setNodes, fitView]);

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Toolbar Superior */}
      <WorkflowToolbar
        execution={execution}
        config={config}
        onStartExecution={handleOpenExecutionChat}
        onStopExecution={handleStopExecution}
        onConfigChange={setConfig}
        onLayoutChange={handleLayoutChange}
      />

      {/* React Flow */}
      <ReactFlow
        nodes={nodes}
        edges={processEdgesWithLabels(edges)}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        style={{ 
          marginLeft: menuVisible ? '300px' : '0',
          marginRight: executionChatVisible ? '400px' : '0',
          marginTop: '60px',
          height: 'calc(100vh - 60px)',
          transition: 'margin 0.3s ease',
          overflow: 'visible',
        }}
      >
        {/* MiniMap e Controles padrão no canto inferior direito, nunca cortados */}
        <MiniMap
          nodeColor={(node) => {
            return node.type === 'cluster' ? '#28a745' : '#6c757d';
          }}
          style={{
            backgroundColor: '#f8f9fa',
            position: 'absolute',
            right: executionChatVisible ? 420 : 20,
            bottom: 90,
            width: 160,
            height: 120,
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            zIndex: 10
          }}
        />
        <Controls 
          style={{
            position: 'absolute',
            right: executionChatVisible ? 420 : 20,
            bottom: 20,
            zIndex: 20,
            background: 'transparent',
            boxShadow: 'none',
            border: 'none',
            padding: 0
          }}
        />
        <Background />
      </ReactFlow>

      {/* Menu Lateral */}
      <SideMenu
        isVisible={menuVisible}
        onToggleVisibility={() => setMenuVisible(!menuVisible)}
        onLoadData={handleLoadData}
        onSaveData={handleSaveData}
        selectedNode={selectedNode}
        onEditNode={handleEditNode}
        onCreateNode={handleCreateNode}
        onDeleteNode={handleDeleteNode}
        availableModels={availableModels}
        defaultModel={config.defaultModel}
        onConfigChange={cfg => setConfig(prev => ({ ...prev, ...cfg }))}
        onLayoutChange={handleLayoutChange}
        selectedLayout={selectedLayout}
      />

      {/* Chat de Execução */}
      <ExecutionChat
        isVisible={executionChatVisible}
        onToggleVisibility={() => setExecutionChatVisible(!executionChatVisible)}
        execution={execution}
        onStartExecution={handleStartExecution}
        onStopExecution={handleStopExecution}
      />

      {/* Modal de Edição */}
      <NodeEditModal
        isOpen={modalState.isOpen}
        node={modalState.node}
        isCreating={modalState.isCreating}
        onSave={handleSaveNode}
        onCancel={() => setModalState({ isOpen: false, node: null, isCreating: false })}
        availableModels={availableModels}
      />

      {/* Mensagem de Erro */}
      {error && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: menuVisible ? '320px' : '20px',
          right: executionChatVisible ? '420px' : '20px',
          padding: '15px',
          background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
          border: '1px solid #f87171',
          borderRadius: '12px',
          color: '#991b1b',
          fontSize: '14px',
          zIndex: 1001,
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ❌ Erro:
          </div>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              color: '#991b1b',
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

const FlowGraphWrapper: React.FC = () => (
  <ReactFlowProvider>
    <FlowGraph />
  </ReactFlowProvider>
);

export default FlowGraphWrapper; 