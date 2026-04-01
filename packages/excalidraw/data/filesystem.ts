/// <reference path="../../../electron/electron.d.ts" />

import {
  fileOpen as _fileOpen,
  fileSave as _fileSave,
  supported as nativeFileSystemSupported,
} from "browser-fs-access";

import { MIME_TYPES } from "@excalidraw/common";

import { normalizeFile } from "./blob";

type FILE_EXTENSION = Exclude<keyof typeof MIME_TYPES, "binary">;

export const fileOpen = async <M extends boolean | undefined = false>(opts: {
  extensions?: FILE_EXTENSION[];
  description: string;
  multiple?: M;
}): Promise<M extends false | undefined ? File : File[]> => {
  type RetType = M extends false | undefined ? File : File[];

  // Electron 环境：使用原生对话框
  if (typeof window !== "undefined" && window.electronAPI) {
    try {
      const result = await window.electronAPI.showOpenDialog({
        title: opts.description,
        filters: [
          { name: "Excalidraw", extensions: ["excalidraw"] },
          { name: "JSON", extensions: ["json"] },
          { name: "所有文件", extensions: ["*"] },
        ],
      });

      if (!result.success || !result.filePaths || result.filePaths.length === 0) {
        throw new DOMException("用户取消了文件选择", "AbortError");
      }

      const filePath = result.filePaths[0];
      const fileResult = await window.electronAPI.readFile(filePath);

      if (!fileResult.success || !fileResult.data) {
        throw new Error(fileResult.error || "读取文件失败");
      }

      const fileName = filePath.split(/[/\\]/).pop() || "untitled.excalidraw";
      const blob = new Blob([fileResult.data], { type: "application/json" });
      const file = new File([blob], fileName, { type: "application/json" });

      // 创建 mock file handle
      (file as any).handle = {
        name: fileName,
        path: filePath,
      };

      return file as RetType;
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw error;
      }
      console.error("[Electron] fileOpen error:", error);
      throw error;
    }
  }

  // 浏览器环境：使用 browser-fs-access
  const mimeTypes = opts.extensions?.reduce((mimeTypes, type) => {
    mimeTypes.push(MIME_TYPES[type]);

    return mimeTypes;
  }, [] as string[]);

  const extensions = opts.extensions?.reduce((acc, ext) => {
    if (ext === "jpg") {
      return acc.concat(".jpg", ".jpeg");
    }
    return acc.concat(`.${ext}`);
  }, [] as string[]);

  const files = await _fileOpen({
    description: opts.description,
    extensions,
    mimeTypes,
    multiple: opts.multiple ?? false,
  });

  if (Array.isArray(files)) {
    return (await Promise.all(
      files.map((file) => normalizeFile(file)),
    )) as RetType;
  }
  return (await normalizeFile(files)) as RetType;
};

export const fileSave = async (
  blob: Blob | Promise<Blob>,
  opts: {
    /** supply without the extension */
    name: string;
    /** file extension */
    extension: FILE_EXTENSION;
    mimeTypes?: string[];
    description: string;
    /** existing FileSystemFileHandle */
    fileHandle?: FileSystemFileHandle | null;
  },
) => {
  // Electron 环境：使用原生对话框
  if (typeof window !== "undefined" && window.electronAPI) {
    try {
      const resolvedBlob = await blob;
      const content = await resolvedBlob.text();

      const result = await window.electronAPI.showSaveDialog({
        title: opts.description,
        defaultPath: `${opts.name}.${opts.extension}`,
        filters: [
          { name: opts.description, extensions: [opts.extension] },
          { name: "所有文件", extensions: ["*"] },
        ],
      });

      if (!result.success || !result.filePath) {
        throw new DOMException("用户取消了保存", "AbortError");
      }

      const writeResult = await window.electronAPI.writeFile(result.filePath, content);

      if (!writeResult.success) {
        throw new Error(writeResult.error || "写入文件失败");
      }

      const fileName = result.filePath.split(/[/\\]/).pop() || `${opts.name}.${opts.extension}`;
      const mockFileHandle = {
        name: fileName,
        path: result.filePath,
      } as unknown as FileSystemFileHandle;

      return mockFileHandle;
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw error;
      }
      console.error("[Electron] fileSave error:", error);
      throw error;
    }
  }

  // 浏览器环境：使用 browser-fs-access
  return _fileSave(
    blob,
    {
      fileName: `${opts.name}.${opts.extension}`,
      description: opts.description,
      extensions: [`.${opts.extension}`],
      mimeTypes: opts.mimeTypes,
    },
    opts.fileHandle,
    false,
  );
};

export { nativeFileSystemSupported };
