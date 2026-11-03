// SVG Sanitizer for AI-Generated & User Stickers
// Parses SVG using DOMParser, enforces strict element whitelisting, attribute sanitization,
// and strips all scripts, event handlers, foreign objects, and unsafe URLs.

const ALLOWED_ELEMENTS = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'ellipse',
  'rect',
  'line',
  'polyline',
  'polygon',
  'defs',
  'lineargradient',
  'radialgradient',
  'stop',
  'clippath',
  'mask',
  'text',
  'tspan',
]);

function getParserAndSerializer() {
  if (typeof DOMParser !== 'undefined' && typeof XMLSerializer !== 'undefined') {
    return {
      Parser: DOMParser,
      Serializer: XMLSerializer,
    };
  }
  try {
    const xmldom = require('@xmldom/xmldom');
    return {
      Parser: xmldom.DOMParser,
      Serializer: xmldom.XMLSerializer,
    };
  } catch {
    return {
      Parser: null,
      Serializer: null,
    };
  }
}

/**
 * Sanitizes an SVG string against XSS, script execution, iframe injection, and malicious style URLs.
 * Returns the clean SVG string, or empty string '' if input is invalid or parsing fails.
 */
export function sanitizeSvg(rawSvg: string): string {
  if (!rawSvg || typeof rawSvg !== 'string') return '';
  const trimmed = rawSvg.trim();
  if (!trimmed) return '';

  const { Parser, Serializer } = getParserAndSerializer();
  if (!Parser || !Serializer) {
    // Fallback if no DOM environment: safe empty return
    return '';
  }

  let doc: Document;
  try {
    const parser = new Parser();
    doc = parser.parseFromString(trimmed, 'image/svg+xml');
  } catch {
    return '';
  }

  // Check for XML parsing error
  const parseError = doc.getElementsByTagName('parsererror');
  if (parseError && parseError.length > 0) {
    return '';
  }

  const root = doc.documentElement;
  if (!root || root.localName?.toLowerCase() !== 'svg' && root.tagName?.toLowerCase() !== 'svg') {
    return '';
  }

  // Recursive sanitization of elements
  const cleanElement = (el: Element): boolean => {
    const tagName = (el.localName || el.tagName || '').toLowerCase();

    // Check against allowed whitelist
    if (!ALLOWED_ELEMENTS.has(tagName)) {
      return false; // Remove element
    }

    // Inspect and clean all attributes
    const attrs = Array.from(el.attributes || []);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();
      const val = attr.value || '';

      // 1. Remove any event handlers (onload, onclick, onmouseover, etc.)
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }

      // 2. Remove href / xlink:href that is not a local fragment identifier "#id"
      if (name === 'href' || name === 'xlink:href' || attr.localName?.toLowerCase() === 'href') {
        const trimmedVal = val.trim();
        if (!trimmedVal.startsWith('#')) {
          el.removeAttribute(attr.name);
          continue;
        }
      }

      // 3. Inspect style attribute for "expression" or external url(...)
      if (name === 'style') {
        const lowerVal = val.toLowerCase();
        if (lowerVal.includes('expression')) {
          el.removeAttribute(attr.name);
          continue;
        }
        // Match url(...) and ensure it only targets local fragment #id (e.g. url(#gradient))
        if (/url\s*\(/i.test(lowerVal)) {
          const urlPattern = /url\s*\(\s*['"]?\s*([^'")]+)\s*['"]?\s*\)/gi;
          let match: RegExpExecArray | null;
          let hasUnsafeUrl = false;
          while ((match = urlPattern.exec(val)) !== null) {
            const target = match[1]?.trim() || '';
            if (!target.startsWith('#')) {
              hasUnsafeUrl = true;
              break;
            }
          }
          if (hasUnsafeUrl) {
            el.removeAttribute(attr.name);
            continue;
          }
        }
      }
    }

    // Clean children
    const childNodes = Array.from(el.childNodes);
    for (const child of childNodes) {
      if (child.nodeType === 1) {
        // Element node
        const keep = cleanElement(child as Element);
        if (!keep) {
          el.removeChild(child);
        }
      } else if (child.nodeType === 7 || child.nodeType === 8) {
        // Processing instruction or comment: remove
        el.removeChild(child);
      }
    }

    return true;
  };

  const keepRoot = cleanElement(root);
  if (!keepRoot) return '';

  try {
    const serializer = new Serializer();
    return serializer.serializeToString(root);
  } catch {
    return '';
  }
}
