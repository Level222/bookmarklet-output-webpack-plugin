import type { WebpackPluginInstance, Compiler } from "webpack";
import { PluginCore } from "./plugin-core";
import type { PluginOptions } from "./plugin-core";
import { sha256 } from "./utils/sha-256";
import { createBookmarkletsList } from "./utils/create-bookmarklets-list";

export class BookmarkletOutputWebpackPlugin implements WebpackPluginInstance {
  public static defaultOptions: PluginOptions = {
    urlEncode: true,
    include: /\.js$/,
    newFile: false,
    newFileName: "[path][name].bookmarklet[ext]",
    bookmarkletsList: false,
    bookmarkletsListName: "bookmarklets.html",
    removeEntryFile: false,
    createBookmarkletsList: (bookmarklets) => createBookmarkletsList(bookmarklets.map(
      ({ bookmarklet, filename }) => ({ bookmarklet, anchorText: filename }))
    ),
    dynamicScripting: true,
    serverPort: 3300,
    fallbackPort: true,
    serverHost: "localhost",
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
