/// <reference path="../../../electron/electron.d.ts" />

export const getFileSize = async (
  fileHandle: FileSystemFileHandle | { path: string } | null,
): Promise<{ size: number; lastModified: number } | null> => {
  if (!fileHandle) {
    return null;
  }

  if (typeof window !== "undefined" && window.electronAPI) {
    const filePath = "path" in fileHandle ? fileHandle.path : null;
    if (!filePath) {
      return null;
    }
    const result = await window.electronAPI.getFileSize(filePath);
    if (result.success && result.size !== undefined) {
      return {
        size: result.size,
        lastModified: result.lastModified || Date.now(),
      };
    }
    return null;
  }

  if ("getFile" in fileHandle) {
    try {
      const file = await fileHandle.getFile();
      return {
        size: file.size,
        lastModified: file.lastModified,
      };
    } catch {
      return null;
    }
  }

  return null;
};

export const formatFileSize = (bytes: number): string => {
  return `${bytes.toLocaleString()} B`;
};
