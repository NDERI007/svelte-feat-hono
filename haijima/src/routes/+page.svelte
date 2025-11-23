<script lang="ts">
  import PlaceAutocomplete from '$lib/components/autoplaces.svelte';
  import type { PlaceResult } from '$lib/apis/places';
  

  function handlePlaceSelected(place: PlaceResult) {
    console.log('Selected place:', place);
    
    // Save to your store (create a delivery store similar to React)
    // import { deliveryStore } from '$lib/stores/delivery';
    // deliveryStore.setAddress(place);
    
    // Navigate to dashboard
    
  }
</script>

<section class="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 bg-[#fefaef] px-4 py-12 lg:min-h-[80vh] lg:grid-cols-5 lg:gap-8 lg:px-8 lg:py-16">
  <!-- COLUMN 1: The Giant Headline -->
  <div class="col-span-1 text-center font-black leading-none uppercase text-green-900 lg:col-span-3 lg:text-left">
    <span class="block text-5xl lg:text-[6rem]">The Easy</span>
    <span class="block text-6xl lg:text-[8rem]">Meals for</span>
    <span class="block text-5xl lg:text-[6rem]">Busy Days</span>
  </div>

  <!-- COLUMN 2: The Content -->
  <div class="col-span-1 flex flex-col gap-6 lg:col-span-2">
    <!-- Info Block -->
    <div class="flex flex-col gap-1 text-green-900">
      <p class="text-lg font-semibold">
        Open Daily: 9:00 AM - 9:30 PM
      </p>
      <p class="text-md text-green-900/80">
        Delivery within a 5km radius or available for pickup.
      </p>
    </div>

    <!-- Search Bar -->
    <PlaceAutocomplete
      placeholder="Enter delivery address"
      onPlaceSelected={handlePlaceSelected}
    />
  </div>
</section>

<style>
  /* Optional: Add any additional custom styles here */
</style>