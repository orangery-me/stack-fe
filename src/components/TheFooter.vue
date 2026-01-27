<script setup></script>

<template>
  <footer class="app-footer">
    <div class="container-center">
      <div class="app-footer__row">
        <div class="app-footer__brand">
          <span class="app-footer__name">Stack</span>
          <span class="app-footer__meta">Minimal product interface.</span>
        </div>

        <div class="app-footer__links">
          <a class="app-footer__link" href="#features">Features</a>
          <a class="app-footer__link" href="#">Docs</a>
          <a class="app-footer__link" href="#">Privacy</a>
        </div>
      </div>

      <div class="app-footer__bottom">
        <span class="app-footer__copyright">
          © {{ new Date().getFullYear() }} Stack
        </span>
      </div>
    </div>
  </footer>
</template>

<style scoped lang="scss">
.app-footer {
  margin-top: var(--space-48);
  padding: var(--space-32) 0;
  background: var(--ui-bg-page);
  border-top: 1px solid var(--ui-divider);
}

.app-footer__row {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
  align-items: flex-start;
  justify-content: space-between;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
}

.app-footer__brand {
  display: flex;
  align-items: baseline;
  gap: var(--space-12);
}

.app-footer__name {
  font-weight: 600;
  color: var(--ui-text);
}

.app-footer__meta {
  font-size: 12px;
  color: var(--ui-text-hint);
}

.app-footer__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-16);
}

.app-footer__link {
  font-size: 12px;
  color: var(--ui-text-muted);
  padding: var(--space-4) 0;

  &:hover {
    color: var(--ui-text);
  }
}

.app-footer__bottom {
  margin-top: var(--space-24);
  padding-top: var(--space-16);
  border-top: 1px solid var(--ui-divider);
}

.app-footer__copyright {
  font-size: 12px;
  color: var(--ui-text-hint);
}
</style>
