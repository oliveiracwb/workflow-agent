import { useEffect } from 'react';

// Declara o tipo para a API do Electron
declare global {
  interface Window {
    electronAPI?: {
      onMenuNewWorkflow: (callback: () => void) => void;
      onMenuOpenWorkflow: (callback: (event: any, filePath: string) => void) => void;
      onMenuSaveWorkflow: (callback: () => void) => void;
      onMenuExecuteWorkflow: (callback: () => void) => void;
      onMenuStopExecution: (callback: () => void) => void;
      onMenuCreateNode: (callback: () => void) => void;
      removeAllListeners: (channel: string) => void;
      platform: string;
      versions: any;
    };
  }
}

interface ElectronHandlers {
  onNewWorkflow?: () => void;
  onOpenWorkflow?: (filePath: string) => void;
  onSaveWorkflow?: () => void;
  onExecuteWorkflow?: () => void;
  onStopExecution?: () => void;
  onCreateNode?: () => void;
}

export const useElectron = (handlers: ElectronHandlers) => {
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;

    const electronAPI = window.electronAPI;

    // Registra os handlers
    if (handlers.onNewWorkflow) {
      electronAPI.onMenuNewWorkflow(handlers.onNewWorkflow);
    }

    if (handlers.onOpenWorkflow) {
      electronAPI.onMenuOpenWorkflow((_event: any, filePath: string) => {
        handlers.onOpenWorkflow!(filePath);
      });
    }

    if (handlers.onSaveWorkflow) {
      electronAPI.onMenuSaveWorkflow(handlers.onSaveWorkflow);
    }

    if (handlers.onExecuteWorkflow) {
      electronAPI.onMenuExecuteWorkflow(handlers.onExecuteWorkflow);
    }

    if (handlers.onStopExecution) {
      electronAPI.onMenuStopExecution(handlers.onStopExecution);
    }

    if (handlers.onCreateNode) {
      electronAPI.onMenuCreateNode(handlers.onCreateNode);
    }

    // Cleanup
    return () => {
      electronAPI.removeAllListeners('menu-new-workflow');
      electronAPI.removeAllListeners('menu-open-workflow');
      electronAPI.removeAllListeners('menu-save-workflow');
      electronAPI.removeAllListeners('menu-execute-workflow');
      electronAPI.removeAllListeners('menu-stop-execution');
      electronAPI.removeAllListeners('menu-create-node');
    };
  }, [handlers, isElectron]);

  return {
    isElectron,
    platform: isElectron && window.electronAPI ? window.electronAPI.platform : 'web',
    versions: isElectron && window.electronAPI ? window.electronAPI.versions : null
  };
}; 