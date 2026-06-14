<script setup>
import { ref } from 'vue';
import NotebookBackground from '@/components/calm/NotebookBackground.vue';
import CalmButton from '@/components/calm/CalmButton.vue';
import CalmHeading from '@/components/calm/CalmHeading.vue';
import CalmCard from '@/components/calm/CalmCard.vue';

defineOptions({ name: "NotebookDemoView" });

// Trạng thái cấu hình của background
const variant = ref('none');
const spacing = ref(24);
const showMargin = ref(false);
const paperGrain = ref(true);

// Trạng thái demo nội dung ghi chép - Tôn vinh hệ màu mới
const currentText = ref(
  "✍️ BÁO CÁO THỰC THI DESIGN SYSTEM:\n\n" +
  "✨ Hệ màu Warm Productivity mới đã được áp dụng thành công!\n" +
  "• Nền trang kem ấm (#F8F6F3) giúp mắt thư giãn tối đa.\n" +
  "• Sắc cam thương hiệu (#E95C47) kích thích năng lượng tập trung.\n" +
  "• Tỷ lệ phân bổ vàng 70 - 20 - 10 tạo nhịp điệu thị giác hoàn hảo.\n\n" +
  "🌿 Hoàn thành mục tiêu: Tạo giao diện tự nhiên và cao cấp nhất.\n" +
  "✨ Trải nghiệm nền gradient đào mịn màng với hiệu ứng thớ hạt sần tự nhiên!"
);

// Trạng thái Dark mode
const isDarkMode = ref(document.documentElement.classList.contains('dark'));
const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};
</script>

