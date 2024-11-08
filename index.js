#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// Built-in JavaScript globals that should never be null
const defaultBuiltInGlobals = new Set([
  'Array',
  'Object',
  'String',
  'Number',
  'Boolean',
  'Date',
  'Math',
  'JSON',
  'RegExp',
  'Error',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Promise',
  'Proxy',
  'Reflect',
  'BigInt',
  'Symbol',
  'Function',
  'console',
  'Buffer'
]);

let builtInGlobals = new Set(defaultBuiltInGlobals);
let applyOnlySet = new Set();

// Help text
const helpText = `
Optional Chaining Transformer
===========================

A tool to automatically add optional chaining operators to JavaScript/TypeScript code.

Usage: 
  npx chainsafe <path> [options]

Arguments:
  path                     File or directory path to process

Options:
  --help, -h                   Show this help message
  --options, -o               Show all available commands and their descriptions
  --type ts|js                 Process only TypeScript or JavaScript files
  --skip <names>               Add names to built-in globals to be skipped
  --no-skip <names>            Remove names from built-in globals skip list
  --skip-list                  Print current built-in globals list
  --preview                    Preview changes without writing to files
  --skip-none                  Ignore built-in globals and apply optional chaining to everything
  --skip-only <names>          Only skip the specified names, ignore built-in globals
  --apply-only <names>         Only apply optional chaining to specified modules/variables

Examples:
  npx chainsafe src/                     # Process all files in src directory
  npx chainsafe file.ts                  # Process single TypeScript file
  npx chainsafe src/ --skip-none         # Apply optional chaining to everything
  npx chainsafe src/ --skip-only axios   # Only skip specified globals
  npx chainsafe src/ --apply-only axios  # Only apply to specified modules
`;

// Options text
const optionsText = `
Available Commands
================

Core Commands:
  <path>                      Process file or directory at specified path
  --help, -h                  Show help information
  --options, -o              Show this list of available commands

File Type Filtering:
  --type ts              Process only TypeScript (.ts, .tsx) files
  --type js              Process only JavaScript (.js, .jsx) files

Preview and Testing:
  --preview              Show transformed code without writing to files
  
Global Variable Handling:
  --skip-list            Display current list of built-in globals being skipped
  --skip <names>         Add specified names to built-in globals skip list
                        Example: --skip axios lodash moment
  --no-skip <names>      Remove specified names from built-in globals skip list
                        Example: --no-skip Array Object
  --skip-none           Ignore built-in globals and apply optional chaining to everything
  --skip-only <names>   Only skip the specified names, ignore built-in globals
                        Example: --skip-only axios lodash
  --apply-only <names>  Only apply optional chaining to specified modules/variables
                        Example: --apply-only axios process

All commands can be combined as needed. Examples:
  npx chainsafe src/ --type ts --preview
  npx chainsafe src/ --apply-only axios,lodash
  npx chainsafe src/ --apply-only axios --preview
`;

function isValidFileType(entry, fileType) {
  if (!fileType) {
    return entry.endsWith('.ts') || entry.endsWith('.tsx') || entry.endsWith('.js') || entry.endsWith('.jsx');
  }
  switch (fileType.toLowerCase()) {
    case 'ts':
      return entry.endsWith('.ts') || entry.endsWith('.tsx');
    case 'js':
      return entry.endsWith('.js') || entry.endsWith('.jsx');
    default:
      console.error('Invalid file type specified. Use --type ts or --type js');
      process.exit(1);
  }
}

function processDirectory(directoryPath, fileType) {
  console.log(`\n📁 Processing directory: ${directoryPath}`);
  const entries = fs.readdirSync(directoryPath);
  const fileCount = entries.filter(entry => isValidFileType(entry, fileType)).length;

  console.log(`Found ${fileCount} ${fileType ? fileType.toUpperCase() : 'TypeScript/JavaScript'} files`);

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry !== 'node_modules' && !entry.startsWith('.')) {
        processDirectory(fullPath, fileType);
      }
    } else if (isValidFileType(entry, fileType)) {
      console.log(`\n📄 Processing file: ${fullPath}`);
      processFile(fullPath, true);
    }
  }
}

