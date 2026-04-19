import {
  BOUND_TEXT_PADDING,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_FAMILY,
  getFontString,
  isTestEnv,
  normalizeEOL,
} from "@excalidraw/common";

import type { FontString, ExcalidrawTextElement } from "./types";

export const measureText = (
  text: string,
  font: FontString,
  lineHeight: ExcalidrawTextElement["lineHeight"],
) => {
  const _text = text
    .split("\n")
    // replace empty lines with single space because leading/trailing empty
    // lines would be stripped from computation
    .map((x) => x || " ")
    .join("\n");

  const provider = getTextMetricsProvider();
  return provider.measureText(_text, font, lineHeight);
};

const DUMMY_TEXT = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".toLocaleUpperCase();

// FIXME rename to getApproxMinContainerWidth
export const getApproxMinLineWidth = (
  font: FontString,
  lineHeight: ExcalidrawTextElement["lineHeight"],
) => {
  const maxCharWidth = getMaxCharWidth(font);
  if (maxCharWidth === 0) {
    return (
      measureText(DUMMY_TEXT.split("").join("\n"), font, lineHeight).width +
      BOUND_TEXT_PADDING * 2
    );
  }
  return maxCharWidth + BOUND_TEXT_PADDING * 2;
};

export const getMinTextElementWidth = (
  font: FontString,
  lineHeight: ExcalidrawTextElement["lineHeight"],
) => {
  return measureText("", font, lineHeight).width + BOUND_TEXT_PADDING * 2;
};

export const isMeasureTextSupported = () => {
  const width = getTextWidth(
    DUMMY_TEXT,
    getFontString({
      fontSize: DEFAULT_FONT_SIZE,
      fontFamily: DEFAULT_FONT_FAMILY,
    }),
  );
  return width > 0;
};

export const normalizeText = (text: string) => {
  return (
    normalizeEOL(text)
      // replace tabs with spaces so they render and measure correctly
      .replace(/\t/g, "        ")
  );
};

const splitIntoLines = (text: string) => {
  return normalizeText(text).split("\n");
};

/**
 * To get unitless line-height (if unknown) we can calculate it by dividing
 * height-per-line by fontSize.
 */
export const detectLineHeight = (textElement: ExcalidrawTextElement) => {
  const lineCount = splitIntoLines(textElement.text).length;
  return (textElement.height /
    lineCount /
    textElement.fontSize) as ExcalidrawTextElement["lineHeight"];
};

/**
 * We calculate the line height from the font size and the unitless line height,
 * aligning with the W3C spec.
 */
export const getLineHeightInPx = (
  fontSize: ExcalidrawTextElement["fontSize"],
  lineHeight: ExcalidrawTextElement["lineHeight"],
) => {
  return fontSize * lineHeight;
};

// FIXME rename to getApproxMinContainerHeight
export const getApproxMinLineHeight = (
  fontSize: ExcalidrawTextElement["fontSize"],
  lineHeight: ExcalidrawTextElement["lineHeight"],
) => {
  return getLineHeightInPx(fontSize, lineHeight) + BOUND_TEXT_PADDING * 2;
};

let textMetricsProvider: TextMetricsProvider | undefined;

/**
 * Set a custom text metrics provider.
 *
 * Useful for overriding the width calculation algorithm where canvas API is not available / desired.
 */
export const setCustomTextMetricsProvider = (provider: TextMetricsProvider) => {
  textMetricsProvider = provider;
};

const getTextMetricsProvider = () => {
  if (!textMetricsProvider) {
    textMetricsProvider = new PretextTextMetricsProvider();
  }
  return textMetricsProvider;
};

export interface TextMetricsProvider {
  getLineWidth(text: string, fontString: FontString): number;
  measureText(
    text: string,
    fontString: FontString,
    lineHeight: ExcalidrawTextElement["lineHeight"],
  ): { width: number; height: number };
}

