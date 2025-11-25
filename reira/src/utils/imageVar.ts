import { Context } from "hono";
import * as jpeg from "@jsquash/jpeg";
import * as png from "@jsquash/png";
import * as avif from "@jsquash/avif";
import resize from "@jsquash/resize";

import { AppContext } from "@/types/hono";

export async function uploadImageVariants(
  c: Context<AppContext>,
  file: File,
  namePrefix: string
) {
  const supabase = c.get("supabase");
  const timestamp = Date.now();
  const sanitizedName = namePrefix.toLowerCase().replace(/[^a-z0-9]/g, "-");

  // 1. Load buffer
  const buffer = await file.arrayBuffer();

  // 2. Decode (Handle PNG/JPG input)
  let imageData;
  try {
    if (file.type === "image/jpeg" || file.type === "image/jpg") {
      imageData = await jpeg.decode(buffer);
    } else if (file.type === "image/png") {
      imageData = await png.decode(buffer);
    } else {
      throw new Error("Unsrouterorted input format. Please upload JPG or PNG.");
    }
  } catch (e) {
    console.error("Image decode error:", e);
    throw new Error("Failed to process image file");
  }

  // Define target sizes
  const sizes = [400, 800];

  // Output structure matching your Svelte component
  const variants: any = {
    avif: {},
    jpg: {},
  };

  // 3. Process Function
  const processSize = async (width: number) => {
    // Calculate height (Maintain Aspect Ratio)
    const height = Math.round((imageData.height / imageData.width) * width);

    // A. Resize (Triangle is fast, Lanczos3 is sharper but slower)
    const resizedData = await resize(imageData, {
      width,
      height,
      method: "triangle",
    });

    // B. Generate & Upload AVIF

    const avifBuffer = await avif.encode(resizedData, { speed: 8 }); // speed 8 is a good balance for real-time
    const avifName = `menu-items/${sanitizedName}-${timestamp}-${width}.avif`;

    await supabase.storage.from("airi").upload(avifName, avifBuffer, {
      contentType: "image/avif",
      upsert: true,
    });
    const { data: avifUrl } = supabase.storage
      .from("airi")
      .getPublicUrl(avifName);
    variants.avif[width] = avifUrl.publicUrl;

    // C. Generate & Upload JPG
    const jpgBuffer = await jpeg.encode(resizedData, { quality: 80 });
    const jpgName = `menu-items/${sanitizedName}-${timestamp}-${width}.jpg`;

    await supabase.storage.from("airi").upload(jpgName, jpgBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });
    const { data: jpgUrl } = supabase.storage
      .from("airi")
      .getPublicUrl(jpgName);
    variants.jpg[width] = jpgUrl.publicUrl;
  };

  // Run in parallel
  await Promise.all(sizes.map((size) => processSize(size)));

  return { variants };
}

// --- Cleanup Helper ---

export async function deleteImageVariants(
  c: Context<AppContext>,
  imageData: any
) {
  if (!imageData || !imageData.variants) return;

  const supabase = c.get("supabase");
  const pathsToRemove: string[] = [];

  const extractPath = (url: string) => {
    if (!url) return null;
    const parts = url.split("/storage/v1/object/public/airi/");
    return parts[1] || null;
  };

  // Walk through the variants structure
  ["avif", "jpg"].forEach((format) => {
    if (imageData.variants[format]) {
      Object.values(imageData.variants[format]).forEach((url: any) => {
        const path = extractPath(url as string);
        if (path) pathsToRemove.push(path);
      });
    }
  });

  if (pathsToRemove.length > 0) {
    await supabase.storage.from("airi").remove(pathsToRemove);
  }
}

// --- Category Icon Helpers ---
export async function uploadCategoryIcon(
  c: Context<AppContext>,
  file: File,
  categoryName: string
) {
  const supabase = c.get("supabase");
  const timestamp = Date.now();
  const sanitizedName = categoryName.toLowerCase().replace(/[^a-z0-9]/g, "-");

  let extension = "bin";
  if (file.type === "image/svg+xml") extension = "svg";
  else if (file.type.includes("/")) extension = file.type.split("/")[1];

  const fileName = `category-icons/${sanitizedName}-${timestamp}.${extension}`;

  const { error } = await supabase.storage
    .from("airi")
    .upload(fileName, file, { contentType: file.type, upsert: true });

  if (error) throw error;
  const { data } = supabase.storage.from("airi").getPublicUrl(fileName);
  return data.publicUrl;
}

export async function deleteCategoryIcon(
  c: Context<AppContext>,
  iconUrl: string | null
) {
  if (!iconUrl) return;
  const supabase = c.get("supabase");
  try {
    const urlParts = iconUrl.split("/storage/v1/object/public/airi/");
    if (urlParts.length < 2 || !urlParts[1]) return;
    await supabase.storage.from("airi").remove([urlParts[1]]);
  } catch (err) {
    console.error("Error deleting category icon:", err);
  }
}
