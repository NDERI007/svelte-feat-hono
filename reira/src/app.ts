import { Hono } from "hono";
import { serve } from "@hono/node-server";
import "dotenv/config";
import { AppContext } from "./types/hono";
import { initServices } from "./middleware/init-services";
import router from "./index";

const app = new Hono<AppContext>();

app.use("*", initServices);

app.get("/", (c) => c.json({ message: "Hono + Supabase working!" }));
app.route("/api", router);

const port = parseInt(process.env.PORT || "3000");
console.log(`🚀 Server running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
