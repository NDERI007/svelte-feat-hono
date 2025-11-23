import { Hono } from "hono";
import { AppContext } from "./types/hono";

import authRoutes from "@routes/withAuth";
import placeRoutes from "@routes/place";

const router = new Hono<AppContext>();

// Mount all routes

router.route("/auth", authRoutes);
router.route("/place", placeRoutes);

export default router;
