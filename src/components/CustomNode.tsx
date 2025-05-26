import React, { memo } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { NODE_COLORS } from '../types/flow';

interface CustomNodeData {
  label: string;
  summary?: string;
  systemPrompt?: string;
  userPrompt?: string;
  outputFormat?: string;
  context?: string;
  highlight?: 'violet' | 'red' | 'green' | 'blue' | 'default';
  nodeType?: 'agentic' | 'decision' | 'start' | 'end' | 'memory';
  originalData: {
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
  };
  clusteredNodes?: any[];
  decisions?: any[];
  isExecuting?: boolean;
  color?: string;
}

const CustomNode: React.FC<NodeProps<CustomNodeData>> = memo(({ data, selected }) => {
  const isCluster = data.clusteredNodes && data.clusteredNodes.length > 0;
  const highlight = data.highlight || 'default';
  const nodeType = data.nodeType || 'agentic';
  // Definir cor fixa por tipo (apenas borda)
  let borderColor = '#e5e7eb';
  switch (nodeType) {
    case 'start':
    case 'end':
      borderColor = '#e5e7eb'; // cinza
      break;
    case 'decision':
      borderColor = '#ef4444'; // vermelho
      break;
    case 'memory':
      borderColor = '#f59e42'; // laranja
      break;
    case 'agentic':
    default:
      borderColor = '#60a5fa'; // azul claro
      break;
  }
  if (selected) {
    borderColor = '#a78bfa'; // roxo
  }
  let backgroundColor = '#fff';
  const isExecuting = data.isExecuting || false;
  
  // Estilos específicos por tipo de nó
  const getNodeStyle = () => {
    const baseStyle = {
      padding: '12px 16px',
      border: `2px solid ${borderColor}`,
      boxShadow: selected ? '0 0 0 4px #ede9fe' : 'none',
      background: backgroundColor,
      color: selected ? '#6d28d9' : '#374151',
      borderRadius: 10,
      minWidth: '120px',
      minHeight: '48px',
      fontWeight: 600,
      fontSize: 15,
      transition: 'all 0.2s',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      cursor: 'pointer',
      userSelect: 'none' as const,
      animation: data.isExecuting ? 'pulse 2s infinite' : 'none'
    };

    switch (nodeType) {
      case 'start':
        return { ...baseStyle, borderRadius: '50px' };
      case 'end':
        return { ...baseStyle, borderRadius: '50px', borderWidth: '4px' };
      case 'decision':
        return { ...baseStyle, borderRadius: '12px' };
      case 'memory':
        return { ...baseStyle, borderRadius: '4px', borderStyle: 'dashed' };
      default:
        return { ...baseStyle, borderRadius: '12px' };
    }
  };

  const getNodeTypeIcon = () => {
    switch (nodeType) {
      case 'start': return '▶️';
      case 'end': return '🏁';
      case 'decision': return '❓';
      case 'memory': return '💾';
      default: return '🤖'; // agentic
    }
  };
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Node Resizer */}
      <NodeResizer 
        color={borderColor}
        isVisible={selected}
        minWidth={120}
        minHeight={80}
      />

      {/* ID único do nó (acima) */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '10px',
        color: '#9ca3af',
        backgroundColor: 'rgba(255,255,255,0.95)',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid #e5e7eb',
        fontFamily: 'JetBrains Mono, Consolas, monospace',
        fontWeight: '500'
      }}>
        {data.originalData.id}
      </div>

      {/* Indicador de execução */}
      {isExecuting && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: '#10b981',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          animation: 'pulse 1.5s infinite'
        }} />
      )}

      {/* Nó Principal */}
      <div style={getNodeStyle()}>
        {/* Handle de entrada - Esquerda */}
        <Handle 
          type="target" 
          position={Position.Left}
          style={{
            background: borderColor,
            border: '2px solid white',
            width: '12px',
            height: '12px',
          }}
        />
        
        {/* Ícone do tipo de nó */}
        <div style={{
          fontSize: '16px',
          textAlign: 'center',
          marginBottom: '4px'
        }}>
          {getNodeTypeIcon()}
        </div>
        
        {/* Título do nó */}
        <div style={{ 
          fontWeight: 'bold', 
          color: isCluster ? '#2e7d32' : '#1a1a1a',
          fontSize: '14px',
          lineHeight: '1.3',
          wordWrap: 'break-word',
          textAlign: 'center',
          minHeight: '20px'
        }}>
          {data.label}
        </div>
        
        {/* Resumo */}
        {data.summary && (
          <div style={{ 
            fontSize: '11px', 
            color: '#666',
            marginTop: '6px',
            textAlign: 'center',
            fontStyle: 'italic',
            lineHeight: '1.2'
          }}>
            {data.summary}
          </div>
        )}
        
        {/* Informações do cluster */}
        {isCluster && (
          <div style={{ 
            fontSize: '10px', 
            color: '#2e7d32',
            fontWeight: 'bold',
            marginTop: '6px',
            padding: '4px 8px',
            background: 'rgba(46, 125, 50, 0.1)',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            📦 {data.clusteredNodes!.length} nós
          </div>
        )}
        
        {/* Indicador de decisões (para nós de decisão) */}
        {nodeType === 'decision' && data.decisions && data.decisions.length > 0 && (
          <div style={{ 
            fontSize: '10px', 
            color: '#856404',
            marginTop: '6px',
            textAlign: 'center',
            backgroundColor: '#fff3cd',
            padding: '2px 6px',
            borderRadius: '3px'
          }}>
            {data.decisions.length} regra{data.decisions.length > 1 ? 's' : ''}
          </div>
        )}

        {/* Indicador de contexto (para nós memory) */}
        {nodeType === 'memory' && data.context && (
          <div style={{ 
            fontSize: '10px', 
            color: '#1e40af',
            marginTop: '6px',
            textAlign: 'center',
            backgroundColor: '#dbeafe',
            padding: '2px 6px',
            borderRadius: '3px'
          }}>
            Context
          </div>
        )}
        
        {/* Handle de saída - Direita */}
        {nodeType === 'decision' && data.decisions && data.decisions.length > 0 ? (
          // Para nós de decisão, criar um handle para cada regra
          data.decisions.map((decision, index) => (
            <Handle 
              key={decision.id}
              id={decision.id}
              type="source" 
              position={Position.Right}
              style={{
                background: borderColor,
                border: '2px solid white',
                width: '10px',
                height: '10px',
                top: `${20 + (index * 25)}px`,
                right: '-5px'
              }}
            />
          ))
        ) : (
          // Handle padrão para outros tipos de nó
          <Handle 
            type="source" 
            position={Position.Right}
            style={{
              background: borderColor,
              border: '2px solid white',
              width: '12px',
              height: '12px',
            }}
          />
        )}
      </div>

      {/* CSS para animação */}
      <style>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
      `}</style>
    </div>
  );
});

CustomNode.displayName = 'CustomNode';

export default CustomNode; 