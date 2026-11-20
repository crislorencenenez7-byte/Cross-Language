export const XS_DATATYPES = [
  "String", "Number", "Integer", "Decimal", "Boolean",
  "Array", "Object", "Map", "Set", "Tuple", "Null", "Optional",
  "Function", "Event", "Date", "Time", "URL", "State",
  "Reference", "Promise", "Result", "Error", "Condition",
  "Loop", "Iterator"
];

const TYPE_CHECKS = {
  String: value => typeof value === "string",
  Number: value => typeof value === "number" && Number.isFinite(value),
  Integer: value => Number.isInteger(value),
  Decimal: value => typeof value === "number" && Number.isFinite(value),
  Boolean: value => typeof value === "boolean",
  Array: Array.isArray,
  Tuple: Array.isArray,
  Object: value => value !== null && typeof value === "object" && !Array.isArray(value),
  Map: value => value instanceof Map,
  Set: value => value instanceof Set,
  Null: value => value === null,
  Optional: () => true,
  Date: value => value instanceof Date && !Number.isNaN(value.getTime()),
  Time: value => typeof value === "string",
  URL: value => typeof value === "string" && /^https?:\/\//i.test(value)
};

function tokenize(input) {
  const tokens = [];
  let i = 0;

  while (i < input.length) {
    const rest = input.slice(i);
    if (/^\s+/.test(rest)) {
      i += rest.match(/^\s+/)[0].length;
      continue;
    }

    const stringMatch = rest.match(/^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/);
    if (stringMatch) {
      const raw = stringMatch[0];
      let value;
      if (raw[0] === '"') value = JSON.parse(raw);
      else {
        value = raw.slice(1, -1).replace(/\\(['\\nrt])/g, (_, c) => ({
          "'": "'", "\\": "\\", n: "\n", r: "\r", t: "\t"
        })[c]);
      }
      tokens.push({ type: "literal", value });
      i += raw.length;
      continue;
    }

    const number = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
    if (number) {
      tokens.push({ type: "literal", value: Number(number[0]) });
      i += number[0].length;
      continue;
    }

    const identifier = rest.match(/^[A-Za-z_]\w*/);
    if (identifier) {
      const word = identifier[0];
      if (word === "true") tokens.push({ type: "literal", value: true });
      else if (word === "false") tokens.push({ type: "literal", value: false });
      else if (word === "null") tokens.push({ type: "literal", value: null });
      else tokens.push({ type: "identifier", value: word });
      i += word.length;
      continue;
    }

    const operator = rest.match(/^(===|!==|==|!=|<=|>=|&&|\|\||[+\-*/%<>()\[\]{},:!])/);
    if (operator) {
      tokens.push({ type: "operator", value: operator[0] });
      i += operator[0].length;
      continue;
    }

    throw new Error(`Unexpected character in XS expression: ${rest[0]}`);
  }

  return tokens;
}

const PRECEDENCE = {
  "||": 1, "&&": 2,
  "==": 3, "===": 3, "!=": 3, "!==": 3,
  "<": 4, "<=": 4, ">": 4, ">=": 4,
  "+": 5, "-": 5,
  "*": 6, "/": 6, "%": 6
};

