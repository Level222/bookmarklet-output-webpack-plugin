import type { Compilation, Compiler } from "webpack";
import { BookmarkletDeliveryServer } from "./bookmarklet-delivery-server";
import path from "path";

type Bookmarklet = {
  filename: string;
  bookmarklet: string;
};

export type PluginOptions = {
  /**
   * URL encoding.
   * @default true
   */
  urlEncode: boolean;

  /**
   * Ensure that the completion values of terminal statement is undefined.
   * If you use Terser to minify, you need to enable Terser's 'expression' option.
   * For Other minimizers, you need to use a similar feature.
   * @default true
   */
  ensureUndefined: boolean;

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
   * Fall back if the port was already in use.
   */
  fallbackPort: boolean;

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

type Options = {
  name: string;
  pluginOptions: PluginOptions;
  compiler: Compiler;
};

export class PluginCore {
  public readonly pluginName;
  public readonly options;
  public readonly compiler;
  private readonly logger;
  private readonly server;

  public constructor(options: Options) {
    this.pluginName = options.name;
    this.options = options.pluginOptions;
    this.compiler = options.compiler;
    this.logger = this.compiler.getInfrastructureLogger(this.pluginName);
    this.server = new BookmarkletDeliveryServer({
      port: this.options.serverPort,
      fallbackPort: this.options.fallbackPort,
      host: this.options.serverHost,
      logger: this.logger
    });
  }

  public registerPlugin(): void {
    this.compiler.hooks.thisCompilation.tap(this.pluginName, (compilation) => {
      this.server.setIsReady(false);
      const { Compilation } = this.compiler.webpack;

      compilation.hooks.processAssets.tap(
        {
          name: this.pluginName,
          stage: Compilation.PROCESS_ASSETS_STAGE_PRE_PROCESS
        },
        () => {
          this.processAssetsPreProcess(compilation);
        }
      );

      compilation.hooks.processAssets.tap(
        {
          name: this.pluginName,
          stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE - 1
        },
        () => {
          this.processAssetsBeforeSummarize(compilation);
        }
      );
    });

    this.compiler.hooks.watchRun.tap(this.pluginName, () => {
      if (this.options.dynamicScripting && !this.server.isStarted()) {
        this.server.start();
      }
    });

    this.compiler.hooks.watchClose.tap(this.pluginName, () => {
      this.server.close();
    });
  }

  private getTargetAssetTexts(assets: Compilation["assets"]): Map<string, string> {
    return new Map(
      Object.entries(assets).flatMap(([filename, asset]) => {
        if (!this.options.include.test(filename)) {
          return [];
        }

        const content = asset.source();
        if (typeof content !== "string") {
          throw new TypeError(`${filename} is not a text file.`);
        }

        return [[filename, content]];
      })
    );
  }

  private processAssetsPreProcess(compilation: Compilation): void {
    if (!this.options.ensureUndefined) {
      return;
    }

    const { RawSource } = this.compiler.webpack.sources;

    const targetAssets = this.getTargetAssetTexts(compilation.assets);

    for (const [filename, script] of targetAssets) {
      const newScript = `${script};void 0;`;
      compilation.updateAsset(filename, new RawSource(newScript));
    }
  }

  private processAssetsBeforeSummarize(compilation: Compilation): void {
    const { RawSource } = this.compiler.webpack.sources;

    const targetAssetTexts = this.getTargetAssetTexts(compilation.assets);

    const bookmarkletScripts = [...targetAssetTexts].map(
      ([filename, script]) => ({ filename, script })
    );

    if (this.server.isStarted()) {
      Promise.all(
        bookmarkletScripts.map(async (bookmarkletScript) => {
          const hash = await this.options.createFilenameHash(bookmarkletScript.filename);
          return { ...bookmarkletScript, hash };
        })
      ).then((bookmarkletSources) => {
        this.server.setBookmarkletSources(bookmarkletSources);
        this.server.setIsReady(true);
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
}
