import { escapeHtml } from "./escape-html";
import { oneLine } from "./format-template";

export type BookmarkletsListItem = {
  anchorText: string;
  bookmarklet: string;
}

export const createBookmarkletsList = (bookmarklets: BookmarkletsListItem[]): string => {
  const listItems = bookmarklets.map(({ bookmarklet, anchorText }) => (
    `<li><a href="${escapeHtml(bookmarklet)}">${escapeHtml(anchorText)}</a></li>`
  ));

  const htmlText = oneLine`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bookmarklets</title>
    </head>
    <body style="font:18px sans-serif;margin:20px">
      <p>You can drag the following bookmarklets and register for the bookmark.</p>
      <ul>${listItems.join("")}</ul>
    </body>
    </html>
  `;

  return htmlText;
};
