# Bookmarklet Output Webpack Plugin

Webpack Plugin to output JavaScript in bookmarklet format.

## Installation

```shell
npm i -D bookmarklet-output-webpack-plugin
```

## Usage

```javascript
// webpack.config.js
const path = require('path');
const BookmarkletOutputWebpackPlugin = require("bookmarklet-output-webpack-plugin");

module.exports = {
  // ...
  mode: "production",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "example-bookmarklet.js"
  },
  plugins: [
    new BookmarkletOutputWebpackPlugin()
  ]
};
```

```javascript
// dist/example-bookmarklet.js
javascript:alert(%22Hello%22)%3B
```

### Output as a New File

```javascript
new BookmarkletOutputWebpackPlugin({
  newFile: true
})
```

```javascript
// dist/example-bookmarklet.js
alert("Hello");
```

```javascript
// dist/example-bookmarklet.bookmarklet.js
javascript:alert(%22Hello%22)%3B
```

### Create HTML File of the List of Bookmarklets

```javascript
new BookmarkletOutputWebpackPlugin({
  bookmarkletsList: true
})
```

```javascript
// dist/example-bookmarklet.js
javascript:alert(%22Hello%22)%3B
```

```html
<!-- dist/bookmarklets.html -->
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Bookmarklets</title><style>body{font:18px sans-serif;margin:20px}</style></head><body><p>You can drag the following bookmarklets and register for the bookmark.</p><ul><li><a href="javascript:alert(%22Hello%22)%3B">example-bookmarklet.js</a></li></ul></body></html>
```

## Options

```typescript
type Options = {
  urlEncode?: boolean;
  // default: true
  // URL encoding.

  include?: RegExp;
  // default: /\.js$/
  // Regular expression for filenames to include.

  newFile?: boolean;
  // default: false
  // Output as a new file.

  newFileName?: string;
  // default: "[path][name].bookmarklet[ext]"
  // Name of the new output file.
  // "[path]", "[name]", and "[ext]" will be replaced.

  bookmarkletsList?: boolean;
  // default: false
  // Output HTML file of the list of bookmarklets.

  bookmarkletsListName?: string;
  // default: "bookmarklets.html"
  // File name of the bookmarklets list.

  removeEntryFile?: boolean;
  // default: false
  // Remove entry js file.
  // Use with bookmarkletsList and output only bookmarklets list.

  createBookmarkletsList?: (bookmarklets: { filename: string; bookmarklet: string; }[]) => string;
  // default: (bookmarklets) => { /* ... */ }
  // Function to create a bookmarklets list.
  // You can customize bookmarklets list with this option.
}
```

## Tips for Creating Bookmarklets

### Always Set Completion Values of Terminal Statement to `undefined`

When you run the bookmarklet, if the completion value of the terminal statement is not `undefined`, the contents of the page will be replaced with the completion value.

Webpack wraps the code in an IIFE, so the completion value is usually `undefined`. However, when the code is minified, the IIFE may be removed.

Therefore, it is recommended to enable the `expression` option of the Terser Webpack Plugin.

```shell
npm i -D terser-webpack-plugin
```

```javascript
// webpack.config.js
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  // ...
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            expression: true
          }
        }
      })
    ]
  }
};
```

```javascript
// dist/example-bookmarklet.js
javascript:void alert("Hello");
```

## Note

This plugin does not support `webpack-dev-server`.

## License

[MIT](./LICENSE)