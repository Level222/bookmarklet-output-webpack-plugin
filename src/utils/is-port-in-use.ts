import net from "net";

export const isPortInUse = (port: number): Promise<boolean> => (
  new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if ("code" in error && error.code === "EADDRINUSE") {
        resolve(true);
      } else {
        reject(error);
      }
    });

    server.once("listening", () => {
      resolve(false);
      server.close();
    });

    server.listen(port);
  })
);
