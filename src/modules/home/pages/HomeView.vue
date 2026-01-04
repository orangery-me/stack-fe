<script setup>
import { useRouter } from "vue-router";
import StarfieldButton from "@/components/StarfieldButton.vue";
import StarfieldCard from "@/components/StarfieldCard.vue";
import GlowText from "@/components/GlowText.vue";

const router = useRouter();

const goToLogin = () => {
  router.push('/login');
};

const features = [
  {
    icon: "📋",
    title: "Task Management",
    description:
      "Organize and track your work with powerful task management tools. Stay on top of deadlines and priorities.",
  },
  {
    icon: "💬",
    title: "Team Chat",
    description:
      "Real-time communication with your team, just like Slack. Chat in channels, direct messages, and group conversations.",
  },
  {
    icon: "📄",
    title: "Document Collaboration",
    description: "Create, share, and collaborate on documents seamlessly. Work together in real-time with your team.",
  },
  {
    icon: "🤖",
    title: "AI Assistant",
    description: "Boost productivity with integrated AI that helps you work smarter. Get intelligent suggestions and automation.",
  },
];
</script>

<template>
  <!-- Hero Section -->
  <section class="hero-section">
    <div class="container-center">
      <div class="hero-content">
        <div class="hero-text">
          <div class="hero-badge">
            <span class="badge-dot" />
            <span>AI-Powered Workspace</span>
          </div>
          <GlowText
            level="1"
            class="hero-title"
          >
            Stack - Your
            <span class="gradient-text">AI-Powered</span>
            Workspace
          </GlowText>
          <p class="hero-description">
            Manage tasks, communicate with your team, collaborate on documents, and boost productivity with AI. 
            Everything you need to work smarter, all in one place.
          </p>
          <div class="hero-cta">
            <StarfieldButton
              variant="primary"
              size="lg"
              @click="goToLogin"
            >
              Get Started
            </StarfieldButton>
          </div>
        </div>
        <div class="hero-visual">
          <div class="cube-container">
            <div class="cube">
              <div class="cube-face cube-face-front">
                <div class="grid-pattern" />
              </div>
              <div class="cube-face cube-face-back">
                <div class="grid-pattern" />
              </div>
              <div class="cube-face cube-face-right">
                <div class="grid-pattern" />
              </div>
              <div class="cube-face cube-face-left">
                <div class="grid-pattern" />
              </div>
              <div class="cube-face cube-face-top">
                <div class="grid-pattern" />
              </div>
              <div class="cube-face cube-face-bottom">
                <div class="grid-pattern" />
              </div>
            </div>
            <div class="glow-orb glow-orb-1" />
            <div class="glow-orb glow-orb-2" />
            <div class="glow-orb glow-orb-3" />
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section
    id="features"
    class="features-section"
  >
    <div class="container-center">
      <div class="section-header">
        <GlowText :level="2">
          Everything You Need to Work Better
        </GlowText>
        <p class="section-description">
          Task management, team communication, document collaboration, and AI assistance - all in one powerful platform
        </p>
      </div>
      <div class="features-grid">
        <StarfieldCard
          v-for="(feature, index) in features"
          :key="index"
          class="feature-card"
        >
          <div class="feature-icon">
            {{ feature.icon }}
          </div>
          <h3 class="feature-title">
            {{ feature.title }}
          </h3>
          <p class="feature-description">
            {{ feature.description }}
          </p>
        </StarfieldCard>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="cta-section">
    <div class="container-center">
      <div class="cta-content">
        <GlowText
          level="2"
          class="cta-title"
        >
          Ready to Transform Your Workflow?
        </GlowText>
        <p class="cta-description">
          Join teams who are already using Stack to manage tasks, communicate better, and work smarter with AI.
        </p>
        <div class="cta-buttons">
          <StarfieldButton
            variant="primary"
            size="lg"
            @click="goToLogin"
          >
            Get Started Free
          </StarfieldButton>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
// Hero Section
.hero-section {
  padding: 6rem 0;
  min-height: 90vh;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
        circle at 30% 50%,
        rgba(184, 167, 255, 0.1) 0%,
        transparent 50%
      ),
      radial-gradient(
        circle at 70% 80%,
        rgba(184, 167, 255, 0.05) 0%,
        transparent 50%
      );
    pointer-events: none;
  }
}

.hero-content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4rem;
  align-items: center;
  position: relative;
  z-index: 1;

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 1fr;
  }
}