<template>
  <NotebookBackground
    :paperGrain="paperGrain"
  >
    <div class="demo-wrapper">
      <div class="container-center demo-content flex flex-col gap-10">
        
        <!-- HEADER TRANG DEMO -->
        <header class="demo-header text-center max-w-2xl mx-auto flex flex-col gap-3">
          <span class="brand-badge self-center px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-[var(--primary-100)] text-[var(--primary-500)]">
            Warm Productivity UI
          </span>
          <CalmHeading :level="1" class="demo-main-title font-serif">
            Showroom Trực Quan Hệ Màu Mới
          </CalmHeading>
          <p class="ui-muted text-base">
            Khám phá sự kết hợp hoàn hảo của nền gradient đào mịn màng theo tỷ lệ phối màu vàng 70-20-10 chống mỏi mắt và hiệu ứng thớ hạt sần tự nhiên.
          </p>
        </header>

        <!-- NỘI DUNG CHÍNH -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <!-- BÊN TRÁI: Trang giấy viết Demo chân thực -->
          <div class="lg:col-span-8 flex flex-col gap-6">
            <div class="notebook-sheet-preview relative rounded-2xl border border-[var(--ui-border)] overflow-hidden shadow-md p-8 sm:p-10 bg-[var(--ui-bg-surface)]">
              <!-- Header trang ghi chú -->
              <div class="sheet-title-area mb-6">
                <div class="flex justify-between items-start gap-4">
                  <div>
                    <CalmHeading :level="2" class="sheet-title font-serif italic text-2xl">
                      Nhật ký thiết kế
                    </CalmHeading>
                    <div class="sheet-date text-xs font-mono opacity-50 uppercase tracking-widest mt-1">
                      Thứ năm, ngày 21 tháng 5 năm 2026
                    </div>
                  </div>
                  <span class="status-badge flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#DDE6D3] text-[#4f5c3f]">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#E95C47] animate-pulse"></span>
                    Đang hoạt động
                  </span>
                </div>
              </div>

              <!-- Vùng viết chữ mô phỏng sạch sẽ -->
              <textarea 
                v-model="currentText"
                class="handwritten-textarea w-full h-[360px] bg-transparent border-none outline-none resize-none text-lg font-serif"
                placeholder="Bắt đầu viết ghi chú tự nhiên tại đây..."
              ></textarea>

              <!-- Họa tiết lượn sóng trang trí mộc mạc bên góc phải -->
              <div class="absolute bottom-4 right-4 pointer-events-none opacity-40 text-xs font-serif italic">
                🌿 Calm & Focus
              </div>
            </div>

            <!-- BẢNG TRỰC QUAN MÀU SẮC (70 - 20 - 10) -->
            <div class="color-showcase-panel rounded-2xl border border-[var(--ui-border)] p-6 bg-[var(--ui-bg-surface)] flex flex-col gap-4">
              <CalmHeading :level="3" class="font-serif text-lg">
                💡 Bản Đồ Màu Sắc Đang Áp Dụng (70 - 20 - 10)
              </CalmHeading>
              
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <!-- 70% Neutral -->
                <div class="color-role-card p-4 rounded-xl border bg-[var(--ui-bg-page)] flex flex-col gap-3">
                  <div class="flex justify-between items-center">
                    <span class="text-xs font-bold uppercase text-[var(--ui-text-muted)]">70% Neutral</span>
                    <span class="text-xs px-2 py-0.5 rounded bg-[var(--ui-border)] font-mono">Kem & Nâu</span>
                  </div>
                  <div class="flex gap-1">
                    <div class="w-8 h-8 rounded-full border bg-[#F8F6F3]" title="Main Background"></div>
                    <div class="w-8 h-8 rounded-full border bg-[#FFFDFB]" title="Card Background"></div>
                    <div class="w-8 h-8 rounded-full border bg-[#E7E1DB]" title="Border Subtle"></div>
                    <div class="w-8 h-8 rounded-full border bg-[#1F1A17]" title="Text Primary"></div>
                  </div>
                  <p class="text-xs opacity-75">Tạo không gian trống tĩnh lặng, giảm bão hòa màu giúp mắt thư giãn tối đa.</p>
                </div>

                <!-- 20% Brand Orange -->
                <div class="color-role-card p-4 rounded-xl border bg-[var(--ui-bg-page)] flex flex-col gap-3">
                  <div class="flex justify-between items-center">
                    <span class="text-xs font-bold uppercase text-[var(--ui-text-muted)]">20% Brand</span>
                    <span class="text-xs px-2 py-0.5 rounded bg-[var(--primary-100)] text-[var(--primary-500)] font-mono">Cam ấm</span>
                  </div>
                  <div class="flex gap-1">
                    <div class="w-8 h-8 rounded-full bg-[#E95C47]" title="Brand Orange"></div>
                    <div class="w-8 h-8 rounded-full bg-[#D94B35]" title="CTA Hover"></div>
                    <div class="w-8 h-8 rounded-full bg-[#F6DDD5]" title="Soft Peach"></div>
                  </div>
                  <p class="text-xs opacity-75">Sử dụng cho nút kêu gọi hành động (CTA), logo và các tương tác cốt lõi.</p>
                </div>

                <!-- 10% Accents -->
                <div class="color-role-card p-4 rounded-xl border bg-[var(--ui-bg-page)] flex flex-col gap-3">
                  <div class="flex justify-between items-center">
                    <span class="text-xs font-bold uppercase text-[var(--ui-text-muted)]">10% Accent</span>
                    <span class="text-xs px-2 py-0.5 rounded bg-[#DDE6D3] text-[#4f5c3f] font-mono">Điểm trang trí</span>
                  </div>
                  <div class="flex gap-1">
                    <div class="w-8 h-8 rounded-full bg-[#DDE6D3]" title="Soft Green Wave"></div>
                    <div class="w-8 h-8 rounded-full bg-[#F3B736]" title="Yellow Spark"></div>
                  </div>
                  <p class="text-xs opacity-75">Sử dụng tiết chế làm họa tiết trang trí hoặc biểu tượng trạng thái tinh tế.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- BÊN PHẢI: Bảng điều khiển tích hợp màu sắc thương hiệu -->
          <div class="lg:col-span-4 flex flex-col gap-6">
            <CalmCard padding="md" class="control-panel flex flex-col gap-6 backdrop-blur-md bg-opacity-90">
              <div class="flex justify-between items-center border-b pb-3">
                <CalmHeading :level="3" class="panel-title font-serif text-lg">
                  Bộ Điều Chỉnh
                </CalmHeading>
                <!-- Nút đổi chế độ sáng/tối -->
                <button 
                  @click="toggleDarkMode"
                  class="dark-toggle-btn p-2 rounded-lg border border-[var(--ui-border)] hover:bg-[var(--ui-bg-page)] text-sm transition-colors duration-200"
                  :title="isDarkMode ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'"
                >
                  {{ isDarkMode ? '🌙' : '☀️' }}
                </button>
              </div>

              <!-- Tùy chọn Tắt/Bật Hiệu Ứng Nền -->
              <div class="control-group flex flex-col gap-3">
                <label class="block text-xs font-bold uppercase tracking-wider text-[var(--ui-text-muted)] mb-2">
                  Tùy chọn nền cao cấp
                </label>

                <!-- Toggle thớ vân giấy sần -->
                <label class="flex items-center gap-3 cursor-pointer text-sm">
                  <input type="checkbox" v-model="paperGrain" class="checkbox-custom" />
                  <span class="text-[var(--ui-text)]">Vân thớ giấy tự nhiên (Noise)</span>
                </label>
              </div>

              <!-- Showcase nút bấm tương thích Palette màu cam ấm -->
              <div class="control-group border-t border-[var(--ui-border)] pt-4 flex flex-col gap-3">
                <label class="block text-xs font-bold uppercase tracking-wider text-[var(--ui-text-muted)]">
                  Mẫu Thử Linh Kiện (UI Palette)
                </label>
                
                <CalmButton variant="primary" class="w-full justify-center">
                  Nút chính màu cam thương hiệu
                </CalmButton>

                <div class="flex gap-2">
                  <CalmButton variant="secondary" class="flex-1 justify-center bg-[var(--primary-100)] text-[var(--primary-500)] border-none hover:bg-[var(--primary-200)]">
                    Nút phụ đào nhẹ
                  </CalmButton>
                  <button class="px-4 py-2 rounded-lg text-xs font-bold bg-[#DDE6D3] text-[#4f5c3f] border border-transparent hover:border-[#4f5c3f] transition-all">
                    🌿 Accent
                  </button>
                </div>
              </div>

            </CalmCard>
          </div>

        </div>
      </div>
    </div>
  </NotebookBackground>
