import React, { memo, useState, useRef, useEffect } from 'react';
import type { JsonFlowData, FlowNode } from '../types/flow';

interface SideMenuProps {
  isVisible: boolean;
  onToggleVisibility: () => void;
  onLoadData: (data: JsonFlowData) => void;
  onSaveData: () => JsonFlowData;
  selectedNode: FlowNode | null;
  onEditNode: (node: FlowNode) => void;
  onCreateNode: () => void;
  onDeleteNode: (nodeId: string) => void;
  availableModels?: string[];
  defaultModel?: string;
  onConfigChange?: (config: any) => void;
  onLayoutChange?: (layout: string, nodeSpacingX: number, nodeSpacingY: number) => void;
  selectedLayout?: string;
}

const SideMenu: React.FC<SideMenuProps> = memo(({
  isVisible,
  onToggleVisibility,
  onLoadData,
  onSaveData,
  selectedNode,
  onEditNode,
  onCreateNode,
  onDeleteNode,
  availableModels,
  defaultModel,
  onConfigChange,
  onLayoutChange,
  selectedLayout
}) => {
  const [expandedSections, setExpandedSections] = useState({
    create: true,
    edit: true
  });
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const spacingOptions = [
    { label: 'Denso', valueX: 200, valueY: 150 },
    { label: 'Condensado', valueX: 250, valueY: 200 },
    { label: 'Normal', valueX: 300, valueY: 250 },
    { label: 'Espaçado', valueX: 400, valueY: 350 },
    { label: 'Esparso', valueX: 500, valueY: 450 },
  ];
  const [nodeSpacingX, setNodeSpacingX] = useState(400);
  const [nodeSpacingY, setNodeSpacingY] = useState(300);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSaveGraph = () => {
    try {
      const data = onSaveData();
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `workflow-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert('Erro ao salvar o workflow: ' + (error as Error).message);
    }
  };

  const handleLoadGraph = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as JsonFlowData;
      onLoadData(data);
    } catch (error) {
      alert('Erro ao carregar o arquivo: ' + (error as Error).message);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteSelectedNode = () => {
    if (!selectedNode) return;
    
    if (confirm(`Tem certeza que deseja excluir o nó "${selectedNode.data.label}"?`)) {
      onDeleteNode(selectedNode.id);
    }
  };

  const buttonStyle = {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  };

  const CollapsibleSection: React.FC<{
    title: string;
    icon: string;
    sectionKey: keyof typeof expandedSections;
    children: React.ReactNode;
  }> = ({ title, icon, sectionKey, children }) => {
    const isExpanded = expandedSections[sectionKey];
    
    return (
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => toggleSection(sectionKey)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            transition: 'all 0.2s'
          }}
        >
          <span>{icon} {title}</span>
          <span style={{ 
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
            transition: 'transform 0.2s',
            fontSize: '12px'
          }}>
            ▶
          </span>
        </button>
        {isExpanded && (
          <div style={{ 
            padding: '16px',
            border: '1px solid #e5e7eb',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            backgroundColor: 'white'
          }}>
            {children}
          </div>
        )}
      </div>
    );
  };

  // Funções para o resizer
  const startResizing = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      let newWidth = e.clientX;
      if (newWidth < 240) newWidth = 240;
      if (newWidth > 500) newWidth = 500;
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (onLayoutChange) {
      onLayoutChange(selectedLayout || 'dagre', nodeSpacingX, nodeSpacingY);
    }
    // eslint-disable-next-line
  }, [nodeSpacingX, nodeSpacingY, selectedLayout]);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggleVisibility}
        style={{
          position: 'fixed',
          top: '80px',
          left: isVisible ? `${sidebarWidth + 20}px` : '20px',
          zIndex: 1002,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontSize: '18px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
        }}
        title={isVisible ? 'Fechar Menu' : 'Abrir Menu'}
      >
        {isVisible ? '×' : '☰'}
      </button>

      {/* Side Menu */}
      <div
        ref={sidebarRef}
        style={{
          position: 'fixed',
          top: '60px',
          left: isVisible ? '0' : `-${sidebarWidth}px`,
          width: `${sidebarWidth}px`,
          height: 'calc(100vh - 60px)',
          background: 'white',
          borderRight: '1px solid #e5e7eb',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          zIndex: 1001,
          transition: 'left 0.3s ease, width 0.2s',
          overflowY: 'auto',
          padding: '20px',
          userSelect: isResizing ? 'none' : 'auto',
        }}
      >
        {/* Workflow - Salvar/Carregar */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '12px', letterSpacing: 0.5 }}>
            Workflow
          </div>
          <div style={{ display: 'flex', gap: '16px', flexDirection: 'row', marginBottom: '8px' }}>
            <button
              onClick={handleSaveGraph}
              style={{
                ...buttonStyle,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                flex: 1
              }}
            >
              Salvar
            </button>
            <button
              onClick={handleLoadGraph}
              style={{
                ...buttonStyle,
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                flex: 1
              }}
            >
              Carregar
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
        {/* Separador */}
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />
        {/* Fluxo - Criar/Editar lado a lado */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
            Fluxo
          </div>
          <div style={{ display: 'flex', gap: '10px', flexDirection: 'row', width: '100%' }}>
            <button
              onClick={onCreateNode}
              style={{
                ...buttonStyle,
                flex: 1,
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                color: 'white',
                fontWeight: '600',
                marginBottom: 0
              }}
            >
              ➕ Criar
            </button>
            <button
              onClick={() => selectedNode && onEditNode(selectedNode)}
              disabled={!selectedNode}
              style={{
                ...buttonStyle,
                flex: 1,
                background: selectedNode ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#e5e7eb',
                color: selectedNode ? 'white' : '#aaa',
                fontWeight: '600',
                marginBottom: 0,
                cursor: selectedNode ? 'pointer' : 'not-allowed',
                opacity: selectedNode ? 1 : 0.7
              }}
            >
              ✏️ Editar
            </button>
          </div>
        </div>
        {/* Separador */}
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />
        {/* Opções de Execução */}
        <div style={{ marginBottom: '0px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '16px', letterSpacing: 0.5 }}>
            Opções de Execução
          </div>
          <div>
            <label style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Modelo:</label>
            <select
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '13px',
                minWidth: '140px',
                backgroundColor: 'white',
                color: '#374151',
                marginTop: 4
              }}
              value={defaultModel || ''}
              onChange={e => onConfigChange && onConfigChange({ defaultModel: e.target.value })}
            >
              <option value="">Selecione o modelo</option>
              {availableModels && availableModels.length > 0 ? (
                availableModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))
              ) : (
                <option value="">Nenhum modelo disponível</option>
              )}
            </select>
          </div>
        </div>
        {/* Separador único */}
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 2px' }} />
        {/* Aparência - Layouts */}
        <div style={{ marginBottom: '32px', padding: '18px 0', borderTop: 'none', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '16px', letterSpacing: 0.5 }}>
            Aparência
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600', marginBottom: '10px', display: 'block' }}>Layout do Grafo:</label>
              <select
                style={{
                  padding: '12px 18px',
                  border: '1.5px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '15px',
                  minWidth: '180px',
                  backgroundColor: 'white',
                  color: '#374151',
                  marginTop: 6,
                  marginBottom: 6
                }}
                value={selectedLayout || 'dagre'}
                onChange={e => onLayoutChange && onLayoutChange(e.target.value || 'dagre', nodeSpacingX, nodeSpacingY)}
              >
                <option value="dagre">Dagre (Hierárquico)</option>
                <option value="elk">ELK (Ótimo)</option>
                <option value="grid">Grid</option>
                <option value="forca">Força (Force-directed)</option>
                <option value="circular">Circular</option>
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
                <option value="random">Random</option>
                <option value="tree">Árvore</option>
                <option value="camadas">Por Camadas</option>
              </select>
            </div>
            {/* Espaçamento entre nós */}
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600', marginBottom: 4, display: 'block' }}>Espaçamento Horizontal:</label>
                <select
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px',
                    width: '100%',
                    backgroundColor: 'white',
                    color: '#374151',
                  }}
                  value={nodeSpacingX}
                  onChange={e => setNodeSpacingX(Number(e.target.value))}
                >
                  {spacingOptions.map(opt => (
                    <option key={opt.label} value={opt.valueX}>{opt.label} ({opt.valueX}px)</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600', marginBottom: 4, display: 'block' }}>Espaçamento Vertical:</label>
                <select
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px',
                    width: '100%',
                    backgroundColor: 'white',
                    color: '#374151',
                  }}
                  value={nodeSpacingY}
                  onChange={e => setNodeSpacingY(Number(e.target.value))}
                >
                  {spacingOptions.map(opt => (
                    <option key={opt.label} value={opt.valueY}>{opt.label} ({opt.valueY}px)</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        {/* Resizer (spliter) */}
        <div
          onMouseDown={startResizing}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '6px',
            height: '100%',
            cursor: 'ew-resize',
            background: isResizing ? '#e5e7eb' : 'transparent',
            zIndex: 1003,
            borderRight: isResizing ? '2px solid #667eea' : 'none',
            transition: 'background 0.2s, border 0.2s',
          }}
        />
      </div>
    </>
  );
});

SideMenu.displayName = 'SideMenu';

export default SideMenu; 