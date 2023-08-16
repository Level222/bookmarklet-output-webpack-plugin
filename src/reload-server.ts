import { Server, createServer } from "http";
import type { IncomingMessage, ServerResponse } from "http";
import { escapeHtml } from "./utils/escape-html";
import { embedJson } from "./utils/embed-json";
import { mapAsync, findAsync } from "./utils/async-array";
import { sha256 } from "./utils/sha-256";
import { removeIndent, oneLine } from "./utils/format-template";
import type { Compiler } from "webpack";

type BookmarkletScript = {
  filename: string;
  script: string;
};

type RequestData = {
  reqUrl: URL;
  req: IncomingMessage;
};

type ResponseData = {
  status: number;
  contentType: string;
  content: any;
};

export class ReloadServer {
  public readonly host = "localhost";
  public readonly origin;
  private readonly server: Server;
  private bookmarkletScripts?: BookmarkletScript[];

  public constructor(
    public readonly port: number,
    private readonly logger: ReturnType<Compiler["getInfrastructureLogger"]>
  ) {
    this.origin = `http://${this.host}:${this.port}`;
    this.server = createServer(this.handleRequest);
  }

  public start(): void {
    this.server.listen(this.port);
    this.logger.info(`Server started at ${this.origin}`);
  }

  public setBookmarkletScripts(scripts: BookmarkletScript[]): void {
    this.bookmarkletScripts = scripts;
  }

  public close(): void {
    this.server.close((err) => {
      console.error(err);
    });
  }

  private handleRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const reqUrl = new URL(req.url ?? "", this.origin);
    const requestData: RequestData = { reqUrl, req };
    const responseData = await this.createResponse(requestData);
    res.statusCode = responseData.status;
    res.setHeader("Content-Type", responseData.contentType);
    res.end(responseData.content);
  };

  private async createResponse(requestData: RequestData): Promise<ResponseData> {
    if (!this.bookmarkletScripts) {
      return this.createHttpErrorResponse({ status: 503, statusText: "Service Unavailable" });
    }

    switch (requestData.reqUrl.pathname) {
      case "/":
        return await this.createListResponse(this.bookmarkletScripts);
      case "/file":
        const found = await findAsync(this.bookmarkletScripts, async ({ filename }) => (
          await sha256(filename) === requestData.reqUrl.searchParams.get("filename")
        ));
        if (found) {
          return this.createBookmarkletFileResponse(found.script);
        }
        return this.createInvalidFileResponse();
    }

    return this.createHttpErrorResponse({ status: 404, statusText: "Not Found" });
  };

  private async createListResponse(bookmarkletScripts: BookmarkletScript[]): Promise<ResponseData> {
    const reloadBookmarkletListItems = await mapAsync(bookmarkletScripts, async ({ filename }) => {
      const scriptUrl = new URL("/file", this.origin);
      scriptUrl.searchParams.set("filename", await sha256(filename));

      const errorMessage = removeIndent`
        [BookmarkletOutputWebpackPlugin]
        An error has occurred while loading the script.
        It is possible that webpack has not been watched, the webpack process has not finished, the URL is invalid, or access to the local server has failed.
        Please wait a moment and try again.
      `;

      const reloadBookmarkletCode = oneLine`
        (function(s){
          s.src=${embedJson(scriptUrl.href)};
          s.addEventListener("error",function(){
            alert(${embedJson(errorMessage)})
          });
          document.body.appendChild(s);
          s.parentNode.removeChild(s)
        })(document.createElement('script'))
      `;

      const anchorHref = `javascript:${encodeURIComponent(reloadBookmarkletCode)}`;
      return `<li><a href="${anchorHref}">[w] ${escapeHtml(filename)}</a></li>`;
    });

    const content = oneLine`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bookmarklets</title>
      </head>
      <body style="font:18px sans-serif;margin:20px">
        <p>You can drag the following bookmarklets and register for the bookmark.</p>
        <ul>${reloadBookmarkletListItems.join("")}</ul>
      </body>
      </html>
    `;

    return {
      status: 200,
      contentType: "text/html",
      content
    };
  };

  private createBookmarkletFileResponse(script: string): ResponseData {
    return {
      status: 200,
      contentType: "text/javascript",
      content: script
    };
  }

  private createInvalidFileResponse(): ResponseData {
    const errorContent = removeIndent`
      [BookmarkletOutputWebpackPlugin]
      The requested filename cannot be found.
      Please reload the registration page and register the bookmarklet again.
    `;

    return {
      status: 200,
      contentType: "text/javascript",
      content: `alert(${embedJson(errorContent)})`
    };
  }

  private createHttpErrorResponse({ status, statusText }: { status: number; statusText: string; }): ResponseData {
    return {
      status,
      contentType: "text/plain",
      content: `${status} ${statusText}`
    };
  }
}