import React, { useState, useEffect } from 'react';
import type { FlowNode, NodeType, DecisionRule } from '../types/flow';
import { NODE_TYPES } from '../types/flow';

interface NodeEditModalProps {
  isOpen: boolean;
  node: FlowNode | null;
  isCreating: boolean;
  onSave: (nodeData: any) => void;
  onCancel: () => void;
  availableModels?: string[];
}

const NodeEditModal: React.FC<NodeEditModalProps> = ({
  isOpen,
  node,
  isCreating,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: '',
    nodeType: 'agentic' as NodeType,
    summary: '',
    systemPrompt: '',
    userPrompt: '',
    outputFormat: '',
    context: '',
    highlight: 'default' as 'violet' | 'red' | 'green' | 'blue' | 'default',
    decisions: [] as DecisionRule[]
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [newDecision, setNewDecision] = useState({
    condition: '',
    label: '',
    targetNodeId: ''
  });

  useEffect(() => {
    if (node && !isCreating) {
      setFormData({
        name: node.data.label,
        nodeType: node.data.nodeType || 'agentic',
        summary: node.data.summary || '',
        systemPrompt: node.data.systemPrompt || '',
        userPrompt: node.data.userPrompt || '',
        outputFormat: node.data.outputFormat || '',
        context: node.data.context || '',
        highlight: node.data.highlight || 'default',
        decisions: node.data.decisions || []
      });
    } else if (isCreating) {
      setFormData({
        name: '',
        nodeType: 'agentic',
        summary: '',
        systemPrompt: '',
        userPrompt: '',
        outputFormat: '',
        context: '',
        highlight: 'default',
        decisions: []
      });
    }
    setHasChanges(false);
  }, [node, isCreating, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleAddDecision = () => {
    if (!newDecision.condition || !newDecision.label) {
      alert('Condição e rótulo são obrigatórios');
      return;
    }

    const decision: DecisionRule = {
      id: `decision_${Date.now()}`,
      condition: newDecision.condition,
      label: newDecision.label,
      targetNodeId: newDecision.targetNodeId
    };

    setFormData(prev => ({
      ...prev,
      decisions: [...prev.decisions, decision]
    }));

    setNewDecision({ condition: '', label: '', targetNodeId: '' });
    setHasChanges(true);
  };

  const handleRemoveDecision = (decisionId: string) => {
    setFormData(prev => ({
      ...prev,
      decisions: prev.decisions.filter(d => d.id !== decisionId)
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Nome do workflow é obrigatório');
      return;
    }

    onSave(formData);
    setHasChanges(false);
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('Você tem alterações não salvas. Deseja descartar?')) {
        onCancel();
        setHasChanges(false);
      }
    } else {
      onCancel();
    }
  };

  const shouldShowPrompts = () => {
    return formData.nodeType === 'agentic';
  };

  const shouldShowContext = () => {
    return formData.nodeType === 'memory';
  };

  const shouldShowDecisions = () => {
    return formData.nodeType === 'decision';
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px 32px',
        maxWidth: '700px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        border: '2px solid #e5e7eb'
      }}>
        {/* Título */}
        <h2 style={{ margin: 0, fontSize: '20px', color: '#333', fontWeight: '600', marginBottom: '16px' }}>
          {isCreating ? '➕ Criar Novo Nó' : '✏️ Editar Nó'}
        </h2>
        {/* Nome do Workflow e Tipo do Nó juntos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
              Nome Workflow:
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'border-color 0.2s',
                outline: 'none'
              }}
              placeholder="Nome do workflow..."
            />
          </div>
          <div style={{ minWidth: 160 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
              Tipo do Nó:
            </label>
            <select
              value={formData.nodeType}
              onChange={(e) => handleInputChange('nodeType', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              {Object.entries(NODE_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Resumo */}
        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
            Resumo:
          </label>
          <textarea
            value={formData.summary}
            onChange={(e) => handleInputChange('summary', e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              minHeight: '40px',
              maxHeight: '40px',
              resize: 'none',
              outline: 'none',
              overflow: 'hidden'
            }}
            placeholder="Resumo do que este nó faz..."
            rows={2}
          />
        </div>

        {/* Context (apenas para Memory) */}
        {shouldShowContext() && (
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
              Context:
            </label>
            <textarea
              value={formData.context}
              onChange={(e) => handleInputChange('context', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                minHeight: '100px',
                resize: 'vertical',
                outline: 'none'
              }}
              placeholder="Contexto a ser armazenado..."
            />
          </div>
        )}

        {/* System Prompt (apenas para Agentic e End) */}
        {shouldShowPrompts() && (
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
              System Prompt:
            </label>
            <textarea
              value={formData.systemPrompt}
              onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                minHeight: '100px',
                resize: 'vertical',
                outline: 'none'
              }}
              placeholder="Instruções do sistema para o modelo..."
            />
          </div>
        )}

        {/* User Prompt (apenas para Agentic e End) */}
        {shouldShowPrompts() && (
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
              User Prompt:
            </label>
            <textarea
              value={formData.userPrompt}
              onChange={(e) => handleInputChange('userPrompt', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                minHeight: '100px',
                resize: 'vertical',
                outline: 'none'
              }}
              placeholder="Prompt do usuário..."
            />
          </div>
        )}

        {/* Formato de Saída (apenas para Agentic e End) */}
        {shouldShowPrompts() && (
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
              Formato de Saída:
            </label>
            <textarea
              value={formData.outputFormat}
              onChange={(e) => handleInputChange('outputFormat', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, Consolas, monospace',
                minHeight: '100px',
                resize: 'vertical',
                backgroundColor: '#f9fafb',
                outline: 'none'
              }}
              placeholder='{"resultado": "texto", "status": "ok"} ou TEXT'
            />
          </div>
        )}

        {/* Decisões (apenas para nós de decisão) */}
        {shouldShowDecisions() && (
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
              Regras de Decisão:
            </label>
            
            {/* Lista de decisões existentes */}
            {formData.decisions.map((decision) => (
              <div key={decision.id} style={{
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                marginBottom: '12px',
                backgroundColor: '#f9fafb'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                  {decision.label}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace', marginTop: '4px' }}>
                  {decision.condition}
                </div>
                <button
                  onClick={() => handleRemoveDecision(decision.id)}
                  style={{
                    marginTop: '8px',
                    padding: '4px 12px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Remover
                </button>
              </div>
            ))}

            {/* Adicionar nova decisão */}
            <div style={{ border: '2px dashed #d1d5db', padding: '16px', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Rótulo (ex: ANALISAR)"
                  value={newDecision.label}
                  onChange={(e) => setNewDecision(prev => ({ ...prev, label: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder='Condição (ex: {NODE_01.saida.resultado} == "ANALISAR")'
                  value={newDecision.condition}
                  onChange={(e) => setNewDecision(prev => ({ ...prev, condition: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
              <button
                onClick={handleAddDecision}
                style={{
                  padding: '8px 16px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Adicionar Decisão
              </button>
            </div>
          </div>
        )}

        {/* Botões */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '8px 16px',
              background: '#f3f4f6',
              color: '#374151',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.2s'
            }}
          >
            {isCreating ? 'Criar' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeEditModal; 