import debounce from 'lodash.debounce';
import throttle from 'lodash.throttle';
import type { FlowNode, FlowEdge, GraphMetrics } from '../types/flow';

// Configurações de performance
export const PERFORMANCE_CONFIG = {
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 16, // ~60fps
  CLUSTER_DISTANCE: 100,
  VIEWPORT_BUFFER: 200,
  MAX_VISIBLE_NODES: 1000,
  LAYOUT_ITERATIONS: 50,
};

// Cache para layouts calculados
const layoutCache = new Map<string, FlowNode[]>();

// Debounced function para recalcular layout
export const debouncedLayoutCalculation = debounce(
  (nodes: FlowNode[], callback: (nodes: FlowNode[]) => void) => {
    const optimizedNodes = calculateOptimizedLayout(nodes);
    callback(optimizedNodes);
  },
  PERFORMANCE_CONFIG.DEBOUNCE_DELAY
);

// Throttled function para scroll/pan do viewport
export const throttledViewportUpdate = throttle(
  (viewport: { x: number; y: number; zoom: number }, callback: (viewport: any) => void) => {
    callback(viewport);
  },
  PERFORMANCE_CONFIG.THROTTLE_DELAY
);

// Calcula layout otimizado usando algoritmo de força
export function calculateOptimizedLayout(nodes: FlowNode[]): FlowNode[] {
  const cacheKey = nodes.map(n => n.id).sort().join(',');
  
  if (layoutCache.has(cacheKey)) {
    return layoutCache.get(cacheKey)!;
  }

  // Algoritmo de layout simples mas eficiente
  const layoutNodes = nodes.map((node, index) => ({
    ...node,
    position: {
      x: (index % 10) * 200,
      y: Math.floor(index / 10) * 150,
    }
  }));

  // Aplica força para separar nós sobrepostos
  for (let i = 0; i < PERFORMANCE_CONFIG.LAYOUT_ITERATIONS; i++) {
    applyForces(layoutNodes);
  }

  layoutCache.set(cacheKey, layoutNodes);
  return layoutNodes;
}

// Aplica forças de repulsão entre nós
function applyForces(nodes: FlowNode[]) {
  const force = 0.1;
  const minDistance = 150;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      
      const dx = nodeB.position.x - nodeA.position.x;
      const dy = nodeB.position.y - nodeA.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance && distance > 0) {
        const repulsion = (minDistance - distance) * force;
        const angle = Math.atan2(dy, dx);
        
        nodeA.position.x -= Math.cos(angle) * repulsion;
        nodeA.position.y -= Math.sin(angle) * repulsion;
        nodeB.position.x += Math.cos(angle) * repulsion;
        nodeB.position.y += Math.sin(angle) * repulsion;
      }
    }
  }
}

// Filtra nós visíveis baseado no viewport
export function getVisibleNodes(
  nodes: FlowNode[],
  viewport: { x: number; y: number; zoom: number; width: number; height: number }
): FlowNode[] {
  const buffer = PERFORMANCE_CONFIG.VIEWPORT_BUFFER;
  const scale = viewport.zoom;
  
  const visibleArea = {
    left: -viewport.x / scale - buffer,
    top: -viewport.y / scale - buffer,
    right: (-viewport.x + viewport.width) / scale + buffer,
    bottom: (-viewport.y + viewport.height) / scale + buffer,
  };

  return nodes.filter(node => {
    const nodeRight = node.position.x + 200; // assumindo largura do nó
    const nodeBottom = node.position.y + 100; // assumindo altura do nó
    
    return (
      node.position.x < visibleArea.right &&
      nodeRight > visibleArea.left &&
      node.position.y < visibleArea.bottom &&
      nodeBottom > visibleArea.top
    );
  }).slice(0, PERFORMANCE_CONFIG.MAX_VISIBLE_NODES);
}

// Agrupa nós próximos em clusters
export function clusterNodes(nodes: FlowNode[]): FlowNode[] {
  if (nodes.length < 100) return nodes; // Não clusterizar grafos pequenos
  
  const clusters: FlowNode[][] = [];
  const visited = new Set<string>();
  
  nodes.forEach(node => {
    if (visited.has(node.id)) return;
    
    const cluster = [node];
    visited.add(node.id);
    
    // Encontra nós próximos
    nodes.forEach(otherNode => {
      if (visited.has(otherNode.id)) return;
      
      const distance = Math.sqrt(
        Math.pow(node.position.x - otherNode.position.x, 2) +
        Math.pow(node.position.y - otherNode.position.y, 2)
      );
      
      if (distance < PERFORMANCE_CONFIG.CLUSTER_DISTANCE) {
        cluster.push(otherNode);
        visited.add(otherNode.id);
      }
    });
    
    clusters.push(cluster);
  });
  
  // Cria nós de cluster se necessário
  return clusters.map(cluster => {
    if (cluster.length === 1) return cluster[0];
    
    // Cria um nó representando o cluster
    const centerX = cluster.reduce((sum, n) => sum + n.position.x, 0) / cluster.length;
    const centerY = cluster.reduce((sum, n) => sum + n.position.y, 0) / cluster.length;
    
    return {
      id: `cluster-${cluster.map(n => n.id).join('-')}`,
      type: 'cluster',
      position: { x: centerX, y: centerY },
      data: {
        label: `Cluster (${cluster.length} nós)`,
        originalData: {
          id: `cluster-${cluster.length}`,
          name: `Cluster de ${cluster.length} nós`,
        },
        clusteredNodes: cluster,
      },
    } as FlowNode;
  });
}

// Calcula métricas do grafo
export function calculateGraphMetrics(nodes: FlowNode[], edges: FlowEdge[]): GraphMetrics {
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    maxDepth: calculateMaxDepth(nodes, edges),
    clusters: Math.ceil(nodes.length / 50), // Estimativa
  };
}

function calculateMaxDepth(nodes: FlowNode[], edges: FlowEdge[]): number {
  // Implementação simples de BFS para encontrar profundidade máxima
  const adjacencyList = new Map<string, string[]>();
  
  edges.forEach(edge => {
    if (!adjacencyList.has(edge.source)) {
      adjacencyList.set(edge.source, []);
    }
    adjacencyList.get(edge.source)!.push(edge.target);
  });
  
  let maxDepth = 0;
  const visited = new Set<string>();
  
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const depth = dfs(node.id, adjacencyList, visited, 0);
      maxDepth = Math.max(maxDepth, depth);
    }
  });
  
  return maxDepth;
}

function dfs(nodeId: string, adjacencyList: Map<string, string[]>, visited: Set<string>, depth: number): number {
  visited.add(nodeId);
  let maxChildDepth = depth;
  
  const children = adjacencyList.get(nodeId) || [];
  children.forEach(childId => {
    if (!visited.has(childId)) {
      const childDepth = dfs(childId, adjacencyList, visited, depth + 1);
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    }
  });
  
  return maxChildDepth;
} 