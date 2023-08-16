import path from "path";
import { escapeHtml } from "./utils/escape-html";
import { ReloadServer } from "./reload-server";
import type { WebpackPluginInstance, Compiler } from "webpack";
import { oneLine } from "./utils/format-template";

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
  dynamicScripting: boolean;
};

class BookmarkletOutputWebpackPlugin implements WebpackPluginInstance {
  public static defaultOptions: Options = {
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
  };

  public options: Options;
  private server?: ReloadServer;

  public constructor(options?: Partial<Options>) {
    this.options = {
      ...BookmarkletOutputWebpackPlugin.defaultOptions,
      ...options
    };
  }

  public apply(compiler: Compiler): void {
    const pluginName = BookmarkletOutputWebpackPlugin.name;

    const logger = compiler.getInfrastructureLogger(pluginName);

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

          const bookmarkletScripts = targetAssets.map(([filename, asset]) => {
            const script = asset.source();

            if (typeof script !== "string") {
              throw new TypeError(`${filename} is not a text file.`);
            }

            return { filename, script };
          });;

          if (this.server) {
            this.server.setBookmarkletScripts(bookmarkletScripts);
          }

          const bookmarklets: Bookmarklet[] = bookmarkletScripts.map(({ filename, script }) => {
            const bookmarklet = `javascript:${this.options.urlEncode ? encodeURIComponent(script) : script}`;
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

    compiler.hooks.watchRun.tap(pluginName, () => {
      if (this.options.dynamicScripting && !this.server) {
        this.server = new ReloadServer(1234, logger);
        this.server.start();
      }
    });

    compiler.hooks.watchClose.tap(pluginName, () => {
      this.server?.close();
      this.server = undefined;
    });
  }
};

export = BookmarkletOutputWebpackPlugin;
