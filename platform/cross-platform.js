import { compileX } from "../languages/x/index.js";
import { compileXSharp } from "../languages/xsharp/index.js";
import { compileXS } from "../languages/xs/index.js";

const escapeHTML = value => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const kebab = value => value.replace(/[A-Z]/g, m => "-" + m.toLowerCase());

function collectStyles(nodes, result = {}) {
  for (const node of nodes || []) {
    result[node.name] = node.properties;
    collectStyles(node.children, result);
  }
  return result;
}

function renderNode(node, styles) {
  const tags = {
    App:"div",Page:"main",Section:"section",Container:"div",
    Header:"header",Footer:"footer",Navbar:"nav",Navigation:"nav",
    Main:"main",Aside:"aside",Article:"article",Heading:"h1",
    Paragraph:"p",Text:"span",Label:"label",Button:"button",
    Link:"a",Image:"img",Icon:"span",Input:"input",
    Textarea:"textarea",Select:"select",Option:"option",
    Checkbox:"input",Radio:"input",Form:"form",Field:"div",
    Card:"article",Panel:"section",Modal:"dialog",Dialog:"dialog",
    Table:"table",TableRow:"tr",TableCell:"td",List:"ul",
    ListItem:"li",Video:"video",Audio:"audio",Canvas:"canvas",
    Progress:"progress",Badge:"span",Divider:"hr",
    Component:"div",Slot:"div"
  };

  const tag = tags[node.type] || "div";
  const p = { ...(styles[node.name] || {}), ...node.properties };
  const attrs = [];
  const css = [];

  const cssProps = [
    "width","height","minWidth","maxWidth","minHeight","maxHeight",
    "color","background","backgroundColor","padding","paddingTop",
    "paddingRight","paddingBottom","paddingLeft","margin","marginTop",
    "marginRight","marginBottom","marginLeft","gap","rowGap","columnGap",
    "alignItems","justifyContent","display","position","top","right",
    "bottom","left","fontSize","fontWeight","fontFamily","lineHeight",
    "textAlign","border","borderColor","borderWidth","borderStyle",
    "radius","shadow","opacity","overflow","zIndex","transform",
    "transition","animation","cursor","flexGrow","flexShrink","objectFit"
  ];

  for (const [key, value] of Object.entries(p)) {
    if (key === "text" || key === "onClick" || key === "visible") continue;

    if (["id","class","href","name","placeholder","value","alt","title",
         "type","src"].includes(key)) {
      attrs.push(`${key === "class" ? "class" : key}="${escapeHTML(value)}"`);
    } else if (cssProps.includes(key)) {
      const prop = key === "radius" ? "borderRadius" :
        key === "shadow" ? "boxShadow" : key;
      const unitless = ["opacity","zIndex","flexGrow","flexShrink"].includes(key);
      const val = typeof value === "number" && !unitless ? `${value}px` : value;
      css.push(`${kebab(prop)}:${escapeHTML(val)}`);
    }
  }

  if (p.onClick) attrs.push(`data-xs-click="${escapeHTML(p.onClick)}"`);
  if (css.length) attrs.push(`style="${css.join(";")}"`);

  const text = p.text !== undefined ? escapeHTML(p.text) : "";
  const children = (node.children || []).map(n => renderNode(n, styles)).join("");

  if (["Image","Input","Divider","Progress"].includes(node.type)) {
    return `<${tag} ${attrs.join(" ")}>`;
  }

  return `<${tag} ${attrs.join(" ")}>${text}${children}</${tag}>`;
}

function generateJS(program) {
  if (!program) return "";

  const expression = node => {
    if (!node) return "null";
    if (node.kind === "literal") return JSON.stringify(node.value);
    if (node.kind === "variable") return node.name;
    if (node.kind === "array") return `[${node.items.map(expression).join(",")}]`;
    if (node.kind === "object") {
      return `{${node.entries.map(([key, value]) =>
        `${JSON.stringify(key)}:${expression(value)}`
      ).join(",")}}`;
    }
    if (node.kind === "unary") return `(${node.operator}${expression(node.value)})`;
    if (node.kind === "binary") {
      return `(${expression(node.left)} ${node.operator} ${expression(node.right)})`;
    }
    return "null";
  };

  const statements = items => items.map(statement => {
    if (statement.type === "let") return `let ${statement.name}=${expression(statement.expression)};`;
    if (statement.type === "set") return `${statement.name}=${expression(statement.expression)};`;
    if (statement.type === "print") return `console.log(${expression(statement.expression)});`;
    if (statement.type === "return") return `return ${expression(statement.expression)};`;
    if (statement.type === "call") return `${statement.name}();`;
    if (statement.type === "if") {
      return `if(${expression(statement.expression)}){${statements(statement.body)}}else{${statements(statement.elseBody)}}`;
    }
    if (statement.type === "while") {
      return `while(${expression(statement.expression)}){${statements(statement.body)}}`;
    }
    if (statement.type === "repeat") {
      return `for(let __cross_i=0,__cross_n=${expression(statement.expression)};__cross_i<__cross_n;__cross_i++){${statements(statement.body)}}`;
    }
    return "";
  }).join("\n");

  return program.functions.map(fn =>
    `function ${fn.name}(){${statements(fn.statements)}}`
  ).join("\n");
}

export class CrossPlatform {
  constructor() {
    this.name = "CROSS";
    this.version = "3.0";
    this.languages = {
      X: compileX,
      "X#": compileXSharp,
      XS: compileXS
    };
  }

  compileProject(project = {}) {
    const structure = project.structure ? compileX(project.structure) : null;
    const design = project.design ? compileXSharp(project.design) : null;
    const logic = project.logic ? compileXS(project.logic) : null;

    const styles = collectStyles(design?.components || []);
    const body = structure?.tree
      ? structure.tree.map(node => renderNode(node, styles)).join("")
      : "";

    const javascript = generateJS(logic);
    const css = "body{margin:0;font-family:Arial,sans-serif}*{box-sizing:border-box}";

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHTML(project.name || "CROSS Website")}</title>
<style>${css}</style>
</head>
<body>
${body}
<script>${javascript.replace(/<\/script/gi,"<\\/script")}</script>
</body>
</html>`;

    return {
      brand: this.name,
      platformVersion: this.version,
      success: true,
      modules: { structure, design, logic },
      website: { html, css, javascript }
    };
  }

  getLanguages() {
    return Object.keys(this.languages);
  }
}

export function createCrossPlatform() {
  return new CrossPlatform();
}
