import React, { memo } from 'react';
import type { GraphMetrics, EdgeType } from '../types/flow';

interface PerformancePanelProps {
  metrics: GraphMetrics;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onLoadSample: () => void;
  onLoadLarge: (size: number) => void;
  onFileUpload: (file: File) => void;
  isProcessing: boolean;
  edgeType: EdgeType;
  onEdgeTypeChange: (edgeType: EdgeType) => void;
}

const PerformancePanel: React.FC<PerformancePanelProps> = memo(({
  metrics,
  isVisible,
  onToggleVisibility,
  onLoadSample,
  onLoadLarge,
  onFileUpload,
  isProcessing,
  edgeType,
  onEdgeTypeChange
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const edgeTypesList: EdgeType[] = ['straight', 'default', 'step', 'smoothstep', 'bezier', 'simplebezier'];
  const edgeTypeLabels = {
    straight: '📏 Reta',
    default: '🔹 Padrão', 
    step: '📐 Escada',
    smoothstep: '🟫 Cantos',
    bezier: '🌊 Curva',
    simplebezier: '〰️ Simples'
  };

  const handleCycleEdgeType = () => {
    const currentIndex = edgeTypesList.indexOf(edgeType);
    const nextIndex = (currentIndex + 1) % edgeTypesList.length;
    onEdgeTypeChange(edgeTypesList[nextIndex]);
  };

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      zIndex: 1000,
      background: 'white',
      border: '1px solid #ddd',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      minWidth: '250px',
    }}>
      {/* Header */}
      <div
        style={{
          padding: '10px',
          borderBottom: '1px solid #eee',
          cursor: 'pointer',
          background: '#f8f9fa',
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        onClick={onToggleVisibility}
      >
        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
          📊 Controles & Métricas
        </span>
        <span style={{ transform: isVisible ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </div>

      {/* Content */}
      {isVisible && (
        <div style={{ padding: '15px' }}>
          {/* Edge Type Cycle Button */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
              🔗 Tipo de Linha:
            </label>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              background: 'white'
            }}>
              <button
                onClick={handleCycleEdgeType}
                disabled={isProcessing}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid #007bff',
                  background: '#007bff',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#0056b3';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#007bff';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Clique para alternar tipos de linha"
              >
                +
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '13px', 
                  fontWeight: 'bold',
                  color: '#333'
                }}>
                  {edgeTypeLabels[edgeType]}
                </div>
                <div style={{ 
                  fontSize: '10px', 
                  color: '#666',
                  marginTop: '2px'
                }}>
                  {edgeType} • Clique no + para trocar
                </div>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
              📁 Carregar Arquivo JSON:
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              disabled={isProcessing}
              style={{
                width: '100%',
                padding: '5px',
                fontSize: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>

          {/* Sample Data Buttons */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
              🧪 Dados de Teste:
            </label>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              <button
                onClick={onLoadSample}
                disabled={isProcessing}
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  border: '1px solid #007bff',
                  background: '#007bff',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Exemplo
              </button>
              <button
                onClick={() => onLoadLarge(100)}
                disabled={isProcessing}
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  border: '1px solid #28a745',
                  background: '#28a745',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                100 nós
              </button>
              <button
                onClick={() => onLoadLarge(500)}
                disabled={isProcessing}
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  border: '1px solid #ffc107',
                  background: '#ffc107',
                  color: 'black',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                500 nós
              </button>
              <button
                onClick={() => onLoadLarge(1000)}
                disabled={isProcessing}
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  border: '1px solid #dc3545',
                  background: '#dc3545',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                1000 nós
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
              📈 Métricas do Grafo:
            </label>
            <div style={{ fontSize: '11px', color: '#666' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Nós:</span>
                <span style={{ fontWeight: 'bold' }}>{metrics.nodeCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Arestas:</span>
                <span style={{ fontWeight: 'bold' }}>{metrics.edgeCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Prof. Máx:</span>
                <span style={{ fontWeight: 'bold' }}>{metrics.maxDepth}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Clusters:</span>
                <span style={{ fontWeight: 'bold' }}>{metrics.clusters}</span>
              </div>
            </div>
          </div>

          {/* Performance Info */}
          <div style={{ 
            padding: '8px', 
            background: '#e8f5e9', 
            borderRadius: '4px',
            fontSize: '10px',
            color: '#2e7d32'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>🚀 Otimizações Ativas:</div>
            <div>• Viewport culling</div>
            <div>• Clustering automático</div>
            <div>• Layout com cache</div>
            <div>• Debouncing (300ms)</div>
            <div>• Máx. 1000 nós visíveis</div>
          </div>

          {isProcessing && (
            <div style={{
              marginTop: '10px',
              padding: '8px',
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#856404',
              textAlign: 'center'
            }}>
              ⏳ Processando...
            </div>
          )}
        </div>
      )}
    </div>
  );
});

PerformancePanel.displayName = 'PerformancePanel';

export default PerformancePanel; 