function processFile(filePath, isQuiet = false, maxIterations = 5) {
  try {
    let code = fs.readFileSync(filePath, 'utf-8');
    let previousCode = '';
    let iteration = 1;
    let hasChanges = false;

    while (iteration <= maxIterations && code !== previousCode) {
      if (!isQuiet) {
        console.log(`\n🔄 Running iteration ${iteration}/${maxIterations}`);
      }

      previousCode = code;
      code = addOptionalChaining(code);

      // Check if any changes were made in this iteration
      if (code === previousCode) {
        if (!isQuiet) {
          console.log(`✨ No more changes needed after iteration ${iteration}`);
        }
        break;
      }
      hasChanges = true;
      iteration++;
    }

    // Check if any changes were made across all iterations
    if (!hasChanges) {
      console.log(`\n⏭️  No changes required for: ${filePath}`);
      return code;
    }

    if (process.argv.includes('--preview')) {
      // Only preview the changes
      console.log(`📝 Preview changes for: ${filePath}`);
      console.log('=====================================');
      console.log(code);
      console.log('=====================================\n');
    } else {
      // Write changes by default
      fs.writeFileSync(filePath, code);
      if (!isQuiet) {
        console.log(`✅ Successfully updated: ${filePath} after ${iteration - 1} iterations`);
      }
    }
    return code;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return null;
  }
}

