import {
  getFontString,
  getFontFamilyString,
  randomId,
} from "@excalidraw/common";

import {
  getTextWidth,
  charWidth,
  getLineHeightInPx,
} from "@excalidraw/element";

import {
  newTextNativeElement,
} from "@excalidraw/element";

import type {
  ExcalidrawTextNativeElement,
} from "@excalidraw/element/types";

import type { FontString } from "@excalidraw/element/types";

import type App from "../components/App";
import type { AppState } from "../types";

type SubmitHandler = () => void;

const getLineHeightPx = (element: ExcalidrawTextNativeElement) => {
  return getLineHeightInPx(element.fontSize, element.lineHeight as any);
};

export const textNativeWysiwyg = ({
  id,
  onChange,
  onSubmit,
  getViewportCoords,
  element,
  canvas,
  excalidrawContainer,
  app,
  getText,
  initialPointerDownSceneCoords,
  initialPointerDownClientCoords,
}: {
  id: ExcalidrawTextNativeElement["id"];
  onChange?: (nextText: string) => void;
  onSubmit: (data: { viaKeyboard: boolean; nextOriginalText: string }) => void;
  getViewportCoords: (x: number, y: number) => [number, number];
  element: ExcalidrawTextNativeElement;
  canvas: HTMLCanvasElement;
  excalidrawContainer: HTMLDivElement | null;
  app: App;
  getText?: () => string;
  initialPointerDownSceneCoords?: { x: number; y: number };
  initialPointerDownClientCoords?: { x: number; y: number };
}): SubmitHandler => {
  const appState = app.state;
  const [viewportX, viewportY] = getViewportCoords(element.x, element.y);

  const editorContainer = document.createElement("div");
  editorContainer.classList.add("excalidraw-text-native-editor");

  Object.assign(editorContainer.style, {
    position: "absolute",
    display: "inline-block",
    left: `${viewportX}px`,
    top: `${viewportY}px`,
    width: `${element.width}px`,
    height: `${element.height}px`,
    zIndex: "var(--zIndex-wysiwyg)",
  });

  const editable = document.createElement("textarea");
  editable.classList.add("excalidraw-wysiwyg");
  editable.classList.add("excalidraw-text-native-textarea");
  editable.dir = "auto";
  editable.tabIndex = 0;
  editable.spellcheck = false;
  editable.dataset.type = "wysiwyg";
  editable.value = getText ? getText() : element.originalText;

  Object.assign(editable.style, {
    position: "absolute",
    display: "inline-block",
    left: "0",
    top: "0",
    width: `${element.width}px`,
    height: `${element.height}px`,
    font: getFontString(element),
    lineHeight: `${getLineHeightPx(element)}px`,
    color: element.strokeColor || "#1e1e1e",
    background: "transparent",
    border: "1px dashed #a8a8a8",
    outline: "none",
    resize: "both",
    overflow: "hidden",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    zIndex: "var(--zIndex-wysiwyg)",
    boxSizing: "border-box",
    padding: "0",
    margin: "0",
    WebkitBoxSizing: "border-box",
    caretColor: "currentColor",
    opacity: (element.opacity ?? 100) / 100,
  });

  editorContainer.appendChild(editable);

  if (excalidrawContainer) {
    excalidrawContainer.appendChild(editorContainer);
  }

  setTimeout(() => {
    editable.focus();
  }, 0);

  const handleInput = () => {
    const text = editable.value;
    if (onChange) {
      onChange(text);
    }
    const textElement = app.scene.getElement<ExcalidrawTextNativeElement>(id);
    if (textElement) {
      editable.style.height = "auto";
      const newHeight = editable.scrollHeight;
      editable.style.height = `${newHeight}px`;
      editorContainer.style.height = `${newHeight}px`;
      app.scene.mutateElement(textElement, {
        height: newHeight,
        originalText: text,
        text: text,
      });
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      submitText();
    }
  };

  const submitText = () => {
    const text = editable.value;
    if (editorContainer.parentNode) {
      editorContainer.remove();
    }
    onSubmit({ viaKeyboard: true, nextOriginalText: text });
  };

  editable.addEventListener("input", handleInput);
  editable.addEventListener("keydown", handleKeyDown);
  editable.addEventListener("blur", () => {
    submitText();
  });

  return submitText;
};

export const createTextNativeElement = (
  app: App,
  x: number,
  y: number,
): ExcalidrawTextNativeElement => {
  const textNativeElement = newTextNativeElement({
    text: "",
    x,
    y,
    width: 200,
    height: 50,
    strokeColor: app.state.currentItemStrokeColor,
    backgroundColor: "transparent",
  });

  return textNativeElement;
};