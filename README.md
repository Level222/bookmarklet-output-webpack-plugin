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

### Load Scripts Dynamically in Watch

Register a dedicated bookmarklet and load the script dynamically from localhost while developing in watch mode.

1. `webpack --watch`
2. Visit `http://localhost:3300`
3. Register bookmarklets on the page

There are a few things to keep in mind about this feature.

#### Restrictions on Accessing Localhost.

Different browsers have different restrictions on accessing localhost.

For example, Chrome allows access from HTTPS pages, but blocks it from HTTP pages. However, this can be disabled from `chrome://flags/#block-insecure-private-network-requests`.

In Safari, access from HTTPS is blocked as Mixed Content.

For more information, visit [Private Network Access update: Introducing a deprecation trial - Chrome for Developers](https://developer.chrome.com/blog/private-network-access-update/)

#### CSP

The script element is added to the page and may be blocked by CSP.

#### Difference from Direct Execution

The script does not run as a bookmarklet, resulting in the following problems.

- Some browsers reject processes that must be handled by user gestures
- The value of `document.currentScript` will not be null
- Completion values of terminal statement do not affect the page

## Options

```typescript
type Bookmarklet = {
  filename: string;
  bookmarklet: string;
};

type PluginOptions = {
  /**
   * URL encoding.
   * @default true
   */
  urlEncode: boolean;

  /**
   * Regular expression for filenames to include.
   * @default /\.js$/
   */
  include: RegExp;

  /**
   * Output as a new file.
   * @default false
   */
  newFile: boolean;

  /**
   * Name of the new output file.
   * "[path]", "[name]", and "[ext]" will be replaced.
   * @default "[path][name].bookmarklet[ext]"
   */
  newFileName: string;

  /**
   * Output HTML file of the list of bookmarklets.
   * @default false
   */
  bookmarkletsList: boolean;

  /**
   * File name of the bookmarklets list.
   * @default "bookmarklets.html"
   */
  bookmarkletsListName: string;

  /**
   * Remove entry js file.
   * Use with bookmarkletsList option and output only bookmarklets list.
   * @default false
   */
  removeEntryFile: boolean;

  /**
   * Function to create a bookmarklets list.
   * You can customize bookmarklets list with this option.
   */
  createBookmarkletsList: (bookmarklets: Bookmarklet[]) => string;

  /**
   * Use dynamic scripting feature when running in watch mode.
   * @default true
   */
  dynamicScripting: boolean;

  /**
   * Server port for dynamic scripting.
   * @default 3300
   */
  serverPort: number;

  /**
   * Server hostname for dynamic scripting.
   * @default "localhost"
   */
  serverHost: string;

  /**
   * Function that return a hash value to protect the filename when loading dynamic scripts.
   * The default is SHA-256, but customization improves security.
   */
  createFilenameHash: (filename: string) => string | Promise<string>;
};
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

## License

[MIT](./LICENSE)
