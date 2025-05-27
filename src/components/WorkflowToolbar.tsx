import React, { useState, useEffect } from 'react';
import type { WorkflowExecution, WorkflowConfig } from '../types/flow';
import { ollamaService } from '../services/ollamaService';

interface WorkflowToolbarProps {
  execution: WorkflowExecution | null;
  config: WorkflowConfig;
  onStartExecution: () => void;
  onStopExecution: () => void;
  onConfigChange: (config: WorkflowConfig) => void;
}

const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
  execution,
  config,
  onStartExecution,
  onStopExecution,
  onConfigChange
}) => {
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    checkOllamaConnection();
    const interval = setInterval(checkOllamaConnection, 60000); // 1 min
    return () => clearInterval(interval);
  }, []);

  const checkOllamaConnection = async () => {
    try {
      setIsLoadingModels(true);
      const connected = await ollamaService.testConnection();
      setOllamaConnected(connected);
      
      if (connected) {
        if (!config.defaultModel) {
          onConfigChange({
            ...config,
            defaultModel: 'model1',
            availableModels: ['model1']
          });
        }
      }
    } catch (error) {
      console.error('Erro ao conectar com Ollama:', error);
      setOllamaConnected(false);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const getStatusColor = () => {
    if (!execution) return '#64748b';
    switch (execution.status) {
      case 'running': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'error': return '#ef4444';
      case 'stopped': return '#64748b';
      default: return '#64748b';
    }
  };

  const buttonStyle = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
    height: '36px',
    minWidth: '80px',
    justifyContent: 'center'
  };

  // Status dinâmico
  let statusText = '';
  if (execution) {
    const lastOllamaLog = execution.logs.slice().reverse().find(log => log.nodeId === 'OLLAMA' && log.type === 'info');
    if (lastOllamaLog && lastOllamaLog.message === 'Carregando o modelo na memória...') {
      statusText = 'Carregando o modelo na memória...';
    } else if (execution.status === 'completed') {
      statusText = 'Execução concluída';
    } else if (execution.status === 'running') {
      statusText = 'Executando...';
    } else if (execution.status === 'error') {
      statusText = 'Aviso';
    } else {
      statusText = 'Parado';
    }
  } else {
    statusText = 'Parado';
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      {/* Logo/Título */}
      <div style={{
        fontSize: '18px',
        fontWeight: '700',
        color: '#1f2937',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        justifyContent: 'center',
        minWidth: 260
      }}>
        <img src={process.env.NODE_ENV === 'development' ? '/icon.png' : './icon.png'} alt="Ícone" style={{ width: 52, height: 52, objectFit: 'contain', marginRight: 8, verticalAlign: 'middle' }} />
        Ollama Agents
      </div>

      {/* Status da Execução + Ollama */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        marginLeft: 'auto',
        marginRight: 0,
        minWidth: 120,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '2px 8px',
          backgroundColor: ollamaConnected ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${ollamaConnected ? '#bbf7d0' : '#fecaca'}`,
          fontSize: '13px',
          fontWeight: '500',
          width: 140,
          justifyContent: 'flex-start',
          marginBottom: 0
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: ollamaConnected ? '#10b981' : '#ef4444'
          }} />
          {ollamaConnected ? 'Ollama ON' : 'Ollama OFF'}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '2px 8px',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          fontSize: '13px',
          fontWeight: '500',
          width: 140,
          justifyContent: 'flex-start',
          marginTop: 0
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: getStatusColor()
          }} />
          Status: {statusText}
          {execution?.currentNodeId && (
            <span style={{ color: '#6b7280' }}>
              ({execution.currentNodeId})
            </span>
          )}
        </div>
      </div>

      {/* Botão Execute (unificado) */}
      <button
        onClick={execution?.status === 'running' ? onStopExecution : onStartExecution}
        disabled={!ollamaConnected || isLoadingModels}
        style={{
          ...buttonStyle,
          background: execution?.status === 'running' 
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            : '#fff',
          color: execution?.status === 'running' ? 'white' : '#10b981',
          border: execution?.status === 'running' ? 'none' : '2px solid #10b981',
          opacity: (!ollamaConnected || isLoadingModels) ? 0.6 : 1,
          fontWeight: '600',
          minWidth: '100px',
          boxShadow: 'none',
        }}
      >
        {execution?.status === 'running' ? (
          <>⏹️ Stop</>
        ) : (
          <>🚀 Execute...</>
        )}
      </button>
    </div>
  );
};

export default WorkflowToolbar; 