# chainsafe 🔗

A CLI tool to automatically add optional chaining to TypeScript and JavaScript files.

## Installation

```bash
npm install -g chainsafe
```

## Usage

```bash
chainsafe <path> [options]
```

## Options

```bash
chainsafe --help

Options:
  --type ts|js          Process only TypeScript or JavaScript files
  --skip <names>        Add names to built-in globals to be skipped
  --no-skip <names>     Remove names from built-in globals skip list
  --skip-list           Print current built-in globals list
  --preview             Preview changes without writing to files
  --skip-none           Ignore built-in globals and apply optional chaining to everything
  --skip-only <names>   Only skip the specified names, ignore built-in globals
  --apply-only <names>  Only apply optional chaining to specified modules/variables
  --help                Show help information 
```

## Features

- ✨ Automatic optional chaining transformation
- 🔄 Supports both TypeScript and JavaScript files
- 🎯 Smart detection of potentially nullable expressions
- 🛡️ Preserves existing optional chaining
- ⚡ Fast and efficient processing
- 🔒 Safe transformation with built-in globals protection
- 📝 Preview mode for safe checking
- 📁 Process single files or entire directories
- 🚫 Skip specific globals as needed
- 🎯 Selective application to specific modules
- 🌐 Global application with skip-none mode
- 🔍 Fine-grained control over transformations
- 🔁 Multiple pass transformations for nested chains
- 📊 Detailed statistics and error reporting
- 🛠️ Advanced configuration options

## Examples

### Process all files in a directory
```bash
chainsafe src/
```

### Process only TypeScript files
```bash
chainsafe src/ --type ts
```

### Process only JavaScript files
```bash
chainsafe src/ --type js
```

### Skip certain globals
```bash
chainsafe src/ --skip axios,lodash
```

### Remove items from built-in globals list
```bash
chainsafe src/ --no-skip Array,Object
```

### Preview changes without writing
```bash
chainsafe src/ --preview
```

### View current skip list
```bash
chainsafe src/ --skip-list
```

### Apply optional chaining to everything
```bash
chainsafe src/ --skip-none
```

### Only skip specific modules
```bash
chainsafe src/ --skip-only axios,lodash
```

### Only apply to specific modules
```bash
chainsafe src/ --apply-only axios,process
```

## Multiple Pass Transformations

The tool performs multiple passes (default: 5) to handle deeply nested chains:

### Before:
```javascript
const data = service.getData().process().validate();
const nested = obj.deeply.nested.property.access;
const mixed = api.get().data.process().validate().result;
```

### After:
```javascript
const data = service?.getData()?.process()?.validate();
const nested = obj?.deeply?.nested?.property?.access;
const mixed = api?.get()?.data?.process()?.validate()?.result;
```

## Built-in Globals

The following globals are protected by default and won't receive optional chaining:
- Array
- Object
- String
- Number
- Boolean
- Date
- Math
- JSON
- RegExp
- Error
- Map
- Set
- Promise
- Function
- console
- Buffer
- process

You can:
- Add to this list using `--skip`
- Remove from this list using `--no-skip`
- Replace entirely using `--skip-only`
- Ignore this list using `--skip-none`
- Target specific modules using `--apply-only`

## Technical Details

### Parser Features
- Uses @babel/parser for accurate TypeScript/JavaScript parsing
- Intelligent AST (Abstract Syntax Tree) analysis
- Preserves source code formatting
- Handles complex nested expressions
- Supports .ts, .tsx, .js, and .jsx files

### Configuration
- Maximum file size limit (default: 10MB)
- Configurable ignored directories
- Customizable file extensions
- Binary file detection and skipping
- Multiple pass iterations for nested chains

### TypeScript Support
- Enhanced enum handling
- Improved type reference detection
- Optimized plugin configuration
- Support for TypeScript-specific constructs
- Proper handling of type assertions

## Error Handling

The tool provides:
- Detailed error context (phase, expression, location)
- Clear parsing error messages
- File processing statistics
- Warning detection and reporting
- Safe file transformation
- Validation of skip/apply options
- Original file preservation on failure

## Statistics and Reporting

Each run provides:
- Number of files processed
- Number of files modified
- Errors encountered
- Warnings detected
- Processing time
- Transformation details

## Advanced Usage

### Targeted Transformations
```bash
# Transform specific modules with preview
chainsafe src/ --apply-only axios,lodash --preview

# Exclude specific modules
chainsafe src/ --skip-only axios,fetch

# Transform everything
chainsafe src/ --skip-none
```

### Option Combinations
```bash
# Preview TypeScript transformations
chainsafe src/ --type ts --preview

# Target specific modules in TypeScript
chainsafe src/ --type ts --apply-only axios
```

## Best Practices

1. Always use `--preview` first for safety
2. Back up important files before processing
3. Check `--skip-list` before modifications
4. Process directories individually
5. Use `--apply-only` for targeted changes
6. Test with sample files first
7. Review statistics after processing
8. Check warnings and error messages

## Release Notes

### Version 1.0.4 🚀 (January 20, 2025)

#### New Features 🎉

1. **Multiple Pass Transformations**
   - Support for deeply nested chains
   - Configurable iteration count
   - Improved nested property handling

2. **Enhanced Configuration**
   - File size limits
   - Directory exclusions
   - Binary file handling
   - Customizable extensions

3. **Improved Error Handling**
   - Detailed error context
   - Better error messages
   - Warning detection
   - Statistics tracking

4. **TypeScript Improvements**
   - Better enum handling
   - Enhanced type support
   - Optimized plugins

#### Improvements 🔨

- Optimized AST traversal
- Better skip logic
- Improved performance
- Enhanced error reporting
- Better TypeScript support
- Clearer documentation

#### Breaking Changes ⚠️

None. All new features are backward compatible.

#### Known Issues 🚧

- Complex computed properties might need review
- Some edge cases in TypeScript type assertions
- Very large files might need multiple runs

#### Installation & Upgrade

```bash
# New installation
npm install -g chainsafe

# Upgrade existing installation
npm update -g chainsafe
```

## Contributing

Please submit issues and pull requests on GitHub at https://github.com/dasariumamahesh/chainsafe.

## License

MIT © [Dasari Uma Mahesh (Mahesh)]

## Author

Dasari Uma Mahesh (Mahesh)

## Links

- [GitHub Repository](https://github.com/dasariumamahesh/chainsafe)
- [NPM Package](https://www.npmjs.com/package/chainsafe)
- [Issue Tracker](https://github.com/dasariumamahesh/chainsafe/issues)