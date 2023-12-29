import type { Compiler } from "webpack";
import { createServer } from "http";
import type { IncomingMessage, ServerResponse } from "http";
import { escapeHtml } from "./utils/escape-html";
import { embedJson } from "./utils/embed-json";
import { removeIndent, oneLine } from "./utils/format-template";
import { createBookmarkletsList } from "./utils/create-bookmarklets-list";

type Options = {
  port: number;
  host: string;
  logger: ReturnType<Compiler["getInfrastructureLogger"]>;
};

type BookmarkletSource = {
  filename: string;
  script: string;
  hash: string;
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

export class BookmarkletDeliveryServer {
  public readonly host;
  public readonly port;
  public readonly origin;
  private readonly server;
  private bookmarkletSources: BookmarkletSource[] = [];
  private isReady = false;
  private readonly logger;

  public constructor({ port, host, logger }: Options) {
    this.port = port;
    this.host = host;
    this.origin = `http://${this.host}:${this.port}`;
    this.logger = logger;
    this.server = createServer(this.handleRequest);
  }

  public start(): void {
    this.server.listen(this.port, this.host);
    this.logger.info(`Server started at ${this.origin}`);
  }

  public close(): void {
    this.server.close((err) => {
      console.error(err);
    });
  }

  public setBookmarkletSources(sources: BookmarkletSource[]): void {
    this.bookmarkletSources = sources;
  }

  public setIsReady(state: boolean): void {
    this.isReady = state;
  }

  public isStarted(): boolean {
    return this.server.listening;
  }

  private handleRequest = (req: IncomingMessage, res: ServerResponse): void => {
    const reqUrl = new URL(req.url ?? "", this.origin);
    const requestData: RequestData = { reqUrl, req };
    const responseData = this.createResponse(requestData);
    res.statusCode = responseData.status;
    res.setHeader("Content-Type", responseData.contentType);
    res.end(responseData.content);
  };

  private createResponse(requestData: RequestData): ResponseData {
    if (!this.isReady) {
      return this.createHttpErrorResponse({ status: 503, statusText: "Service Unavailable" });
    }

    switch (requestData.reqUrl.pathname) {
      case "/":
        return this.createListResponse();
      case "/file":
        const found = this.bookmarkletSources.find(({ hash }) => (
          hash === requestData.reqUrl.searchParams.get("filename")
        ));
        if (found) {
          return this.createBookmarkletFileResponse(found.script);
        }
        return this.createInvalidFileResponse();
    }

    return this.createHttpErrorResponse({ status: 404, statusText: "Not Found" });
  };

  private createListResponse(): ResponseData {
    const content = createBookmarkletsList(this.bookmarkletSources.map(({ filename, hash }) => ({
      bookmarklet: this.createDynamicScriptingBookmarklet(hash),
      anchorText: `[w] ${escapeHtml(filename)}`
    })));

    return {
      status: 200,
      contentType: "text/html",
      content
    };
  };

  private createDynamicScriptingBookmarklet(hash: string): string {
    const scriptUrl = new URL("/file", this.origin);
    scriptUrl.searchParams.set("filename", hash);

    const generalErrorMessage = removeIndent`
      [BookmarkletOutputWebpackPlugin]
      An error has occurred while loading the script.
      The following are possible reasons.
      - Webpack has not been watched.
      - The webpack process has not finished.
      - Access to localhost from this page has blocked.
    `;

    const cspErrorMessage = removeIndent`
      [BookmarkletOutputWebpackPlugin]
      The script has been blocked by the CSP configured on this page.
      Therefore, the dynamic scripting feature cannot be used on this page.
    `;

    const bookmarkletCode = oneLine`
      (function(d){
        var s=d.createElement('script'),
            u=s.src=${embedJson(`${scriptUrl.href}&id=`)}
              +new Date().getTime()+'-'+(Math.random()+'00000000').slice(2,9),
            E=A(s,'error',function(){
              alert(${embedJson(generalErrorMessage)});
              R()
            }),
            V=A(d,'securitypolicyviolation',function(e){
              e.blockedURI===u
                &&e.disposition==='enforce'
                &&(alert(${embedJson(cspErrorMessage)}),R())
            }),
            L=A(s,'load',R);
        function A(t,n,f){
          t.addEventListener(n,f);
          return function(){
            t.removeEventListener(n,f)
          }
        }
        function R(){
          E();
          V();
          L()
        }
        d.body.appendChild(s).parentNode.removeChild(s)
      })(document)
    `;

    return `javascript:${encodeURIComponent(bookmarkletCode)}`;
  }

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
