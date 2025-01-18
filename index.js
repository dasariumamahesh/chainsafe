#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// Configuration
const DEFAULT_CONFIG = {
  maxIterations: 5,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedExtensions: ['.js', '.jsx', '.ts', '.tsx'],
  ignoreDirectories: ['node_modules', '.git', 'dist', 'build'],
  ignoreFiles: ['.d.ts'],
  builtInGlobals: new Set([
    'Array', 'Object', 'String', 'Number', 'Boolean',
    'Date', 'Math', 'JSON', 'RegExp', 'Error',
    'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol',
    'Promise', 'Proxy', 'Reflect', 'BigInt',
    'Function', 'console', 'Buffer', 'process'
  ])
};

const HELP_TEXT = `
Optional Chaining Transformer
=============================

A tool to automatically add optional chaining operators to JavaScript/TypeScript code.

Usage: 
  chainsafe <path> [options]

Options:
  --preview              Show changes without writing to files
  --help                Show this help message
  --skip <names>        Add names to skip list (comma-separated)
  --no-skip <names>     Remove names from skip list (comma-separated)
  --skip-list           Show current skip list
  --skip-none           Don't skip any globals
  --skip-only <names>   Only skip specified names
  --apply-only <names>  Only apply to specified names
  --type ts|js          Process only TypeScript or JavaScript files

Examples:
  chainsafe src/
  chainsafe file.js --preview
  chainsafe src/ --skip axios,lodash
  chainsafe src/ --apply-only axios`;

class State {
  constructor(config = DEFAULT_CONFIG) {
    this.builtInGlobals = new Set(config.builtInGlobals);
    this.applyOnlySet = new Set();
    this.skipOnlySet = new Set();
    this.config = config;
    this.stats = {
      filesProcessed: 0,
      filesModified: 0,
      errors: 0,
      warnings: 0,
      startTime: Date.now()
    };
  }

  shouldSkip(name) {
    if (!name) return false;
    if (this.applyOnlySet.size > 0) {
      return !this.applyOnlySet.has(name);
    }
    if (this.skipOnlySet.size > 0) {
      return this.skipOnlySet.has(name);
    }
    return this.builtInGlobals.has(name);
  }

  getExecutionTime() {
    return ((Date.now() - this.stats.startTime) / 1000).toFixed(2);
  }

  addWarning() {
    this.stats.warnings++;
  }
}

async function isBinaryFile(buffer) {
  const sample = buffer.slice(0, 4096);
  return sample.some(byte => byte === 0);
}

const getPlugins = (isTypeScript) => [
  ...(isTypeScript ? ['typescript'] : []), // TypeScript plugin first if needed
  'jsx',
  ['optionalChainingAssign', { version: '2023-07' }],
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'exportDefaultFrom',
  'dynamicImport',
  'objectRestSpread',
  ['decorators', { decoratorsBeforeExport: true }]
];

function validatePath(ast, filePath, state) {
  // Check for mixed imports/requires
  let hasImport = false;
  let hasRequire = false;

  traverse(ast, {
    ImportDeclaration() { hasImport = true; },
    CallExpression(path) {
      if (path.node.callee.name === 'require') {
        hasRequire = true;
      }
    }
  });

  if (hasImport && hasRequire) {
    console.warn(`⚠️ Warning: Mixed imports/requires in ${filePath}`);
    state.addWarning();
  }
}

