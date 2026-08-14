import http from "node:http";
import { handleNotesRoutes } from "./notes/routes.js";
import { NoteStore } from "./notes/store.js";

export function createServer(store = new NoteStore()): http.Server {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (await handleNotesRoutes(req, res, url.pathname, store)) {
      return;
    }

    res.writeHead(404);
    res.end();
  });
}
