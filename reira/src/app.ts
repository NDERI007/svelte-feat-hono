import { Hono } from "hono";
import { cors } from "hono/cors";
import { AppContext } from "./types/hono";
import { initServices } from "./middleware/init-services";
import router from "./index";

const app = new Hono<AppContext>();

// CORS first
app.use(
  "/*",
  cors({
    origin: "http://localhost:5173", // Must match your frontend URL exactly
    credentials: true, // Required for cookies to work
  })
);

// Debug middleware
app.use("*", async (c, next) => {
  console.log(`📍 ${c.req.method} ${c.req.path}`);
  await next();
  console.log(`✅ Response: ${c.res.status}`);
});

// Services
app.use("*", initServices);

// Root route
app.get("/", (c) => {
  return c.json({ message: "Hono + Cloudflare Workers working!" });
});

// API routes
app.route("/api", router);

// 404 handler
app.notFound((c) => {
  console.log(`❌ 404: ${c.req.path}`);
  return c.json({ error: "Not found", path: c.req.path }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error("💥 Error:", err);
  return c.json({ error: err.message || "Internal server error" }, 500);
});

export default app;
