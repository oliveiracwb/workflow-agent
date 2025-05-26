const { contextBridge, ipcRenderer } = require('electron');

// Expõe APIs seguras para o processo renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Eventos do menu
  onMenuNewWorkflow: (callback) => ipcRenderer.on('menu-new-workflow', callback),
  onMenuOpenWorkflow: (callback) => ipcRenderer.on('menu-open-workflow', callback),
  onMenuSaveWorkflow: (callback) => ipcRenderer.on('menu-save-workflow', callback),
  onMenuExecuteWorkflow: (callback) => ipcRenderer.on('menu-execute-workflow', callback),
  onMenuStopExecution: (callback) => ipcRenderer.on('menu-stop-execution', callback),
  onMenuCreateNode: (callback) => ipcRenderer.on('menu-create-node', callback),

  // Remover listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // Informações do sistema
  platform: process.platform,
  versions: process.versions
}); 