function addOptionalChaining(code) {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx']
  });

  const nullableVars = new Set();
  const nullableProps = new Set();
  const enumTypes = new Set();
  const insertPositions = new Set();
  const nonNullableVars = new Set();

  traverse(ast, {
    // Track enum declarations
    TSEnumDeclaration(path) {
      enumTypes.add(path.node.id.name);
    },

    ImportDeclaration(path) {
      path.node.specifiers.forEach(specifier => {
        nonNullableVars.add(specifier.local.name);
      });
    },

    VariableDeclarator(path) {
      if (!path.node.init) {
        nullableVars.add(path.node.id.name);
      } else if (path.node.init.type === 'CallExpression' ||
        path.node.init.type === 'NewExpression' ||
        path.node.init.type === 'MemberExpression') {
        nonNullableVars.add(path.node.id.name);
      } else if (path.node.init.type === 'ObjectExpression' ||
        nullableVars.has(path.node.init.name)) {
        nullableProps.add(path.node.id.name);
      }
    },

    Function(path) {
      path.node.params.forEach(param => {
        if (param.type === 'Identifier') {
          nullableVars.add(param.name);
        }
      });
    },

    ArrowFunctionExpression(path) {
      path.node.params.forEach(param => {
        if (param.type === 'Identifier') {
          nullableVars.add(param.name);
        }
      });
    },

    AssignmentExpression(path) {
      if (path.node.right.type === 'Identifier' && nullableVars.has(path.node.right.name)) {
        if (path.node.left.type === 'MemberExpression') {
          nullableProps.add(path.node.left.object.name);
        }
      }
    },

    MemberExpression(path) {
      // Skip if already optional
      if (path.node.optional) return;

      // Skip if part of another member expression as property
      if (path.parent.type === 'MemberExpression' && path.parent.property === path.node) return;

      // Skip this expressions
      if (path.node.object.type === 'ThisExpression') return;

      // Handle apply-only mode
      if (applyOnlySet.size > 0) {
        let shouldProcess = false;

        // Check if the root object is in the apply-only set
        let currentObject = path.node.object;
        while (currentObject.type === 'MemberExpression') {
          currentObject = currentObject.object;
        }

        if (currentObject.type === 'Identifier' && applyOnlySet.has(currentObject.name)) {
          shouldProcess = true;
        }

        if (!shouldProcess) {
          return;
        }
      } else {
        // Regular skip logic when not in apply-only mode
        if (!process.env.SKIP_NONE && path.node.object.type === 'Identifier' && builtInGlobals.has(path.node.object.name)) {
          return;
        }
      }

      // Skip if the object is known to be non-nullable
      if (path.node.object.type === 'Identifier' && nonNullableVars.has(path.node.object.name)) {
        return;
      }

      // Skip if accessing a property on a built-in global
      let isBuiltInChain = false;
      let currentObject = path.node.object;
      while (currentObject.type === 'MemberExpression') {
        if (currentObject.object.type === 'Identifier' && builtInGlobals.has(currentObject.object.name)) {
          isBuiltInChain = true;
          break;
        }
        currentObject = currentObject.object;
      }
      if (isBuiltInChain) return;

      // Check if this is part of a constructor call
      let isConstructorCall = false;
      try {
        let currentPath = path;
        while (currentPath && currentPath.parentPath) {
          if (currentPath.parentPath.node.type === 'NewExpression') {
            isConstructorCall = true;
            break;
          }
          currentPath = currentPath.parentPath;
        }
      } catch (e) {
        console.error('Error checking constructor context:', e);
      }

      if (isConstructorCall) return;

      // Check if this is part of an assignment target
      let isAssignmentTarget = false;
      try {
        let currentPath = path;
        while (currentPath && currentPath.parentPath) {
          if (currentPath.parentPath.node.type === 'AssignmentExpression' &&
            currentPath.parentPath.node.left === currentPath.node) {
            isAssignmentTarget = true;
            break;
          }
          if (currentPath.parentPath.node.type === 'UpdateExpression') {
            isAssignmentTarget = true;
            break;
          }
          currentPath = currentPath.parentPath;
        }
      } catch (e) {
        console.error('Error checking assignment context:', e);
      }

      if (isAssignmentTarget) return;

      let shouldAdd = false;

      // Find the root object
      let rootObject = path.node;
      while (rootObject.object && rootObject.object.type === 'MemberExpression') {
        rootObject = rootObject.object;
      }

      // Check if accessing an enum or nullable variable/property
      if (rootObject.object && rootObject.object.type === 'Identifier') {
        if (enumTypes.has(rootObject.object.name)) {
          shouldAdd = true;
        } else {
          shouldAdd = nullableVars.has(rootObject.object.name) ||
            nullableProps.has(rootObject.object.name);
        }
      }

      // Always consider callback parameters as potentially nullable
      if (path.node.object.type === 'Identifier' &&
        path.findParent(p => p.isArrowFunctionExpression() || p.isFunctionExpression())) {
        shouldAdd = true;
      }

      // Handle computed properties
      if (path.node.computed) {
        // Don't skip - instead check if we should add optional chaining
        let shouldAdd = false;
        let rootObject = path.node;
        while (rootObject.object && rootObject.object.type === 'MemberExpression') {
          rootObject = rootObject.object;
        }

        if (rootObject.object && rootObject.object.type === 'Identifier') {
          shouldAdd = nullableVars.has(rootObject.object.name) ||
            nullableProps.has(rootObject.object.name);
        }

        // Add optional chaining before the computed property access
        if (shouldAdd) {
          insertPositions.add(path.node.property.start - 1);
        }
        return;
      } else {
        // Regular property access with dot notation
        if (shouldAdd || path.node.object.type === 'MemberExpression' ||
          (path.node.object.type === 'Identifier' && path.scope.hasBinding(path.node.object.name) &&
            !nonNullableVars.has(path.node.object.name))) {
          insertPositions.add(path.node.property.start - 1);
        }
      }
    }
  });

  const sortedPositions = Array.from(insertPositions).sort((a, b) => b - a);

  let result = code;
  for (const pos of sortedPositions) {
    result = result.slice(0, pos) + (result.slice(pos, pos + 1) !== '.' ? '?.' : '?') + result.slice(pos);
  }

  return result;
}

