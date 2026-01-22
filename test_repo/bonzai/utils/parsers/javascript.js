const fs = require('fs');
const { babelParser } = require('../../config');

// Helper function to extract methods from a class body
function extractClassMethods(classNode, className, getCode) {
  const methods = [];
  if (classNode.body && classNode.body.body && Array.isArray(classNode.body.body)) {
    for (const member of classNode.body.body) {
      if (member && member.type === 'MethodDefinition' && member.key) {
        let methodName;
        if (member.key.type === 'Identifier') {
          methodName = member.key.name;
        } else if (member.key.type === 'PrivateName') {
          methodName = '#' + member.key.id.name;
        } else if (member.key.type === 'StringLiteral' || member.key.type === 'NumericLiteral') {
          methodName = String(member.key.value);
        } else {
          methodName = String(member.key.value || member.key.name || 'unknown');
        }
        
        const kind = member.kind || 'method';
        const isStatic = member.static || false;
        
        methods.push({
          name: className + '.' + methodName,
          content: getCode(member),
          startLine: member.loc ? member.loc.start.line : 0,
          endLine: member.loc ? member.loc.end.line : 0,
          isMethod: true,
          className: className,
          methodName: methodName,
          kind: kind,
          static: isStatic
        });
      }
    }
  }
  return methods;
}

// Extract functions, classes, and methods from a JavaScript/TypeScript file
function extractJavaScriptFunctions(filePath) {
  try {
    if (!babelParser) {
      return { functions: [], classes: [] };
    }
    
    if (filePath.endsWith('.d.ts') || filePath.endsWith('.min.js') || filePath.includes('node_modules')) {
      return { functions: [], classes: [] };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const functions = [];
    const classes = [];
    
    try {
      const ast = babelParser.parse(content, {
        sourceType: 'module',
        plugins: [
          'typescript', 'jsx', 'decorators-legacy', 'classProperties',
          'objectRestSpread', 'asyncGenerators', 'functionBind',
          'exportDefaultFrom', 'exportNamespaceFrom', 'dynamicImport',
          'nullishCoalescingOperator', 'optionalChaining'
        ]
      });
      
      const getCode = (node) => content.substring(node.start, node.end);
      const visitedNodes = new Set();
      
      function traverse(node, parentType = null) {
        if (!node || visitedNodes.has(node)) return;
        visitedNodes.add(node);
        
        if (node.type === 'FunctionDeclaration' && node.id && parentType !== 'ExportNamedDeclaration') {
          functions.push({
            name: node.id.name,
            content: getCode(node),
            startLine: node.loc ? node.loc.start.line : 0,
            endLine: node.loc ? node.loc.end.line : 0
          });
        }
        
        if (node.type === 'VariableDeclarator' && 
            node.init && 
            (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression') &&
            node.id && node.id.type === 'Identifier') {
          functions.push({
            name: node.id.name,
            content: getCode(node),
            startLine: node.loc ? node.loc.start.line : 0,
            endLine: node.loc ? node.loc.end.line : 0
          });
        }
        
        if (node.type === 'ClassDeclaration' && node.id && 
            parentType !== 'ExportNamedDeclaration' && parentType !== 'ExportDefaultDeclaration') {
          const className = node.id.name;
          classes.push({
            name: className,
            content: getCode(node),
            methods: extractClassMethods(node, className, getCode),
            startLine: node.loc ? node.loc.start.line : 0,
            endLine: node.loc ? node.loc.end.line : 0
          });
        }
        
        if (node.type === 'ExportNamedDeclaration' && node.declaration) {
          if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id) {
            functions.push({
              name: node.declaration.id.name,
              content: getCode(node.declaration),
              startLine: node.declaration.loc ? node.declaration.loc.start.line : 0,
              endLine: node.declaration.loc ? node.declaration.loc.end.line : 0,
              isExported: true
            });
            visitedNodes.add(node.declaration);
          } else if (node.declaration.type === 'ClassDeclaration' && node.declaration.id) {
            const className = node.declaration.id.name;
            classes.push({
              name: className,
              content: getCode(node.declaration),
              methods: extractClassMethods(node.declaration, className, getCode),
              startLine: node.declaration.loc ? node.declaration.loc.start.line : 0,
              endLine: node.declaration.loc ? node.declaration.loc.end.line : 0,
              isExported: true
            });
            visitedNodes.add(node.declaration);
          }
        }
        
        if (node.type === 'ExportDefaultDeclaration' && node.declaration) {
          if (node.declaration.type === 'ClassDeclaration' && node.declaration.id) {
            const className = node.declaration.id.name;
            classes.push({
              name: className,
              content: getCode(node.declaration),
              methods: extractClassMethods(node.declaration, className, getCode),
              startLine: node.declaration.loc ? node.declaration.loc.start.line : 0,
              endLine: node.declaration.loc ? node.declaration.loc.end.line : 0,
              isExported: true,
              isDefaultExport: true
            });
            visitedNodes.add(node.declaration);
          } else if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id) {
            functions.push({
              name: node.declaration.id.name,
              content: getCode(node.declaration),
              startLine: node.declaration.loc ? node.declaration.loc.start.line : 0,
              endLine: node.declaration.loc ? node.declaration.loc.end.line : 0,
              isExported: true,
              isDefaultExport: true
            });
            visitedNodes.add(node.declaration);
          }
        }
        
        for (const key in node) {
          if (key === 'parent' || key === 'leadingComments' || key === 'trailingComments') continue;
          const child = node[key];
          if (Array.isArray(child)) {
            child.forEach(c => traverse(c, node.type));
          } else if (child && typeof child === 'object' && child.type) {
            traverse(child, node.type);
          }
        }
      }
      
      traverse(ast);
    } catch (parseError) {
      return { functions: [], classes: [] };
    }
    
    return { functions, classes };
  } catch (e) {
    return { functions: [], classes: [] };
  }
}

module.exports = { extractJavaScriptFunctions, extractClassMethods };