async function addOptionalChaining(code, filePath, state) {
  const isTypeScript = filePath.toLowerCase().endsWith('.ts') || filePath.toLowerCase().endsWith('.tsx');

  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: getPlugins(isTypeScript),
    tokens: true,
    allowImportExportEverywhere: true,
    errorRecovery: true
  });

  validatePath(ast, filePath, state);

  const insertPositions = new Set();

  traverse(ast, {
    MemberExpression(path) {
      try {
        // Skip if already optional or no object
        if (path.node.optional || !path.node.object) return;

        // Handle identifiers first
        if (path.node.object.type === 'Identifier') {
          const name = path.node.object.name;

          // Direct checks first (process, builtins, skip list)
          if (name === 'process' || state.shouldSkip(name)) {
            return;
          }

          const binding = path.scope.getBinding(name);

          // Binding checks
          if (binding) {
            // Skip catch clause error parameters
            if (binding.path?.parentPath?.node?.type === 'CatchClause') return;

            // Skip imported bindings
            if (binding.path?.isImportSpecifier() ||
              binding.path?.isImportDefaultSpecifier() ||
              binding.path?.isImportNamespaceSpecifier()) {
              return;
            }

            // Skip enum access
            if (binding.path?.parent?.type === 'TSEnumDeclaration' ||
              binding.path?.parent?.type === 'EnumDeclaration') {
              return;
            }

            // Skip constants and literals
            if (binding.constant && binding.path?.node?.init) {
              const init = binding.path.node.init;
              if (['StringLiteral', 'NumericLiteral', 'BooleanLiteral',
                'ObjectExpression', 'ArrayExpression'].includes(init.type)) {
                return;
              }
            }

            // Skip if the binding name is in skip list
            if (state.shouldSkip(binding.path?.node?.name)) {
              return;
            }
          }
        }

        // Check parent chain
        let currentPath = path;
        let skipChaining = false;

        while (currentPath?.parentPath) {
          const parentNode = currentPath.parentPath.node;
          if (!parentNode) break;

          // Skip type-related constructs
          if (['TSTypeReference', 'TSQualifiedName', 'TSModuleDeclaration',
            'TSNamespaceExportDeclaration'].includes(parentNode.type)) {
            skipChaining = true;
            break;
          }

          // Skip catch blocks
          if (parentNode.type === 'CatchClause') {
            skipChaining = true;
            break;
          }

          // Skip assignments and updates
          if ((parentNode.type === 'AssignmentExpression' && parentNode.left === currentPath.node) ||
            (parentNode.type === 'CallExpression' && currentPath.node === parentNode.callee) ||
            parentNode.type === 'UpdateExpression') {
            skipChaining = true;
            break;
          }

          // Skip destructuring and class members
          if (parentNode.type === 'ObjectPattern' ||
            ['ClassProperty', 'ClassPrivateProperty', 'ClassMethod',
              'ClassPrivateMethod'].includes(parentNode.type)) {
            skipChaining = true;
            break;
          }

          currentPath = currentPath.parentPath;
        }

        if (skipChaining) return;

        // Skip process.env access
        if (path.node.object.type === 'MemberExpression' &&
          path.node.object.object?.name === 'process' &&
          path.node.object.property?.name === 'env') {
          return;
        }

        // Handle 'this' expressions in class methods
        if (path.node.object.type === 'ThisExpression') {
          if (path.findParent(p => ['ClassMethod', 'ClassProperty',
            'ClassPrivateProperty', 'ClassPrivateMethod']
            .includes(p.node.type))) {
            return;
          }
        }

        // Check enum access in member expressions
        let rootObject = path.node.object;
        let isEnumAccess = false;

        while (rootObject?.type === 'MemberExpression') {
          if (rootObject.object?.type === 'Identifier') {
            const binding = path.scope.getBinding(rootObject.object.name);
            if (binding?.path?.parent?.type === 'TSEnumDeclaration' ||
              binding?.path?.parent?.type === 'EnumDeclaration') {
              isEnumAccess = true;
              break;
            }
          }
          rootObject = rootObject.object;
        }

        if (isEnumAccess) return;

        // Add position for optional chaining
        if (path.node.property?.start !== undefined) {
          insertPositions.add(path.node.property.start - 1);
        }

      } catch (error) {
        error.phase = 'traverse';
        error.expression = path.node?.type;
        error.location = {
          start: path.node?.start,
          end: path.node?.end
        };
        throw error;
      }
    }
  });

  // Apply transformations
  const positions = Array.from(insertPositions).sort((a, b) => b - a);
  let result = code;

  for (const pos of positions) {
    result = result.slice(0, pos) +
      (result.slice(pos, pos + 1) !== '.' ? '?.' : '?') +
      result.slice(pos);
  }

  return {
    code: result,
    hasChanges: positions.length > 0
  };
}

async function processFile(filePath, options = {}, state) {
  try {
    const stats = await fs.stat(filePath);
    if (stats.size > state.config.maxFileSize) {
      throw new Error(`File too large (>${state.config.maxFileSize / 1024 / 1024}MB)`);
    }

    if (options.fileType) {
      const isTypeScript = filePath.toLowerCase().endsWith('.ts') || filePath.toLowerCase().endsWith('.tsx');
      if ((options.fileType === 'ts' && !isTypeScript) || (options.fileType === 'js' && isTypeScript)) {
        return;
      }
    }

    console.log(`Processing: ${filePath}`);
    const buffer = await fs.readFile(filePath);

    if (await isBinaryFile(buffer)) {
      console.log('Skipping binary file');
      return;
    }

    let code = buffer.toString('utf-8');
    const cleanCode = code.replace(/^\uFEFF|\uFFFE|\uEFBBBF/, '');
    let previousCode = '';
    let iteration = 1;
    let hasChanges = false;
    code = cleanCode;

    while (iteration <= state.config.maxIterations && code !== previousCode) {
      previousCode = code;
      const result = await addOptionalChaining(code, filePath, state);
      code = result.code;

      if (code === previousCode) {
        if (iteration > 1) {
          console.log(`✨ No more changes needed after iteration ${iteration}`);
        }
        break;
      }
      hasChanges = true;
      iteration++;
    }

    if (!hasChanges) {
      console.log('No changes needed');
      return;
    }

    if (options.preview) {
      console.log('\nTransformed code:');
      console.log(code);
    } else {
      await fs.writeFile(filePath, code);
      console.log('✅ File transformed successfully');
      state.stats.filesModified++;
    }

    state.stats.filesProcessed++;
  } catch (error) {
    state.stats.errors++;
    error.filePath = filePath;
    throw error;
  }
}

