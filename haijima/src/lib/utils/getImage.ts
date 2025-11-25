import type { ImageVariants } from '$lib/schemas/menu';

/**
 * Helper to extract the best available image URL from your variant structure.
 * Prioritizes AVIF > JPG, and 400px > 800px (or vice versa depending on logic).
 */
export const getImageUrl = (image: string | ImageVariants | null) => {
	if (!image) return '';

	// If it's already a direct URL string
	if (typeof image === 'string') return image;

	// If it's the variants object
	const variants = image.variants;
	if (!variants) return '';

	// Preferred sizes
	const sizes = [400, 800];

	// 1. Try AVIF (Better compression)
	if (variants.avif) {
		for (const size of sizes) {
			if (variants.avif[size]) return variants.avif[size];
		}
	}

	// 2. Fallback to JPG
	if (variants.jpg) {
		for (const size of sizes) {
			if (variants.jpg[size]) return variants.jpg[size];
		}
	}

	// 3. Last resort: LQIP (Low Quality Placeholder)
	return image.lqip || '';
};
