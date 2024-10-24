# chainsafe 🔗

[![npm version](https://badge.fury.io/js/chainsafe.svg)](https://www.npmjs.com/package/chainsafe)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Downloads](https://img.shields.io/npm/dt/chainsafe.svg)](https://www.npmjs.com/package/chainsafe)

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

## Before and After

### Before:
```javascript
const user = getUser();
const name = user.profile.name;
const city = user.profile.address.city;
```

### After:
```javascript
const user = getUser();
const name = user?.profile?.name;
const city = user?.profile?.address?.city;
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

You can modify this list using the `--skip` and `--no-skip` options.

## Technical Details

- Uses @babel/parser for accurate TypeScript/JavaScript parsing
- Analyzes AST (Abstract Syntax Tree) for safe transformations
- Preserves source code formatting
- Handles complex nested expressions
- Supports .ts, .tsx, .js, and .jsx files

## Error Handling

The tool will:
- Skip files it can't process safely
- Report parsing errors clearly
- Maintain original file on transformation failure
- Skip invalid global names in --skip/--no-skip

## Tips

1. Always use `--preview` first when processing many files
2. Back up important files before processing
3. Use `--skip-list` to verify current globals configuration
4. Process one directory at a time for better control

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