.hero-text {
  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(184, 167, 255, 0.1);
    border: 1px solid rgba(184, 167, 255, 0.3);
    border-radius: 2px;
    margin-bottom: 2rem;
    font-size: 0.875rem;
    color: #b8a7ff;

    .badge-dot {
      width: 8px;
      height: 8px;
      background: #b8a7ff;
      border-radius: 50%;
      box-shadow: 0 0 10px #b8a7ff;
      animation: pulse 2s infinite;
    }
  }

  .hero-title {
    margin-bottom: 1.5rem;

    .gradient-text {
      background: linear-gradient(135deg, #b8a7ff 0%, #f1f5f9 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }

  .hero-description {
    font-size: 1.25rem;
    line-height: 1.8;
    color: rgba(241, 245, 249, 0.8);
    font-weight: 300;
    margin-bottom: 2.5rem;
    max-width: 600px;
  }

  .hero-cta {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }
}

.hero-visual {
  position: relative;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 1000px;

  @media (min-width: 1024px) {
    height: 500px;
  }
}

.cube-container {
  position: relative;
  width: 300px;
  height: 300px;
  perspective: 1000px;

  @media (min-width: 1024px) {
    width: 400px;
    height: 400px;
  }
}

.cube {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  animation: rotateCube 20s infinite linear;
}

.cube-face {
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(184, 167, 255, 0.3);
  box-shadow: 0 0 40px rgba(184, 167, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cube-face-front {
  transform: rotateY(0deg) translateZ(150px);
  
  @media (min-width: 1024px) {
    transform: rotateY(0deg) translateZ(200px);
  }
}

.cube-face-back {
  transform: rotateY(180deg) translateZ(150px);
  
  @media (min-width: 1024px) {
    transform: rotateY(180deg) translateZ(200px);
  }
}

.cube-face-right {
  transform: rotateY(90deg) translateZ(150px);
  
  @media (min-width: 1024px) {
    transform: rotateY(90deg) translateZ(200px);
  }
}

.cube-face-left {
  transform: rotateY(-90deg) translateZ(150px);
  
  @media (min-width: 1024px) {
    transform: rotateY(-90deg) translateZ(200px);
  }
}

.cube-face-top {
  transform: rotateX(90deg) translateZ(150px);
  
  @media (min-width: 1024px) {
    transform: rotateX(90deg) translateZ(200px);
  }
}

.cube-face-bottom {
  transform: rotateX(-90deg) translateZ(150px);
  
  @media (min-width: 1024px) {
    transform: rotateX(-90deg) translateZ(200px);
  }
}

.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.6;
  animation: float 6s ease-in-out infinite;
  pointer-events: none;

  &.glow-orb-1 {
    width: 200px;
    height: 200px;
    background: rgba(184, 167, 255, 0.4);
    top: 10%;
    left: 10%;
    animation-delay: 0s;
  }

  &.glow-orb-2 {
    width: 150px;
    height: 150px;
    background: rgba(184, 167, 255, 0.3);
    bottom: 20%;
    right: 15%;
    animation-delay: 2s;
  }

  &.glow-orb-3 {
    width: 100px;
    height: 100px;
    background: rgba(241, 245, 249, 0.2);
    top: 50%;
    left: 50%;
    animation-delay: 4s;
  }
}

.grid-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: linear-gradient(
      rgba(184, 167, 255, 0.1) 1px,
      transparent 1px
    ),
    linear-gradient(90deg, rgba(184, 167, 255, 0.1) 1px, transparent 1px);
  background-size: 50px 50px;
  opacity: 0.3;
}

@keyframes rotateCube {
  0% {
    transform: rotateX(0deg) rotateY(0deg);
  }
  100% {
    transform: rotateX(360deg) rotateY(360deg);
  }
}

// Features Section
.features-section {
  padding: 6rem 0;
  position: relative;
}

.section-header {
  text-align: center;
  margin-bottom: 4rem;

  .section-description {
    font-size: 1.125rem;
    color: rgba(241, 245, 249, 0.7);
    font-weight: 300;
    margin-top: 1rem;
  }
}

.features-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
}

.feature-card {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;

  .feature-icon {
    font-size: 3rem;
    margin-bottom: 1.5rem;
    filter: drop-shadow(0 0 10px rgba(184, 167, 255, 0.5));
  }

  .feature-title {
    font-family: "JetBrains Mono", monospace;
    font-weight: 600;
    font-size: 1.25rem;
    color: #f1f5f9;
    margin-bottom: 1rem;
    letter-spacing: 0.05em;
  }

  .feature-description {
    color: rgba(241, 245, 249, 0.7);
    font-weight: 300;
    line-height: 1.6;
  }
}

// CTA Section
.cta-section {
  padding: 8rem 0;
  position: relative;
  background: linear-gradient(
    135deg,
    rgba(184, 167, 255, 0.1) 0%,
    rgba(184, 167, 255, 0.05) 100%
  );
  border-top: 1px solid rgba(184, 167, 255, 0.2);
  border-bottom: 1px solid rgba(184, 167, 255, 0.2);

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #b8a7ff, transparent);
    opacity: 0.5;
  }
}

.cta-content {
  text-align: center;
  max-width: 800px;
  margin: 0 auto;

  .cta-title {
    margin-bottom: 1.5rem;
  }

  .cta-description {
    font-size: 1.25rem;
    color: rgba(241, 245, 249, 0.8);
    font-weight: 300;
    margin-bottom: 2.5rem;
    line-height: 1.8;
  }

  .cta-buttons {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 1rem;
  }
}

// Animations
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) translateX(0);
  }
  33% {
    transform: translateY(-20px) translateX(10px);
  }
  66% {
    transform: translateY(10px) translateX(-10px);
  }
}
</style>
