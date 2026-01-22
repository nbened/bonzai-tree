const fs = require('fs');

// Extract functions, classes, and methods from a Python file
function extractPythonFunctions(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const functions = [];
    const classes = [];
    let currentFunction = null;
    let currentClass = null;
    let decorators = [];
    let classIndent = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Calculate indentation level
      const match = line.match(/^\s*/);
      const currentIndent = match ? match[0].length : 0;
      
      // Check for decorators (only at top level, before function/class)
      if (trimmed.startsWith('@') && currentIndent === 0) {
        decorators.push(line);
        continue;
      }
      
      // Check if this is a top-level class definition
      const classMatch = trimmed.match(/^class\s+(\w+)/);
      if (classMatch && currentIndent === 0) {
        // Save previous function/class if exists
        if (currentFunction) {
          currentFunction.content = currentFunction.content.trim();
          functions.push(currentFunction);
          currentFunction = null;
        }
        if (currentClass) {
          currentClass.content = currentClass.content.trim();
          classes.push(currentClass);
        }
        
        // Start new class
        const className = classMatch[1];
        let classContent = '';
        
        // Add decorators if any
        if (decorators.length > 0) {
          classContent = decorators.join('\n') + '\n';
          decorators = [];
        }
        
        classContent += line;
        classIndent = currentIndent;
        
        currentClass = {
          name: className,
          content: classContent,
          methods: [],
          startLine: i + 1,
          endLine: i + 1
        };
        continue;
      }
      
      // Check if this is a method definition (inside a class)
      const methodMatch = trimmed.match(/^def\s+(\w+)\s*\(/);
      if (methodMatch && currentClass && currentIndent > classIndent) {
        // Save previous method if exists
        if (currentFunction) {
          currentFunction.content = currentFunction.content.trim();
          currentClass.methods.push(currentFunction);
          currentFunction = null;
        }
        
        // Start new method
        const methodName = methodMatch[1];
        let methodContent = '';
        
        // Add decorators if any
        if (decorators.length > 0) {
          methodContent = decorators.join('\n') + '\n';
          decorators = [];
        }
        
        methodContent += line;
        
        currentFunction = {
          name: currentClass.name + '.' + methodName,
          content: methodContent,
          startLine: i + 1,
          endLine: i + 1,
          isMethod: true,
          className: currentClass.name,
          methodName: methodName
        };
        continue;
      }
      
      // Check if this is a top-level function definition
      const funcMatch = trimmed.match(/^def\s+(\w+)\s*\(/);
      
      if (funcMatch && currentIndent === 0) {
        // Save previous function/class if exists
        if (currentFunction) {
          currentFunction.content = currentFunction.content.trim();
          if (currentFunction.isMethod && currentClass) {
            currentClass.methods.push(currentFunction);
          } else {
          functions.push(currentFunction);
          }
          currentFunction = null;
        }
        if (currentClass) {
          currentClass.content = currentClass.content.trim();
          classes.push(currentClass);
          currentClass = null;
          classIndent = -1;
        }
        
        // Start new function
        const functionName = funcMatch[1];
        let functionContent = '';
        
        // Add decorators if any
        if (decorators.length > 0) {
          functionContent = decorators.join('\n') + '\n';
          decorators = [];
        }
        
        functionContent += line;
        
        currentFunction = {
          name: functionName,
          content: functionContent,
          startLine: i + 1,
          endLine: i + 1
        };
      } else if (currentFunction || currentClass) {
        // We're processing lines after a function/class definition
        if (currentIndent === 0 && trimmed && !trimmed.startsWith('#')) {
          // Back to top level with non-comment content - function/class ended
          if (currentFunction) {
          currentFunction.content = currentFunction.content.trim();
            if (currentFunction.isMethod && currentClass) {
              currentClass.methods.push(currentFunction);
            } else {
          functions.push(currentFunction);
            }
          currentFunction = null;
          }
          if (currentClass) {
            currentClass.content = currentClass.content.trim();
            classes.push(currentClass);
            currentClass = null;
            classIndent = -1;
          }
          
          // Check if this line starts a new function/class
          if (funcMatch) {
            const functionName = funcMatch[1];
            let functionContent = '';
            
            if (decorators.length > 0) {
              functionContent = decorators.join('\n') + '\n';
              decorators = [];
            }
            
            functionContent += line;
            
            currentFunction = {
              name: functionName,
              content: functionContent,
              startLine: i + 1,
              endLine: i + 1
            };
          } else if (classMatch) {
            const className = classMatch[1];
            let classContent = '';
            
            if (decorators.length > 0) {
              classContent = decorators.join('\n') + '\n';
              decorators = [];
            }
            
            classContent += line;
            classIndent = currentIndent;
            
            currentClass = {
              name: className,
              content: classContent,
              methods: [],
              startLine: i + 1,
              endLine: i + 1
            };
          } else if (trimmed.startsWith('@')) {
            decorators.push(line);
          }
        } else {
          // Still inside function/class (indented or empty/comment line)
          if (currentFunction) {
          currentFunction.content += '\n' + line;
          currentFunction.endLine = i + 1;
          }
          if (currentClass) {
            currentClass.content += '\n' + line;
            currentClass.endLine = i + 1;
          }
        }
      }
    }
    
    // Don't forget the last function/class
    if (currentFunction) {
      currentFunction.content = currentFunction.content.trim();
      if (currentFunction.isMethod && currentClass) {
        currentClass.methods.push(currentFunction);
      } else {
      functions.push(currentFunction);
      }
    }
    if (currentClass) {
      currentClass.content = currentClass.content.trim();
      classes.push(currentClass);
    }
    
    return { functions, classes };
  } catch (e) {
    // If parsing fails (invalid Python, etc.), return empty arrays
    return { functions: [], classes: [] };
  }
}

module.exports = { extractPythonFunctions };
