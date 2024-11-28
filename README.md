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
chainsafe src/ --skip axios lodash
```

### Remove items from built-in globals list
```bash
chainsafe src/ --no-skip Array Object
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
chainsafe src/ --skip-only axios lodash
```

### Only apply to specific modules
```bash
chainsafe src/ --apply-only axios process
```

## Before and After

### Before:
```javascript
const user = getUser();
const name = user.profile.name;
const city = user.profile.address.city;
const apiData = axios.get('/api').data.items;
```

### After:
```javascript
const user = getUser();
const name = user?.profile?.name;
const city = user?.profile?.address?.city;
const apiData = axios?.get('/api')?.data?.items;  // With --apply-only axios
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

You can:
- Add to this list using `--skip`
- Remove from this list using `--no-skip`
- Replace entirely using `--skip-only`
- Ignore this list using `--skip-none`
- Target specific modules using `--apply-only`

## Technical Details

- Uses @babel/parser for accurate TypeScript/JavaScript parsing
- Analyzes AST (Abstract Syntax Tree) for safe transformations
- Preserves source code formatting
- Handles complex nested expressions
- Supports .ts, .tsx, .js, and .jsx files
- Smart module-specific transformation support
- Configurable transformation scope

## Error Handling

The tool will:
- Skip files it can't process safely
- Report parsing errors clearly
- Maintain original file on transformation failure
- Skip invalid global names in --skip/--no-skip
- Validate mutually exclusive options
- Ensure proper argument format for all options

## Tips

1. Always use `--preview` first when processing many files
2. Back up important files before processing
3. Use `--skip-list` to verify current globals configuration
4. Process one directory at a time for better control
5. Use `--apply-only` for targeted transformations
6. Use `--skip-none` when maximum coverage is needed
7. Combine with `--preview` to verify transformations

## Advanced Usage

### Targeted Transformations
```bash
# Only transform axios and lodash chains
chainsafe src/ --apply-only axios lodash --preview

# Transform everything except specific modules
chainsafe src/ --skip-only axios fetch

# Transform absolutely everything
chainsafe src/ --skip-none
```

### Option Combinations
```bash
# Preview targeted transformations
chainsafe src/ --apply-only axios --preview

# Process only TypeScript files with targeted transformations
chainsafe src/ --type ts --apply-only axios
```

## Release Notes

### Version 1.0.2 🚀 (October 26, 2024)

#### New Features 🎉

1. **Apply-Only Mode** (`--apply-only`)
   - Selectively apply optional chaining to specific modules
   - Target transformations to particular packages
   ```bash
   chainsafe src/ --apply-only axios lodash
   ```

2. **Skip-None Mode** (`--skip-none`)
   - Bypass built-in globals protection
   - Apply optional chaining universally
   ```bash
   chainsafe src/ --skip-none
   ```

3. **Skip-Only Mode** (`--skip-only`)
   - Custom control over skipped modules
   - Replace default built-in globals list
   ```bash
   chainsafe src/ --skip-only axios fetch
   ```

#### Improvements 🔨

- Enhanced module-specific transformation logic
- Better handling of nested member expressions
- Improved validation for mutually exclusive options
- Clearer error messages for invalid configurations

#### Breaking Changes ⚠️

None. All new features are backward compatible.

#### Known Issues 🚧

- Multiple chained operations might require multiple passes
- Computed property access with `--apply-only` may need review

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