class PretextTextMetricsProvider implements TextMetricsProvider {
  private canvas: HTMLCanvasElement | null;
  private baseCharWidthCache = new Map<string, number>();

  constructor() {
    if (typeof document !== "undefined") {
      this.canvas = document.createElement("canvas");
    } else {
      this.canvas = null;
    }
  }

  private getBaseCharWidth(fontString: FontString): number {
    if (this.baseCharWidthCache.has(fontString)) {
      return this.baseCharWidthCache.get(fontString)!;
    }

    let width = 10;
    if (this.canvas && this.canvas.getContext) {
      const context = this.canvas.getContext("2d");
      if (context) {
        context.font = fontString;
        const metrics = context.measureText("a");
        width = metrics.width || parseFloat(fontString) * 0.5 || 10;
      }
    } else {
      width = parseFloat(fontString) * 0.5 || 10;
    }

    // Test environment fallback
    if (isTestEnv()) {
      width = 10;
    }

    this.baseCharWidthCache.set(fontString, width);
    return width;
  }

  public getLineWidth(text: string, fontString: FontString): number {
    const baseWidth = this.getBaseCharWidth(fontString);
    let totalWidth = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      // ASCII printable characters: English letters, numbers, symbols (space to ~)
      if (code >= 0x20 && code <= 0x7e) {
        totalWidth += baseWidth;
      } else {
        // Other characters (Chinese, etc.) are 2x
        totalWidth += baseWidth * 2;
      }
    }
    return totalWidth;
  }

  public measureText(
    text: string,
    fontString: FontString,
    lineHeight: ExcalidrawTextElement["lineHeight"],
  ) {
    const lines = text.split("\n");
    let maxWidth = 0;
    for (const line of lines) {
      const w = this.getLineWidth(line, fontString);
      if (w > maxWidth) {
        maxWidth = w;
      }
    }
    const fontSize = parseFloat(fontString) || 20;
    const height = fontSize * lineHeight * (lines.length || 1);
    return { width: maxWidth, height };
  }
}

export const getLineWidth = (text: string, font: FontString) => {
  return getTextMetricsProvider().getLineWidth(text, font);
};

export const getTextWidth = (text: string, font: FontString) => {
  const lines = splitIntoLines(text);
  let width = 0;
  lines.forEach((line) => {
    width = Math.max(width, getLineWidth(line, font));
  });

  return width;
};

export const getTextHeight = (
  text: string,
  fontSize: number,
  lineHeight: ExcalidrawTextElement["lineHeight"],
) => {
  const lineCount = splitIntoLines(text).length;
  return getLineHeightInPx(fontSize, lineHeight) * lineCount;
};

export const charWidth = (() => {
  const cachedCharWidth: { [key: FontString]: Array<number> } = {};

  const calculate = (char: string, font: FontString) => {
    const unicode = char.charCodeAt(0);
    if (!cachedCharWidth[font]) {
      cachedCharWidth[font] = [];
    }
    if (!cachedCharWidth[font][unicode]) {
      const width = getLineWidth(char, font);
      cachedCharWidth[font][unicode] = width;
    }

    return cachedCharWidth[font][unicode];
  };

  const getCache = (font: FontString) => {
    return cachedCharWidth[font];
  };

  const clearCache = (font: FontString) => {
    cachedCharWidth[font] = [];
  };

  return {
    calculate,
    getCache,
    clearCache,
  };
})();

export const getMinCharWidth = (font: FontString) => {
  const cache = charWidth.getCache(font);
  if (!cache) {
    return 0;
  }
  const cacheWithOutEmpty = cache.filter((val) => val !== undefined);

  return Math.min(...cacheWithOutEmpty);
};

export const getMaxCharWidth = (font: FontString) => {
  const cache = charWidth.getCache(font);
  if (!cache) {
    return 0;
  }
  const cacheWithOutEmpty = cache.filter((val) => val !== undefined);
  return Math.max(...cacheWithOutEmpty);
};
