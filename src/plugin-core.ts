import path from "path";
import { BookmarkletDeliveryServer } from "./bookmarklet-delivery-server";
import type { Compilation, Compiler } from "webpack";

type Bookmarklet = {
  filename: string;
  bookmarklet: string;
};

export type PluginOptions = {
  urlEncode: boolean;
  include: RegExp;
  newFile: boolean;
  newFileName: string;
  bookmarkletsList: boolean;
  bookmarkletsListName: string;
  removeEntryFile: boolean;
  createBookmarkletsList: (bookmarklets: Bookmarklet[]) => string;
  dynamicScripting: boolean;
  serverPort: number;
  createFilenameHash: (filename: string) => string | Promise<string>;
};

type Options = {
  name: string;
  pluginOptions: PluginOptions;
  compiler: Compiler;
};

export class PluginCore {
  public readonly options;
  public readonly pluginName;
  public readonly compiler;
  private server?: BookmarkletDeliveryServer;
  private readonly logger;

  public constructor(options: Options) {
    this.pluginName = options.name;
    this.options = options.pluginOptions;
    this.compiler = options.compiler;
    this.logger = this.compiler.getInfrastructureLogger(this.pluginName);
  }

  public registerPlugin(): void {
    this.compiler.hooks.thisCompilation.tap(this.pluginName, (compilation) => {
      const { Compilation } = this.compiler.webpack;
      compilation.hooks.processAssets.tap(
        {
          name: this.pluginName,
          stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE - 1
        },
        () => {
          this.processAssets(compilation);
        }
      );
    });

    this.compiler.hooks.watchRun.tap(this.pluginName, () => {
      if (this.options.dynamicScripting && !this.server) {
        this.startServer();
      }
    });

    this.compiler.hooks.watchClose.tap(this.pluginName, () => {
      this.closeServer();
    });
  }

  private processAssets(compilation: Compilation): void {
    const { RawSource } = this.compiler.webpack.sources;

    const targetAssets = Object.entries(compilation.assets).filter(([filename]) => (
      this.options.include.test(filename)
    ));

    const bookmarkletScripts = targetAssets.map(([filename, asset]) => {
      const script = asset.source();

      if (typeof script !== "string") {
        throw new TypeError(`${filename} is not a text file.`);
      }

      return { filename, script };
    });

    if (this.server) {
      Promise.all(
        bookmarkletScripts.map(async (bookmarkletScript) => {
          const hash = await this.options.createFilenameHash(bookmarkletScript.filename);
          return { ...bookmarkletScript, hash };
        })
      ).then((bookmarkletSources) => {
        this.server?.setBookmarkletSources(bookmarkletSources);
      });
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
  };

  private startServer(): void {
    this.server = new BookmarkletDeliveryServer({
      port: this.options.serverPort,
      logger: this.logger
    });
    this.server.start();
  };

  private closeServer(): void {
    this.server?.close();
    this.server = undefined;
  };
}
