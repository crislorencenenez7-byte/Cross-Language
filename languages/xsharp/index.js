export const XSHARP_COMPONENTS = [
  "device","screen","app","page","section","container",
  "header","footer","navbar","navigation","main","aside",
  "article","heading","paragraph","text","label","button",
  "link","image","icon","input","textarea","select","option",
  "checkbox","radio","form","field","card","panel","modal",
  "dialog","table","list","listitem","video","audio","canvas",
  "progress","badge","divider","component","slot"
];

export const XSHARP_DATATYPES = [
  "Color","Dimension","Width","Height","Spacing","Padding",
  "Margin","Position","Alignment","Display","Flex","Grid",
  "Typography","Font","Border","Radius","Shadow","Opacity",
  "Transform","Transition","Animation","Breakpoint",
  "Responsive","ZIndex","Overflow"
];

export const XSHARP_PROPERTIES = [
  "width","height","minWidth","maxWidth","minHeight","maxHeight",
  "size","color","background","backgroundColor","padding",
  "paddingTop","paddingRight","paddingBottom","paddingLeft",
  "margin","marginTop","marginRight","marginBottom","marginLeft",
  "gap","rowGap","columnGap","align","alignItems","justify",
  "justifyContent","orientation","layout","display","direction",
  "position","top","right","bottom","left","font","fontSize",
  "fontWeight","fontFamily","fontStyle","lineHeight",
  "letterSpacing","textAlign","textDecoration","border",
  "borderColor","borderWidth","borderStyle","radius","shadow",
  "opacity","visible","overflow","zIndex","transform",
  "transition","animation","cursor","wrap","columns","rows",
  "grid","flex","flexGrow","flexShrink","objectFit",
  "objectPosition","outline","filter","breakpoint","responsive",
  "hoverColor","activeColor"
];

function parseValue(raw) {
  const v = raw.trim().replace(/;$/, "");

  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;

  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) return v.slice(1, -1);

  return v;
}

export function compileXSharp(source) {
  const lines = source.split(/\r?\n/);
  const components = [];
  const stack = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("//")) continue;

    if (line === "}") {
      if (!stack.length) throw new Error(`Unexpected } at line ${i + 1}`);
      stack.pop();
      continue;
    }

    const block = line.match(/^([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*\{$/);

    if (block) {
      const [, type, name] = block;

      if (!XSHARP_COMPONENTS.includes(type.toLowerCase())) {
        throw new Error(`Unknown X# component: ${type}`);
      }

      const node = { type: type.toLowerCase(), name, properties: {}, children: [] };

      if (stack.length) stack.at(-1).children.push(node);
      else components.push(node);

      stack.push(node);
      continue;
    }

    const prop = line.match(/^([A-Za-z_]\w*)\s*:\s*(.+)$/);

    if (prop) {
      if (!stack.length) throw new Error(`Property outside component at line ${i + 1}`);

      const [, key, raw] = prop;

      if (!XSHARP_PROPERTIES.includes(key)) {
        throw new Error(`Unknown X# property: ${key}`);
      }

      stack.at(-1).properties[key] = parseValue(raw);
      continue;
    }

    throw new Error(`Invalid X# syntax at line ${i + 1}: ${line}`);
  }

  if (stack.length) throw new Error(`Unclosed X# component: ${stack.at(-1).name}`);

  return {
    language: "X#",
    purpose: "Website Design",
    datatypes: XSHARP_DATATYPES,
    properties: XSHARP_PROPERTIES,
    components,
    valid: true
  };
}
