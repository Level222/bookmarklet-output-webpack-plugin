import path from "path";
import type { WebpackPluginInstance, Compiler } from "webpack";

type Bookmarklet = {
  filename: string;
  bookmarklet: string;
};

type Options = {
  urlEncode: boolean;
  include: RegExp;
  newFile: boolean;
  newFileName: string;
  bookmarkletsList: boolean;
  bookmarkletsListName: string;
  removeEntryFile: boolean;
  createBookmarkletsList: (bookmarklets: Bookmarklet[]) => string;
};

const escapeHtml = (str: string): string => {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&#34;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
};

class BookmarkletOutputWebpackPlugin implements WebpackPluginInstance {
  static defaultOptions: Options = {
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

      return `
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
      `.replace(/^\s+|\n/mg, "");
    }
  };

  options: Options;

  constructor(options?: Partial<Options>) {
    this.options = {
      ...BookmarkletOutputWebpackPlugin.defaultOptions,
      ...options
    };
  }

  apply(compiler: Compiler): void {
    const pluginName = BookmarkletOutputWebpackPlugin.name;

    const {
      Compilation,
      sources: { RawSource }
    } = compiler.webpack;

    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: pluginName,
          stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE - 1
        },
        (assets) => {
          const targetAssets = Object.entries(assets).filter(([filename]) => (
            this.options.include.test(filename)
          ));

          const bookmarklets: Bookmarklet[] = targetAssets.map(([filename, asset]) => {
            const code = asset.source();

            if (typeof code !== "string") {
              throw new TypeError(`${filename} is not a text file.`);
            }

            const bookmarklet = `javascript:${this.options.urlEncode ? encodeURIComponent(code) : code}`;
            return { filename, bookmarklet };
          });

          for (const { filename, bookmarklet } of bookmarklets) {
            const newSource = new RawSource(bookmarklet);

            if (this.options.newFile) {
              const parsedPath = path.parse(filename);
              const newFileName = this.options.newFileName
                .replaceAll("[path]", `${parsedPath.dir}/`)
                .replaceAll("[name]", parsedPath.name)
                .replaceAll("[ext]", parsedPath.ext);
              compilation.emitAsset(newFileName, newSource, {
                minimized: true
              });
            } else {
              compilation.updateAsset(filename, newSource);
            }

            if (this.options.removeEntryFile) {
              compilation.deleteAsset(filename);
            }
          }

          if (this.options.bookmarkletsList) {
            const bookmarkletsList = this.options.createBookmarkletsList(bookmarklets);
            const bookmarkletsListSource = new RawSource(bookmarkletsList);
            compilation.emitAsset(this.options.bookmarkletsListName, bookmarkletsListSource);
          }
        });
    });
  }
};

export = BookmarkletOutputWebpackPlugin;
