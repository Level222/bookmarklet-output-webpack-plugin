import type { WebpackPluginInstance, Compiler } from "webpack";
import { PluginCore } from "./plugin-core";
import type { PluginOptions } from "./plugin-core";
import { escapeHtml } from "./utils/escape-html";
import { oneLine } from "./utils/format-template";
import { sha256 } from "./utils/sha-256";

export class BookmarkletOutputWebpackPlugin implements WebpackPluginInstance {
  public static defaultOptions: PluginOptions = {
    urlEncode: true,
    include: /\.js$/,
    newFile: false,
    newFileName: "[path][name].bookmarklet[ext]",
    bookmarkletsList: false,
    bookmarkletsListName: "bookmarklets.html",
    removeEntryFile: false,
    createBookmarkletsList: (bookmarklets) => {
      const bookmarkletsListItems = bookmarklets.map(({ filename, bookmarklet }) => (
        `<li><a href="${escapeHtml(bookmarklet)}">${escapeHtml(filename)}</a></li>`
      ));

      return oneLine`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bookmarklets</title>
        </head>
        <body style="font:18px sans-serif;margin:20px">
          <p>You can drag the following bookmarklets and register for the bookmark.</p>
          <ul>${bookmarkletsListItems.join("")}</ul>
        </body>
        </html>
      `;
    },
    dynamicScripting: true,
    serverPort: 3300,
    createFilenameHash: (filename) => sha256(filename, {
      salt: "BOOKMARKLET_OUTPUT_WEBPACK_PLUGIN_DEFAULT_STATIC_SALT",
      stretching: 1000
    })
  };

  public options: PluginOptions;

  public constructor(options?: Partial<PluginOptions>) {
    this.options = {
      ...BookmarkletOutputWebpackPlugin.defaultOptions,
      ...options
    };
  }

  public apply(compiler: Compiler): void {
    const pluginCore = new PluginCore({
      name: BookmarkletOutputWebpackPlugin.name,
      pluginOptions: this.options,
      compiler: compiler
    });
    pluginCore.registerPlugin();
  }
};