const seen = new Set();
async function processDirectory(dirPath, options = {}, state) {
  const realPath = await fs.realpath(dirPath);
  if (seen.has(realPath)) return;
  seen.add(realPath);

  const entries = await fs.readdir(dirPath);

  for (const entry of entries) {
    const fullPath = path.normalize(path.join(dirPath, entry));
    const stats = await fs.lstat(fullPath);

    if (stats.isSymbolicLink()) continue;

    if (stats.isDirectory() && !state.config.ignoreDirectories.includes(entry) && !entry.startsWith('.')) {
      await processDirectory(fullPath, options, state);
    } else if (state.config.supportedExtensions.includes(path.extname(fullPath).toLowerCase()) &&
      !state.config.ignoreFiles.includes(path.basename(fullPath))) {
      await processFile(fullPath, options, state);
    }
  }
}

function parseNames(input) {
  return input ? input.split(',').map(name => name.trim()).filter(Boolean) : [];
}

function validateNames(names) {
  return names.every(name => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name));
}

function parseOption(args, flag, errorMsg) {
  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1]) {
    const names = parseNames(args[index + 1]);
    if (!validateNames(names)) {
      console.error(errorMsg);
      process.exit(1);
    }
    return names;
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(HELP_TEXT);
    return;
  }

  const state = new State();

  if (args.includes('--skip-list')) {
    console.log('\nCurrent skip list:');
    console.log(Array.from(state.builtInGlobals).sort().join('\n'));
    return;
  }

  if (args.includes('--skip-none')) {
    console.log('🔧 Disabling all skips');
    state.builtInGlobals.clear();
  }

  // Parse options
  const skipNames = parseOption(args, '--skip', '❌ Invalid names provided for --skip');
  if (skipNames) {
    skipNames.forEach(name => state.builtInGlobals.add(name));
  }

  const noSkipNames = parseOption(args, '--no-skip', '❌ Invalid names provided for --no-skip');
  if (noSkipNames) {
    noSkipNames.forEach(name => state.builtInGlobals.delete(name));
  }

  const skipOnlyNames = parseOption(args, '--skip-only', '❌ Invalid names provided for --skip-only');
  if (skipOnlyNames) {
    state.skipOnlySet = new Set(skipOnlyNames);
    state.builtInGlobals.clear();
  }

  const applyOnlyNames = parseOption(args, '--apply-only', '❌ Invalid names provided for --apply-only');
  if (applyOnlyNames) {
    state.applyOnlySet = new Set(applyOnlyNames);
  }

  if (state.skipOnlySet.size > 0 && state.applyOnlySet.size > 0) {
    console.error('❌ Error: --skip-only and --apply-only cannot be used together');
    process.exit(1);
  }

  const typeIndex = args.indexOf('--type');
  const fileType = typeIndex !== -1 ? args[typeIndex + 1] : null;

  if (fileType && !['ts', 'js'].includes(fileType)) {
    console.error('❌ Invalid file type. Use --type ts or --type js');
    process.exit(1);
  }

  const inputPath = args[0];
  const options = {
    preview: args.includes('--preview'),
    fileType
  };

  try {
    const stats = await fs.stat(inputPath);
    console.log('\n🚀 Starting transformation...');

    if (stats.isDirectory()) {
      await processDirectory(inputPath, options, state);
    } else {
      await processFile(inputPath, options, state);
    }

    console.log('\n✨ Processing complete!');
    console.log('\nStatistics:');
    console.log(`Files processed: ${state.stats.filesProcessed}`);
    console.log(`Files modified: ${state.stats.filesModified}`);
    console.log(`Errors encountered: ${state.stats.errors}`);
    console.log(`Warnings: ${state.stats.warnings}`);
    console.log(`Total time: ${state.getExecutionTime()}s`);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.phase) {
      console.error('Phase:', error.phase);
      console.error('Expression:', error.expression);
      console.error('Location:', error.location);
    }
    if (error.filePath) {
      console.error('File:', error.filePath);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { addOptionalChaining };