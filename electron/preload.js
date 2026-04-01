const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getFileSize: (filePath) => ipcRenderer.invoke('get-file-size', filePath),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  onNewDrawing: (callback) => ipcRenderer.on('new-drawing', callback),
  onOpenDrawing: (callback) => ipcRenderer.on('open-drawing', callback),
  onSaveDrawing: (callback) => ipcRenderer.on('save-drawing', callback),
  onExportImage: (callback) => ipcRenderer.on('export-image', callback),
  onZoomIn: (callback) => ipcRenderer.on('zoom-in', callback),
  onZoomOut: (callback) => ipcRenderer.on('zoom-out', callback),
  onZoomReset: (callback) => ipcRenderer.on('zoom-reset', callback),
  onShowAbout: (callback) => ipcRenderer.on('show-about', callback),
});
