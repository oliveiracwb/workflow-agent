export interface JsonNodeData {
  id: string;
  name: string;
  summary?: string;
  systemPrompt?: string;
  userPrompt?: string;
  outputFormat?: string;
  context?: string;
  highlight?: 'violet' | 'red' | 'green' | 'blue' | 'default';
  nodeType?: 'agentic' | 'decision' | 'start' | 'end' | 'memory';
  nextNodes?: string[];
  decisions?: DecisionRule[];
}

export interface DecisionRule {
  id: string;
  condition: string;
  label: string;
  targetNodeId: string;
}

export interface WorkflowConfig {
  defaultModel: string;
  ollamaAddress: string;
  availableModels: string[];
}

export interface JsonFlowData {
  nodes: JsonNodeData[];
  config?: WorkflowConfig;
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    summary?: string;
    systemPrompt?: string;
    userPrompt?: string;
    outputFormat?: string;
    context?: string;
    highlight?: 'violet' | 'red' | 'green' | 'blue' | 'default';
    nodeType?: 'agentic' | 'decision' | 'start' | 'end' | 'memory';
    originalData: JsonNodeData;
    clusteredNodes?: any[];
    decisions?: DecisionRule[];
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
  sourceHandle?: string;
}

export interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  maxDepth: number;
  clusters: number;
}

export interface WorkflowExecution {
  id: string;
  status: 'running' | 'stopped' | 'completed' | 'error';
  currentNodeId?: string;
  startTime: Date;
  endTime?: Date;
  logs: WorkflowLog[];
  userInput?: string;
}

export interface WorkflowLog {
  timestamp: Date;
  nodeId: string;
  nodeName: string;
  type: 'info' | 'error' | 'success' | 'node_start' | 'node_complete' | 'user_input' | 'database' | 'warning';
  message: string;
  input?: any;
  output?: any;
}

// Cores para destaque de nós
export const NODE_COLORS = {
  violet: '#8B5CF6',
  red: '#EF4444',
  green: '#10B981',
  blue: '#3B82F6',
  default: '#6C757D'
} as const;

// Tipos de nó disponíveis
export const NODE_TYPES = {
  agentic: 'Agentic',
  decision: 'Decision',
  start: 'Start',
  end: 'End',
  memory: 'Memory'
} as const;

export type NodeType = keyof typeof NODE_TYPES;

// Tipos de aresta disponíveis
export type EdgeType = 'straight' | 'default' | 'step' | 'smoothstep' | 'bezier' | 'simplebezier'; 