</template>

<style scoped lang="scss">
.demo-wrapper {
  padding: var(--space-48) 0;
  min-height: 100vh;
}

.brand-badge {
  box-shadow: 0 2px 8px rgba(233, 92, 71, 0.08);
}

.sheet-title {
  font-family: Georgia, serif;
  color: var(--ui-text);
  margin-bottom: 2px;
}

.handwritten-textarea {
  font-family: "Courier New", Courier, Georgia, serif;
  color: #2e2824; /* Tông màu mực nâu đen tự nhiên đồng bộ */
  line-height: normal;
  border: none !important;
  box-shadow: none !important;
  
  &:focus {
    outline: none !important;
  }
}

.control-panel {
  border: 1px solid var(--ui-border);
  background: var(--ui-bg-surface);
  box-shadow: var(--ui-shadow-modal);
  border-radius: var(--ui-radius-modal);
}

.btn-tab {
  flex: 1;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: calc(var(--ui-radius-button) + 2px);
  border: none;
  background: transparent;
  color: var(--ui-text-muted);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: var(--ui-text);
  }

  &.active {
    background: var(--ui-bg-surface);
    color: var(--primary-500);
    box-shadow: 0 2px 6px rgba(31, 26, 23, 0.04);
  }
}

.checkbox-custom {
  width: 16px;
  height: 16px;
  accent-color: var(--primary-500);
  cursor: pointer;
}

.color-role-card {
  border: 1px solid var(--ui-border);
}

// Chỉnh sửa màu sắc chữ textarea trong Dark mode
:global(.dark) {
  .handwritten-textarea {
    color: #e2e8f0;
  }
}
</style>
