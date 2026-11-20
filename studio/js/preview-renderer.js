import { compileX } from "../../languages/x/index.js";
import { compileXSharp } from "../../languages/xsharp/index.js";
import { compileXS } from "../../languages/xs/index.js";

const TAGS = {
  App: "div", Page: "main", Section: "section", Container: "div",
  Header: "header", Footer: "footer", Navbar: "nav", Navigation: "nav",
  Main: "main", Aside: "aside", Article: "article", Heading: "h1",
  Paragraph: "p", Text: "span", Label: "label", Button: "button",
  Link: "a", Image: "img", Icon: "span", Input: "input",
  Textarea: "textarea", Select: "select", Option: "option",
  Checkbox: "input", Radio: "input", Form: "form", Field: "fieldset",
  Card: "article", Panel: "section", Modal: "section", Dialog: "dialog",
  Table: "table", TableRow: "tr", TableCell: "td", List: "ul",
  ListItem: "li", Video: "video", Audio: "audio", Canvas: "canvas",
  Progress: "progress", Badge: "span", Divider: "hr",
  Component: "div", Slot: "div"
};

const STYLE_MAP = {
  backgroundColor: "background-color", fontSize: "font-size",
  fontWeight: "font-weight", fontFamily: "font-family",
  fontStyle: "font-style", textAlign: "text-align",
  textDecoration: "text-decoration", lineHeight: "line-height",
  letterSpacing: "letter-spacing", borderColor: "border-color",
  borderWidth: "border-width", borderStyle: "border-style",
  paddingTop: "padding-top", paddingRight: "padding-right",
  paddingBottom: "padding-bottom", paddingLeft: "padding-left",
  marginTop: "margin-top", marginRight: "margin-right",
  marginBottom: "margin-bottom", marginLeft: "margin-left",
  minWidth: "min-width", maxWidth: "max-width",
  minHeight: "min-height", maxHeight: "max-height",
  alignItems: "align-items", justifyContent: "justify-content",
  flexGrow: "flex-grow", flexShrink: "flex-shrink",
  objectFit: "object-fit", objectPosition: "object-position",
  zIndex: "z-index", radius: "border-radius", shadow: "box-shadow"
};

const ALLOWED_STYLES = new Set([
  "width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight",
  "size", "color", "background", "backgroundColor", "padding",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "margin", "marginTop", "marginRight", "marginBottom", "marginLeft",
  "gap", "rowGap", "columnGap", "align", "alignItems", "justify",
  "justifyContent", "orientation", "layout", "display", "direction",
  "position", "top", "right", "bottom", "left", "font", "fontSize",
  "fontWeight", "fontFamily", "fontStyle", "lineHeight", "letterSpacing",
  "textAlign", "textDecoration", "border", "borderColor", "borderWidth",
  "borderStyle", "radius", "shadow", "opacity", "visible", "overflow",
  "zIndex", "cursor", "wrap", "columns", "rows", "flex", "flexGrow",
  "flexShrink", "objectFit", "objectPosition", "outline", "transform",
  "transition", "animation", "filter"
]);

