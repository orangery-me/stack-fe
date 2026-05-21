<script setup>
defineOptions({ name: "NotebookBackground" });

const props = defineProps({
  paperGrain: {
    type: Boolean,
    default: true, // Vân giấy hạt mịn tự nhiên
  }
});
</script>

<template>
  <div 
    class="notebook-container relative w-full overflow-hidden transition-colors duration-300"
    :class="[
      paperGrain ? 'has-grain' : ''
    ]"
  >
    <!-- Nội dung chính được render phía trên các lớp nền -->
    <div class="">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.notebook-container {
  // Phổ màu be và cam xen kẽ mềm mại theo đúng mã màu yêu cầu (#fff9f3, #fcd8cb, #fcebde), không xen kẽ màu trắng
  background: 
    radial-gradient(circle at 50% 0%, rgba(255, 249, 243, 0.4) 0%, transparent 60%),
    conic-gradient(from 90deg at 50% -10%, 
      #fff9f3 0deg, 
      #fcd8cb 20deg, 
      #fcebde 45deg, 
      #fff9f3 70deg, 
      #fcd8cb 95deg, 
      #fcebde 120deg, 
      #fff9f3 145deg, 
      #fcd8cb 165deg, 
      #fcebde 180deg
    );

  // Vân giấy hạt sần tự nhiên (Organic paper noise grain) để tăng độ premium chân thực
  &.has-grain::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    opacity: 0.038; // Hạt mịn màng, tự nhiên
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  }
}

// Tích hợp mượt mà với Dark Mode bằng CSS variables toàn cục
:global(.dark) {
  .notebook-container {
    background: 
      radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.08) 0%, transparent 70%),
      conic-gradient(from 90deg at 50% -10%, 
        #141824 0deg, 
        #1b1c30 25deg, 
        #2c2445 55deg, 
        #141824 85deg, 
        #1e1f38 115deg, 
        #27213d 145deg, 
        #141824 180deg
      );
  }
  
  .notebook-container.has-grain::before {
    opacity: 0.055; // Tăng hạt sần nhẹ ở Dark mode để tăng độ chân thực
  }
}
</style>