function parseExpression(source) {
  const tokens = tokenize(source);
  let cursor = 0;

  function peek(value) {
    return tokens[cursor]?.value === value;
  }

  function take() {
    return tokens[cursor++];
  }

  function primary() {
    const token = take();
    if (!token) throw new Error("Expected an XS expression.");

    if (token.value === "!" || token.value === "-") {
      return { kind: "unary", operator: token.value, value: primary() };
    }

    if (token.type === "literal") return { kind: "literal", value: token.value };
    if (token.type === "identifier") {
      if (peek("(")) {
        take();
        const args = [];
        while (!peek(")")) {
          args.push(binary(0));
          if (!peek(",")) break;
          take();
        }
        if (!peek(")")) throw new Error(`Missing ) after ${token.value}.`);
        take();
        return { kind: "construct", name: token.value, args };
      }
      return { kind: "variable", name: token.value };
    }

    if (token.value === "(") {
      const expression = binary(0);
      if (!peek(")")) throw new Error("Missing ) in XS expression.");
      take();
      return expression;
    }

    if (token.value === "[") {
      const items = [];
      while (!peek("]")) {
        items.push(binary(0));
        if (!peek(",")) break;
        take();
      }
      if (!peek("]")) throw new Error("Missing ] in XS array.");
      take();
      return { kind: "array", items };
    }

    if (token.value === "{") {
      const entries = [];
      while (!peek("}")) {
        const key = take();
        if (!key || !["identifier", "literal"].includes(key.type)) {
          throw new Error("Invalid key in XS object.");
        }
        if (!peek(":")) throw new Error("Expected : after XS object key.");
        take();
        entries.push([String(key.value), binary(0)]);
        if (!peek(",")) break;
        take();
      }
      if (!peek("}")) throw new Error("Missing } in XS object.");
      take();
      return { kind: "object", entries };
    }

    throw new Error(`Unexpected token in XS expression: ${token.value}`);
  }

  function binary(minimum) {
    let left = primary();
    while (cursor < tokens.length) {
      const operator = tokens[cursor]?.value;
      const precedence = PRECEDENCE[operator] || 0;
      if (precedence <= minimum) break;
      take();
      const right = binary(precedence);
      left = { kind: "binary", operator, left, right };
    }
    return left;
  }

  const result = binary(0);
  if (cursor !== tokens.length) {
    throw new Error(`Unexpected token in XS expression: ${tokens[cursor].value}`);
  }
  return result;
}

function parseStatement(line) {
  let match;

  if ((match = line.match(/^let\s+([A-Za-z_]\w*)(?:\s*:\s*([A-Za-z_]\w*))?\s*=\s*(.+?);?$/))) {
    const [, name, datatype, expression] = match;
    if (datatype && !XS_DATATYPES.includes(datatype)) {
      throw new Error(`Unknown XS datatype: ${datatype}`);
    }
    return { type: "let", name, datatype: datatype || null, expression: parseExpression(expression.replace(/;$/, "")) };
  }

  if ((match = line.match(/^set\s+([A-Za-z_]\w*)\s*=\s*(.+?);?$/))) {
    return { type: "set", name: match[1], expression: parseExpression(match[2].replace(/;$/, "")) };
  }

  if ((match = line.match(/^print\((.*)\);?$/))) {
    return { type: "print", expression: parseExpression(match[1].replace(/;$/, "")) };
  }

  if ((match = line.match(/^return(?:\s+(.+))?;?$/))) {
    return { type: "return", expression: match[1] ? parseExpression(match[1].replace(/;$/, "")) : null };
  }

  if ((match = line.match(/^call\s+([A-Za-z_]\w*)\(\);?$/))) {
    return { type: "call", name: match[1] };
  }

  throw new Error(`Unsupported XS statement: ${line}`);
}

