interface ElectronAPI {
  getFileSize: (filePath: string) => Promise<{
    success: boolean;
    size?: number;
    lastModified?: number;
    error?: string;
  }>;
  showSaveDialog: (options?: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<{
    success: boolean;
    filePath?: string;
    canceled: boolean;
    error?: string;
  }>;
  showOpenDialog: (options?: {
    title?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<{
    success: boolean;
    filePaths?: string[];
    canceled: boolean;
    error?: string;
  }>;
  writeFile: (filePath: string, data: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  readFile: (filePath: string) => Promise<{
    success: boolean;
    data?: string;
    error?: string;
  }>;
  onNewDrawing: (callback: () => void) => void;
  onOpenDrawing: (callback: () => void) => void;
  onSaveDrawing: (callback: () => void) => void;
  onExportImage: (callback: () => void) => void;
  onZoomIn: (callback: () => void) => void;
  onZoomOut: (callback: () => void) => void;
  onZoomReset: (callback: () => void) => void;
  onShowAbout: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