function safeStyleValue(value) {
  const text = String(value).trim();
  if (!text || /[;{}<>]/.test(text)) return null;
  if (/url\s*\(|expression\s*\(|javascript:/i.test(text)) return null;
  return text;
}

function cssValue(key, value) {
  if (typeof value === "number") {
    if (["opacity", "zIndex", "flex", "flexGrow", "flexShrink"].includes(key)) {
      return String(value);
    }
    return `${value}px`;
  }
  return safeStyleValue(value);
}

function applyStyles(element, properties = {}) {
  for (const [key, raw] of Object.entries(properties)) {
    if (!ALLOWED_STYLES.has(key)) continue;

    if (key === "visible" && raw === false) {
      element.style.display = "none";
      continue;
    }
    if (key === "size") {
      const value = cssValue("width", raw);
      if (value !== null) {
        element.style.width = value;
        element.style.height = value;
      }
      continue;
    }
    if (key === "layout") {
      element.style.display = raw === "grid" ? "grid" : "flex";
      if (raw !== "grid") {
        element.style.flexDirection =
          raw === "horizontal" ? "row" : "column";
      }
      continue;
    }
    if (key === "direction" || key === "orientation") {
      element.style.flexDirection =
        raw === "vertical" ? "column" :
        raw === "horizontal" ? "row" : String(raw);
      continue;
    }
    if (key === "align") {
      element.style.alignItems = String(raw);
      continue;
    }
    if (key === "justify") {
      element.style.justifyContent = String(raw);
      continue;
    }
    const cssName = STYLE_MAP[key] ||
      key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    const value = cssValue(key, raw);
    if (value !== null) element.style.setProperty(cssName, value);
  }
}

function applyAttributes(element, props = {}) {
  const allowed = [
    "id", "title", "alt", "placeholder", "name",
    "value", "type", "role", "for", "colspan", "rowspan"
  ];
  for (const key of allowed) {
    if (props[key] !== undefined && props[key] !== null) {
      element.setAttribute(key, String(props[key]));
    }
  }
  if (props.class) {
    element.className = String(props.class).replace(/[^a-zA-Z0-9 _-]/g, "");
  }
  if (props.disabled === true) element.disabled = true;
  if (props.checked === true) element.checked = true;

  if (props.href && element.tagName === "A") {
    const href = String(props.href).trim();
    if (/^(https?:|\/|#|\.\.?\/)/i.test(href)) element.setAttribute("href", href);
  }
  if (props.src && element.tagName === "IMG") {
    const src = String(props.src).trim();
    if (/^(https?:|\/|\.\.?\/)/i.test(src)) element.setAttribute("src", src);
  }
}

function textValue(props = {}) {
  for (const key of ["text", "content", "label", "value", "title"]) {
    if (props[key] !== undefined && props[key] !== null) return String(props[key]);
  }
  return "";
}

function normalizeName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function collectStyles(nodes, map = new Map()) {
  for (const node of nodes || []) {
    map.set(normalizeName(node.name), node.properties || {});
    map.set(`type:${normalizeName(node.type)}`, node.properties || {});
    collectStyles(node.children, map);
  }
  return map;
}

function findRootStyles(nodes) {
  for (const node of nodes || []) {
    if (["device", "screen"].includes(String(node.type).toLowerCase())) {
      return node.properties || {};
    }
  }
  return null;
}

function renderNode(node, styles, parent) {
  const tag = TAGS[node.type] || "div";
  const element = document.createElement(tag);
  const props = node.properties || {};
  element.dataset.crossComponent = node.type;
  element.dataset.crossName = node.name;

  applyAttributes(element, props);
  applyStyles(element, props);

  const design = styles.get(normalizeName(node.name)) ||
    styles.get(`type:${normalizeName(node.type)}`);
  if (design) applyStyles(element, design);

  if (["Checkbox", "Radio"].includes(node.type)) {
    element.type = node.type.toLowerCase();
  } else if (!["Image", "Divider", "Input"].includes(node.type)) {
    const text = textValue(props);
    if (text) element.textContent = text;
  }
  if (node.type === "Button") element.type = "button";
  if (node.type === "Input") element.type = props.type || "text";
  if (node.type === "Link" && !element.hasAttribute("href")) {
    element.setAttribute("href", "#");
  }
  for (const child of node.children || []) renderNode(child, styles, element);
  parent.append(element);
}

export function renderCROSS({ x, xsharp = "", xs = "" }, target) {
  if (!target) throw new Error("Preview target element is missing.");
  target.replaceChildren();

  const structure = compileX(x);
  const design = xsharp.trim()
    ? compileXSharp(xsharp)
    : { components: [] };
  const logic = xs.trim() ? compileXS(xs) : null;
  const styles = collectStyles(design.components);
  const rootStyles = findRootStyles(design.components);

  if (rootStyles) applyStyles(target, rootStyles);
  for (const root of structure.tree) renderNode(root, styles, target);

  return {
    structure,
    design,
    logic,
    componentCount: countNodes(structure.tree),
    xsFunctions: logic ? logic.functions.map(fn => fn.name) : []
  };
}

function countNodes(nodes) {
  return (nodes || []).reduce(
    (total, node) => total + 1 + countNodes(node.children),
    0
  );
}
