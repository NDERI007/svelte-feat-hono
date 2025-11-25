import { Hono } from "hono";
import { AppContext } from "@/types/hono";
import { withAuth } from "@/middleware/auth";
import {
  deleteCategoryIcon,
  deleteImageVariants,
  uploadCategoryIcon,
  uploadImageVariants,
} from "@/utils/imageVar";

const router = new Hono<AppContext>();

router.get("/menu-items", async (c) => {
  const supabase = c.get("supabase");
  const category_id = c.req.query("category_id");

  let query = supabase
    .from("menu_items")
    .select("*")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (category_id && category_id !== "all") {
    query = query.eq("category_id", category_id);
  }

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data || []);
});

router.post("/menu-items", withAuth(["admin"]), async (c) => {
  const supabase = c.get("supabase");

  try {
    const body = await c.req.parseBody();
    const name = body["name"] as string;
    const price = body["price"] as string;
    const available = body["available"] as string;
    const category_id = body["category_id"] as string;
    const imageFile = body["image"];

    let imageJson = null;

    if (imageFile instanceof File) {
      if (!imageFile.type.startsWith("image/")) {
        return c.json({ error: "Only images allowed" }, 400);
      }
      // This will now generate the { variants: { avif:..., jpg:... } } structure
      imageJson = await uploadImageVariants(c, imageFile, name);
    }

    const { data, error } = await supabase
      .from("menu_items")
      .insert([
        {
          name,
          price: parseFloat(price),
          image: imageJson,
          available: available === "true",
          category_id: category_id,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return c.json(data, 201);
  } catch (error: any) {
    console.error("Error creating item:", error);
    return c.json({ error: error.message || "Failed to create" }, 500);
  }
});

// PUT /menu-items/:id
router.put("/menu-items/:id", withAuth(["admin"]), async (c) => {
  const supabase = c.get("supabase");
  const id = c.req.param("id");

  try {
    const body = await c.req.parseBody();
    const name = body["name"] as string;
    const price = body["price"] as string;
    const available = body["available"] as string;
    const category_id = body["category_id"] as string;
    const imageFile = body["image"];

    // Fetch existing
    const { data: existingItem } = await supabase
      .from("menu_items")
      .select("image")
      .eq("id", id)
      .single();

    let imageJson = existingItem?.image;

    if (imageFile instanceof File) {
      if (existingItem?.image) {
        await deleteImageVariants(c, existingItem.image);
      }
      imageJson = await uploadImageVariants(c, imageFile, name);
    }

    const updateData: any = {
      name,
      price: parseFloat(price),
      available: available === "true",
      category_id: category_id || null,
    };

    if (imageFile) updateData.image = imageJson;

    const { data, error } = await supabase
      .from("menu_items")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return c.json(data);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

router.patch("/menu-items/:id/availability", withAuth(["admin"]), async (c) => {
  const supabase = c.get("supabase");
  const id = c.req.param("id");
  const body = await c.req.json();

  const { data, error } = await supabase
    .from("menu_items")
    .update({ available: body.available })
    .eq("id", id)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// DELETE /menu-items/:id
router.delete("/menu-items/:id", withAuth(["admin"]), async (c) => {
  const supabase = c.get("supabase");
  const id = c.req.param("id");

  try {
    const { data: item } = await supabase
      .from("menu_items")
      .select("image")
      .eq("id", id)
      .single();

    if (item?.image) {
      await deleteImageVariants(c, item.image);
    }

    const { error } = await supabase
      .from("menu_items")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    return c.body(null, 204);
  } catch (error) {
    return c.json({ error: "Failed to delete" }, 500);
  }
});

router.get("/categories", async (c) => {
  const supabase = c.get("supabase");
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data || []);
});

router.post("/categories", withAuth(["admin"]), async (c) => {
  const supabase = c.get("supabase");
  try {
    const body = await c.req.parseBody();
    const name = body["name"] as string;
    const iconFile = body["icon"];

    let iconUrl = null;
    if (iconFile instanceof File) {
      iconUrl = await uploadCategoryIcon(c, iconFile, name);
    }

    const { data, error } = await supabase
      .from("categories")
      .insert([{ name, icon_url: iconUrl }])
      .select()
      .single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    return c.json({ error: "Failed to create category" }, 500);
  }
});

// (Added Back) Update Category
router.put("/categories/:id", withAuth(["admin"]), async (c) => {
  const supabase = c.get("supabase");
  const id = c.req.param("id");

  try {
    const body = await c.req.parseBody();
    const name = body["name"] as string;
    const iconFile = body["icon"];

    const { data: existingCategory } = await supabase
      .from("categories")
      .select("icon_url")
      .eq("id", id)
      .single();

    let iconUrl = existingCategory?.icon_url;

    if (iconFile instanceof File) {
      if (existingCategory?.icon_url)
        await deleteCategoryIcon(c, existingCategory.icon_url);
      iconUrl = await uploadCategoryIcon(c, iconFile, name);
    }

    const { data, error } = await supabase
      .from("categories")
      .update({ name, icon_url: iconUrl })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: "Failed to update category" }, 500);
  }
});

router.delete("/categories/:id", withAuth(["admin"]), async (c) => {
  const supabase = c.get("supabase");
  const id = c.req.param("id");
  const { data: category } = await supabase
    .from("categories")
    .select("icon_url")
    .eq("id", id)
    .single();
  if (category?.icon_url) await deleteCategoryIcon(c, category.icon_url);
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return c.json({ error: "Failed to delete" }, 500);
  return c.json({ message: "Category deleted successfully" });
});

// --- Product Variants ---

router.get("/menu-items/:id/variants", async (c) => {
  const supabase = c.get("supabase");
  const id = c.req.param("id");
  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data || []);
});

// (Added Back) Get Single Variant
router.get("/product-variants/:variantId", async (c) => {
  const supabase = c.get("supabase");
  const variantId = c.req.param("variantId");

  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("id", variantId)
    .single();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Variant not found" }, 404);
  return c.json(data);
});

router.post("/menu-items/:id/variants", withAuth(["admin"]), async (c) => {
  const supabase = c.get("supabase");
  const id = c.req.param("id");
  const { size_name, price, is_available } = await c.req.json();

  const { data, error } = await supabase
    .from("product_variants")
    .insert([
      {
        product_id: id,
        size_name,
        price: parseFloat(price),
        is_available: is_available ?? true,
      },
    ])
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data, 201);
});

// (Added Back) Update Variant
router.put("/product-variants/:variantId", withAuth(["admin"]), async (c) => {
  const supabase = c.get("supabase");
  const variantId = c.req.param("variantId");
  const { size_name, price, is_available } = await c.req.json();

  const { data, error } = await supabase
    .from("product_variants")
    .update({ size_name, price: parseFloat(price), is_available })
    .eq("id", variantId)
    .select()
    .single();

  if (error) return c.json({ error: "Failed to update" }, 500);
  return c.json(data);
});

// (Added Back) Delete Variant
router.delete(
  "/product-variants/:variantId",
  withAuth(["admin"]),
  async (c) => {
    const supabase = c.get("supabase");
    const variantId = c.req.param("variantId");
    const { error } = await supabase
      .from("product_variants")
      .delete()
      .eq("id", variantId);
    if (error) return c.json({ error: "Failed to delete" }, 500);
    return c.body(null, 204);
  }
);

export default router;