export function compileXS(source) {
  if (typeof source !== "string" || !source.trim()) {
    throw new Error("XS source is empty.");
  }

  const functions = [];
  const stack = [];
  let current = null;

  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    let line = lines[index].trim();
    if (!line || line.startsWith("//")) continue;

    if (line === "} else {") {
      const frame = stack.at(-1);
      if (!frame || frame.node.type !== "if" || frame.inElse) {
        throw new Error(`Unexpected else at line ${index + 1}.`);
      }
      frame.inElse = true;
      current = frame.node.elseBody;
      continue;
    }

    const functionMatch = line.match(/^function\s+([A-Za-z_]\w*)\s*\(\s*\)\s*\{$/);
    if (functionMatch) {
      if (current) throw new Error(`Nested function declaration at line ${index + 1}.`);
      const fn = { name: functionMatch[1], statements: [] };
      functions.push(fn);
      stack.push({ node: fn, parent: null, inElse: false });
      current = fn.statements;
      continue;
    }

    if (line === "}") {
      if (!stack.length) throw new Error(`Unexpected } at line ${index + 1}.`);
      const frame = stack.pop();
      if (frame.node === functions.at(-1) && !stack.length) {
        current = null;
      } else if (stack.length) {
        const parent = stack.at(-1);
        current = parent.node === functions.at(-1)
          ? parent.node.statements
          : (parent.inElse ? parent.node.elseBody : parent.node.body);
      } else {
        current = null;
      }
      continue;
    }

    if (!current) throw new Error(`Statement outside function at line ${index + 1}.`);

    const blockMatch = line.match(/^(if|while|repeat)\s+(.+)\s*\{$/);
    if (blockMatch) {
      const [, kind, expression] = blockMatch;
      const node = kind === "if"
        ? { type: "if", expression: parseExpression(expression), body: [], elseBody: [] }
        : { type: kind, expression: parseExpression(expression), body: [] };
      current.push(node);
      stack.push({ node, inElse: false });
      current = node.body;
      continue;
    }

    current.push(parseStatement(line));
  }

  if (stack.length) throw new Error("Unclosed XS function or control block.");
  if (!functions.length) throw new Error("No XS functions found.");

  const names = new Set();
  for (const fn of functions) {
    if (names.has(fn.name)) throw new Error(`Duplicate XS function: ${fn.name}`);
    names.add(fn.name);
  }

  return {
    language: "XS",
    purpose: "Typed Website Logic",
    datatypes: XS_DATATYPES,
    functions,
    valid: true
  };
}

function evaluate(expression, variables) {
  if (!expression) return null;

  if (expression.kind === "literal") return expression.value;
  if (expression.kind === "variable") {
    if (!(expression.name in variables)) throw new Error(`Unknown XS variable: ${expression.name}`);
    return variables[expression.name];
  }
  if (expression.kind === "array") return expression.items.map(item => evaluate(item, variables));
  if (expression.kind === "construct") {
    const args = expression.args.map(item => evaluate(item, variables));
    const value = args[0];
    switch (expression.name) {
      case "String": return String(value ?? "");
      case "Number":
      case "Decimal": {
        const number = Number(value);
        if (!Number.isFinite(number)) throw new Error(`${expression.name}() requires a finite number.`);
        return number;
      }
      case "Integer": {
        const number = Number(value);
        if (!Number.isInteger(number)) throw new Error("Integer() requires a whole number.");
        return number;
      }
      case "Boolean": return Boolean(value);
      case "Array": return value === undefined ? [] : Array.from(value);
      case "Object": return value && typeof value === "object" && !Array.isArray(value) ? value : Object.create(null);
      case "Date": {
        const date = new Date(String(value));
        if (Number.isNaN(date.getTime())) throw new Error("Date() received an invalid date.");
        return date;
      }
      case "Time": return String(value ?? "");
      case "URL": {
        const url = String(value ?? "");
        if (!/^https?:\/\//i.test(url)) throw new Error("URL() requires an http or https URL.");
        return url;
      }
      case "Map": return new Map(value || []);
      case "Set": return new Set(value || []);
      case "Tuple": return Array.isArray(value) ? value : args;
      case "Null": return null;
      case "Optional": return value ?? null;
      default: throw new Error(`Unknown XS constructor: ${expression.name}`);
    }
  }
  if (expression.kind === "object") {
    const value = Object.create(null);
    for (const [key, item] of expression.entries) value[key] = evaluate(item, variables);
    return value;
  }
  if (expression.kind === "unary") {
    const value = evaluate(expression.value, variables);
    return expression.operator === "!" ? !value : -Number(value);
  }

  if (expression.kind === "binary") {
    const left = evaluate(expression.left, variables);
    if (expression.operator === "&&") return left && evaluate(expression.right, variables);
    if (expression.operator === "||") return left || evaluate(expression.right, variables);
    const right = evaluate(expression.right, variables);
    switch (expression.operator) {
      case "+": return typeof left === "string" || typeof right === "string" ? String(left) + String(right) : Number(left) + Number(right);
      case "-": return Number(left) - Number(right);
      case "*": return Number(left) * Number(right);
      case "/":
        if (Number(right) === 0) throw new Error("Division by zero.");
        return Number(left) / Number(right);
      case "%":
        if (Number(right) === 0) throw new Error("Division by zero.");
        return Number(left) % Number(right);
      case "==":
      case "===": return left === right;
      case "!=":
      case "!==": return left !== right;
      case "<": return left < right;
      case "<=": return left <= right;
      case ">": return left > right;
      case ">=": return left >= right;
    }
  }
  throw new Error("Invalid XS expression tree.");
}

function checkDatatype(name, datatype, value) {
  if (!datatype || datatype === "Optional") return;
  const check = TYPE_CHECKS[datatype];
  if (check && !check(value)) {
    throw new Error(`${name} must be ${datatype}; received ${value === null ? "Null" : Array.isArray(value) ? "Array" : typeof value}.`);
  }
}

export function callXS(program, functionName, options = {}) {
  const fn = program.functions.find(item => item.name === functionName);
  if (!fn) throw new Error(`XS function not found: ${functionName}`);

  const variables = { ...(options.variables || {}) };
  const output = [];
  let result;
  let steps = 0;
  let depth = options.depth || 0;

  if (depth > 24) throw new Error("XS function call depth limit exceeded.");

  function execute(statements) {
    for (const statement of statements) {
      steps++;
      if (steps > 10000) throw new Error("XS execution step limit exceeded.");

      if (statement.type === "let") {
        const value = evaluate(statement.expression, variables);
        checkDatatype(statement.name, statement.datatype, value);
        variables[statement.name] = value;
      } else if (statement.type === "set") {
        if (!(statement.name in variables)) throw new Error(`XS variable not declared: ${statement.name}`);
        variables[statement.name] = evaluate(statement.expression, variables);
      } else if (statement.type === "print") {
        output.push(evaluate(statement.expression, variables));
      } else if (statement.type === "return") {
        result = evaluate(statement.expression, variables);
        return true;
      } else if (statement.type === "call") {
        const nested = callXS(program, statement.name, { variables, depth: depth + 1 });
        output.push(...nested.output);
      } else if (statement.type === "if") {
        const branch = evaluate(statement.expression, variables) ? statement.body : statement.elseBody;
        if (execute(branch)) return true;
      } else if (statement.type === "while") {
        let count = 0;
        while (evaluate(statement.expression, variables)) {
          if (++count > 1000) throw new Error("XS while-loop limit exceeded.");
          if (execute(statement.body)) return true;
        }
      } else if (statement.type === "repeat") {
        const count = Number(evaluate(statement.expression, variables));
        if (!Number.isInteger(count) || count < 0 || count > 1000) {
          throw new Error("XS repeat count must be an integer from 0 to 1000.");
        }
        for (let i = 0; i < count; i++) {
          if (execute(statement.body)) return true;
        }
      }
    }
    return false;
  }

  execute(fn.statements);
  return { function: functionName, output, result, variables };
}

export function describeXSValue(value) {
  if (value === null) return "Null";
  if (Array.isArray(value)) return "Array";
  if (value instanceof Map) return "Map";
  if (value instanceof Set) return "Set";
  if (value instanceof Date) return "Date";
  if (Number.isInteger(value)) return "Integer";
  if (typeof value === "number") return "Decimal";
  if (typeof value === "boolean") return "Boolean";
  if (typeof value === "string") return "String";
  if (typeof value === "object") return "Object";
  return typeof value;
}
