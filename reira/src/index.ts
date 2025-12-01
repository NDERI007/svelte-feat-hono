import { Hono } from "hono";
import { AppContext } from "./types/hono";

import authRoutes from "@routes/withAuth";
import placeRoutes from "@routes/place";
import menuRoutes from "@routes/menu";
import orderRoutes from "@routes/order";
import addressRoutes from "@routes/address";
const router = new Hono<AppContext>();

// Mount all routes

router.route("/auth", authRoutes);
router.route("/place", placeRoutes);
router.route("/prod", menuRoutes);
router.route("/orders", orderRoutes);
router.route("/address", addressRoutes);

export default router;
