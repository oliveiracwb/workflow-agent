import React, { useState, useRef, useEffect } from 'react';
import type { WorkflowExecution } from '../types/flow';

interface ExecutionChatProps {
  isVisible: boolean;
  onToggleVisibility: () => void;
  execution: WorkflowExecution | null;
  onStartExecution: (userInput: string) => void;
  onStopExecution: () => void;
}

const ExecutionChat: React.FC<ExecutionChatProps> = ({
  isVisible,
  onToggleVisibility,
  execution,
  onStartExecution,
  onStopExecution
}) => {
  const [userInput, setUserInput] = useState('');
  const [expandedIndexes, setExpandedIndexes] = useState<{ [key: number]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [lastUserInput, setLastUserInput] = useState<string>('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [execution?.logs]);

  // Scroll adicional quando a execução muda de status
  useEffect(() => {
    if (execution) {
      scrollToBottom();
    }
  }, [execution?.status, execution?.currentNodeId]);

  const handleStartExecution = () => {
    if (!userInput.trim()) {
      alert('Por favor, digite uma entrada para o workflow');
      return;
    }
    setLastUserInput(userInput);
    onStartExecution(userInput);
    setUserInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStartExecution();
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'user_input': return '👤';
      case 'node_start': return '🚀';
      case 'node_complete': return '✅';
      case 'error': return '❌';
      case 'success': return '🎉';
      case 'info': return 'ℹ️';
      case 'database': return '🗄️';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'user_input': return '#3b82f6';
      case 'node_start': return '#f59e0b';
      case 'node_complete': return '#10b981';
      case 'error': return '#ef4444';
      case 'success': return '#10b981';
      case 'info': return '#6b7280';
      case 'database': return '#8B5CF6';
      case 'warning': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const formatNodeId = (nodeId: string, nodeName: string) => {
    if (nodeId === 'SYSTEM') return 'Sistema';
    return `${nodeId} [${nodeName}]`;
  };

  const toggleExpand = (index: number) => {
    setExpandedIndexes(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div style={{
      width: isVisible ? 400 : 0,
      height: '100vh',
      position: 'fixed',
      top: 60,
      right: 0,
      background: '#fff',
      boxShadow: isVisible ? '-2px 0 8px rgba(0,0,0,0.08)' : 'none',
      zIndex: 900,
      transition: 'width 0.3s',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Topo do chat */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '16px', 
          fontWeight: '600',
          color: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          💬 Execution Chat
        </h3>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => {
              if (lastUserInput) {
                setUserInput(lastUserInput);
                onStartExecution(lastUserInput);
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '16px',
              cursor: lastUserInput ? 'pointer' : 'not-allowed',
              color: lastUserInput ? '#6b7280' : '#d1d5db',
              padding: '4px'
            }}
            title="Reenviar última entrada"
            disabled={!lastUserInput}
          >
            🔄
          </button>
          <button
            onClick={onToggleVisibility}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Status */}
      {execution && (
        <div style={{
          padding: '12px 20px',
          backgroundColor: execution.status === 'running' ? '#fef3c7' : 
                          execution.status === 'completed' ? '#d1fae5' :
                          execution.status === 'error' ? '#fee2e2' : '#f3f4f6',
          borderBottom: '1px solid #e5e7eb',
          fontSize: '13px',
          fontWeight: '500',
          color: execution.status === 'running' ? '#92400e' : 
                 execution.status === 'completed' ? '#065f46' :
                 execution.status === 'error' ? '#991b1b' : '#374151'
        }}>
          {
            (() => {
              const lastOllamaLog = execution.logs.slice().reverse().find(log => log.nodeId === 'OLLAMA' && log.type === 'info');
              if (lastOllamaLog && lastOllamaLog.message === 'Carregando o modelo na memória...' && execution.status === 'running') {
                return 'Status: Carregando Modelo';
              }
              return `Status: ${execution.status === 'running' ? 'Executando...' : 
                execution.status === 'completed' ? 'Concluído' :
                execution.status === 'error' ? 'Aviso' : 'Parado'}` +
                (execution.currentNodeId && execution.status === 'running' ? ` • Step atual: ${execution.currentNodeId}` : '');
            })()
          }
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {!execution && (
          <div style={{
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '14px',
            marginTop: '40px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
            <p>Nenhuma execução iniciada</p>
            <p style={{ fontSize: '12px' }}>Clique em "🚀 Execute" para começar</p>
          </div>
        )}

        {execution?.logs.map((log, index) => (
          <div key={index} style={{
            display: 'flex',
            gap: '12px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: log.type === 'error' ? '#fef2f2' : 
                           log.type === 'user_input' ? '#eff6ff' : '#f9fafb',
            border: `1px solid ${log.type === 'error' ? '#fecaca' : 
                                 log.type === 'user_input' ? '#dbeafe' : '#e5e7eb'}`
          }}>
            <div style={{
              fontSize: '16px',
              flexShrink: 0
            }}>
              {getLogIcon(log.type)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: getLogColor(log.type),
                marginBottom: '4px'
              }}>
                {formatNodeId(log.nodeId, log.nodeName)}
                <span style={{ 
                  fontWeight: '400', 
                  color: '#6b7280',
                  marginLeft: '8px'
                }}>
                  {log.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div style={{
                fontSize: '13px',
                color: '#374151',
                lineHeight: '1.4'
              }}>
                {log.message}
              </div>
              {log.output && (
                <div style={{ marginTop: '8px' }}>
                  <button
                    onClick={() => toggleExpand(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '12px',
                      cursor: 'pointer',
                      marginBottom: '4px',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    {expandedIndexes[index] ? 'Ocultar Detalhes' : 'Mostrar Detalhes'}
                  </button>
                  {expandedIndexes[index] && (
                    <div style={{
                      marginTop: '4px',
                      padding: '8px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      color: '#1f2937',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      border: '1px solid #e5e7eb'
                    }}>
                      {typeof log.output === 'string' ? log.output : JSON.stringify(log.output, null, 2)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite a entrada inicial para o workflow..."
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              minHeight: '80px',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleStartExecution}
              disabled={!userInput.trim() || (!!execution && execution.status === 'running')}
              style={{
                flex: 1,
                padding: '10px',
                background: userInput.trim() && (!execution || execution.status !== 'running') ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: userInput.trim() && (!execution || execution.status !== 'running') ? 'pointer' : 'not-allowed'
              }}
            >
              ▶️ Enviar
            </button>
            <button
              onClick={() => {
                setUserInput('');
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('clear-execution-chat'));
                }
              }}
              style={{
                flex: 1,
                padding: '10px',
                background: '#f3f4f6',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
              title="Limpar Chat"
            >
              🧹 Limpar
            </button>
            {execution && execution.status === 'running' && (
              <button
                onClick={onStopExecution}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                ⏹️ Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutionChat; 