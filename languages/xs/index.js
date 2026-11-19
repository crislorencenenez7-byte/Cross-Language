export const XS_DATATYPES = [
  "String","Number","Integer","Decimal","Boolean","Array",
  "Object","Map","Set","Tuple","Null","Optional","Function",
  "Event","Date","Time","URL","State","Reference","Promise",
  "Result","Error","Condition","Loop","Iterator"
];

function parseValue(source) {
  const value = source.trim();

  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) return value.slice(1, -1);

  if (/^[A-Za-z_]\w*$/.test(value)) {
    return { variable: value };
  }

  const operation = value.match(
    /^([A-Za-z_]\w*|-?\d+(?:\.\d+)?)\s*([+\-*/])\s*([A-Za-z_]\w*|-?\d+(?:\.\d+)?)$/
  );

  if (operation) {
    return {
      operation: operation[2],
      left: parseValue(operation[1]),
      right: parseValue(operation[3])
    };
  }

  throw new Error(`Unsupported XS value: ${value}`);
}

function evaluate(value, variables) {
  if (value === null || typeof value !== "object") return value;

  if (value.variable) {
    if (!(value.variable in variables)) {
      throw new Error(`Unknown XS variable: ${value.variable}`);
    }
    return variables[value.variable];
  }

  if (value.operation) {
    const a = evaluate(value.left, variables);
    const b = evaluate(value.right, variables);

    switch (value.operation) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/":
        if (b === 0) throw new Error("Division by zero.");
        return a / b;
    }
  }

  return value;
}

function parseStatement(line) {
  let m;

  if ((m = line.match(/^let\s+([A-Za-z_]\w*)\s*=\s*(.+);?$/))) {
    return { type: "let", name: m[1], value: parseValue(m[2].replace(/;$/, "")) };
  }

  if ((m = line.match(/^set\s+([A-Za-z_]\w*)\s*=\s*(.+);?$/))) {
    return { type: "set", name: m[1], value: parseValue(m[2].replace(/;$/, "")) };
  }

  if ((m = line.match(/^print\((.*)\);?$/))) {
    return { type: "print", value: parseValue(m[1].replace(/;$/, "")) };
  }

  if ((m = line.match(/^return(?:\s+(.+))?;?$/))) {
    return { type: "return", value: m[1] ? parseValue(m[1].replace(/;$/, "")) : null };
  }

  if ((m = line.match(/^call\s+([A-Za-z_]\w*)\(\);?$/))) {
    return { type: "call", name: m[1] };
  }

  throw new Error(`Unsupported XS statement: ${line}`);
}

export function compileXS(source) {
  const functions = [];
  const pattern = /function\s+([A-Za-z_]\w*)\s*\(\s*\)\s*\{([\s\S]*?)\}/g;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const statements = [];

    for (const raw of match[2].split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("//")) continue;
      statements.push(parseStatement(line));
    }

    functions.push({ name: match[1], statements });
  }

  if (!functions.length) throw new Error("No XS functions found.");

  return {
    language: "XS",
    purpose: "Website Logic",
    datatypes: XS_DATATYPES,
    functions,
    valid: true
  };
}

export function callXS(program, functionName, options = {}) {
  const fn = program.functions.find(item => item.name === functionName);
  if (!fn) throw new Error(`XS function not found: ${functionName}`);

  const variables = { ...(options.variables || {}) };
  const output = [];
  let result;

  for (const statement of fn.statements) {
    if (statement.type === "let") {
      variables[statement.name] = evaluate(statement.value, variables);
    } else if (statement.type === "set") {
      if (!(statement.name in variables)) {
        throw new Error(`XS variable not declared: ${statement.name}`);
      }
      variables[statement.name] = evaluate(statement.value, variables);
    } else if (statement.type === "print") {
      output.push(evaluate(statement.value, variables));
    } else if (statement.type === "return") {
      result = evaluate(statement.value, variables);
      break;
    } else if (statement.type === "call") {
      const nested = callXS(program, statement.name, { variables });
      output.push(...nested.output);
    }
  }

  return { function: functionName, output, result, variables };
}