function validateGlobals(globals) {
  if (!Array.isArray(globals)) return false;
  return globals.every(global => typeof global === 'string' && global.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/));
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  // Show help text
  if (args.includes('--help') || args.includes('-h')) {
    console.log(helpText);
    process.exit(0);
  }

  // Show options text
  if (args.includes('--options') || args.includes('-o')) {
    console.log(optionsText);
    process.exit(0);
  }

  if (args.length === 0) {
    console.log(helpText);
    process.exit(1);
  }

  // Handle --skip-list flag
  if (args.includes('--skip-list')) {
    console.log('\n📋 Current built-in globals that will be skipped:');
    console.log(Array.from(builtInGlobals).sort().join('\n'));
    process.exit(0);
  }

  // Handle --skip-none flag
  if (args.includes('--skip-none')) {
    console.log('🔧 Ignoring built-in globals and applying optional chaining to everything');
    process.env.SKIP_NONE = 'true';
    builtInGlobals.clear();
  }

  // Handle --apply-only flag
  const applyOnlyIndex = args.indexOf('--apply-only');
  if (applyOnlyIndex !== -1) {
    const applyOnlyItems = [];
    for (let i = applyOnlyIndex + 1; i < args.length; i++) {
      if (args[i].startsWith('--')) break;
      applyOnlyItems.push(args[i]);
    }

    if (!validateGlobals(applyOnlyItems)) {
      console.error('❌ Invalid identifiers provided. Names must be valid JavaScript identifiers.');
      console.error('Example: npx chainsafe src/ --apply-only axios process');
      process.exit(1);
    }
    console.log('Only applying optional chaining to:', applyOnlyItems.join(', '));
    applyOnlySet = new Set(applyOnlyItems);
  }

  // Handle --skip-only flag
  const skipOnlyIndex = args.indexOf('--skip-only');
  if (skipOnlyIndex !== -1) {
    const skipOnlyItems = [];
    for (let i = skipOnlyIndex + 1; i < args.length; i++) {
      if (args[i].startsWith('--')) break;
      skipOnlyItems.push(args[i]);
    }

    if (!validateGlobals(skipOnlyItems)) {
      console.error('❌ Invalid globals provided. Globals must be valid JavaScript identifiers.');
      console.error('Example: npx chainsafe src/ --skip-only axios lodash');
      process.exit(1);
    }
    console.log('Using only these globals to skip:', skipOnlyItems.join(', '));
    builtInGlobals = new Set(skipOnlyItems);
  }

  // Make skip-only and apply-only mutually exclusive
  if (args.includes('--skip-only') && args.includes('--apply-only')) {
    console.error('❌ Error: --skip-only and --apply-only cannot be used together');
    process.exit(1);
  }

  // Make skip-none and apply-only mutually exclusive
  if (args.includes('--skip-none') && args.includes('--apply-only')) {
    console.error('❌ Error: --skip-none and --apply-only cannot be used together');
    process.exit(1);
  }

  const inputPath = args[0];

  // Get file type if specified
  const typeIndex = args.indexOf('--type');
  const fileType = typeIndex !== -1 ? args[typeIndex + 1] : null;

  // Handle --no-skip flag
  const noSkipIndex = args.indexOf('--no-skip');
  if (noSkipIndex !== -1) {
    const noSkipItems = [];
    for (let i = noSkipIndex + 1; i < args.length; i++) {
      if (args[i].startsWith('--')) break;
      noSkipItems.push(args[i]);
    }

    if (!validateGlobals(noSkipItems)) {
      console.error('❌ Invalid globals provided. Globals must be valid JavaScript identifiers.');
      console.error('Example: npx chainsafe src/ --no-skip Array Object');
      process.exit(1);
    }
    console.log('Removing globals from skip list:', noSkipItems.join(', '));
    noSkipItems.forEach(global => builtInGlobals.delete(global));
  }

  // Handle --skip flag
  const skipIndex = args.indexOf('--skip');
  if (skipIndex !== -1) {
    const skipItems = [];
    for (let i = skipIndex + 1; i < args.length; i++) {
      if (args[i].startsWith('--')) break;
      skipItems.push(args[i]);
    }

    if (!validateGlobals(skipItems)) {
      console.error('❌ Invalid globals provided. Globals must be valid JavaScript identifiers.');
      console.error('Example: npx chainsafe src/ --skip axios lodash moment');
      process.exit(1);
    }
    console.log('Adding additional globals to skip:', skipItems.join(', '));
    skipItems.forEach(global => builtInGlobals.add(global));
  }

  console.log('\n🚀 Starting optional chaining transformation');
  console.log('==========================================');

  try {
    const stats = fs.statSync(inputPath);

    if (stats.isDirectory()) {
      processDirectory(inputPath, fileType);
      console.log('\n✨ Successfully processed all files!');
    } else {
      if (isValidFileType(inputPath, fileType)) {
        console.log(`\n📄 Processing single file: ${inputPath}`);
        processFile(inputPath);
        console.log('\n✨ Successfully processed file!');
      } else {
        console.error(`\n❌ File type not matched with specified type filter: ${fileType}`);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

module.exports = { addOptionalChaining, builtInGlobals };