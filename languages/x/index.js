const COMPONENTS = [
  "App","Page","Section","Container","Header","Footer",
  "Navbar","Navigation","Main","Aside","Article",
  "Heading","Paragraph","Text","Label","Button","Link",
  "Image","Icon","Input","Textarea","Select","Option",
  "Checkbox","Radio","Form","Field","Card","Panel",
  "Modal","Dialog","Table","TableRow","TableCell",
  "List","ListItem","Video","Audio","Canvas","Progress",
  "Badge","Divider","Component","Slot"
];

const DATATYPES = [
  "Text", "String", "Number", "Integer", "Decimal", "Boolean",
  "URL", "ID", "Class", "Children", "Attribute", "Element",
  "Array", "Object", "Map", "Set", "Tuple", "Null", "Optional",
  "Component", "Style", "Event", "State", "Reference"
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

export function compileX(source) {
  if (!source || typeof source !== "string") {
    throw new Error("X source is empty.");
  }

  const roots = [];
  const stack = [];

  for (const [i, raw] of source.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("//")) continue;

    if (line === "}") {
      if (!stack.length) throw new Error(`Unexpected } at line ${i + 1}`);
      stack.pop();
      continue;
    }

    const block = line.match(/^([A-Za-z]\w*)\s+([A-Za-z_]\w*)\s*\{$/);

    if (block) {
      const [, type, name] = block;
      if (!COMPONENTS.includes(type)) {
        throw new Error(`Unknown X component: ${type}`);
      }

      const node = { type, name, properties: {}, children: [] };

      if (stack.length) stack.at(-1).children.push(node);
      else roots.push(node);

      stack.push(node);
      continue;
    }

    const prop = line.match(/^([A-Za-z_]\w*)\s*:\s*(.+)$/);

    if (prop) {
      if (!stack.length) throw new Error(`Property outside component at line ${i + 1}`);
      stack.at(-1).properties[prop[1]] = parseValue(prop[2]);
      continue;
    }

    throw new Error(`Invalid X syntax at line ${i + 1}: ${line}`);
  }

  if (stack.length) throw new Error(`Unclosed X component: ${stack.at(-1).name}`);
  if (!roots.length) throw new Error("X requires a root component.");

  return {
    language: "X",
    purpose: "Website Structure",
    datatypes: DATATYPES,
    components: COMPONENTS,
    tree: roots,
    valid: true
  };
}

export const X_DATATYPES = DATATYPES;
export const X_COMPONENTS = COMPONENTS;
