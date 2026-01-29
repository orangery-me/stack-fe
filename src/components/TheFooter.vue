<script setup></script>

<template>
  <footer class="app-footer">
    <div class="container-center">
      <div class="app-footer__top">
        <div class="app-footer__brand">
          <img
            class="app-footer__logo"
            src="/logos/stack-logo.jpg"
            alt="Stack"
          >
          <div class="app-footer__brandText">
            <div class="app-footer__name">
              Stack
            </div>
            <div class="app-footer__meta">
              Minimal product interface.
            </div>
          </div>
        </div>

        <div class="app-footer__cols">
          <div class="app-footer__col">
            <div class="app-footer__colTitle">
              Product
            </div>
            <router-link
              class="app-footer__link"
              :to="{ name: 'home', hash: '#features' }"
            >
              Features
            </router-link>
            <router-link
              class="app-footer__link"
              :to="{ name: 'home', hash: '#savings' }"
            >
              Savings
            </router-link>
            <router-link
              class="app-footer__link"
              :to="{ name: 'home', hash: '#integrations' }"
            >
              Integrations
            </router-link>
          </div>

          <div class="app-footer__col">
            <div class="app-footer__colTitle">
              Resources
            </div>
            <a
              class="app-footer__link"
              href="#"
            >Docs</a>
            <a
              class="app-footer__link"
              href="#"
            >Changelog</a>
            <a
              class="app-footer__link"
              href="#"
            >Support</a>
          </div>

          <div class="app-footer__col">
            <div class="app-footer__colTitle">
              Company
            </div>
            <a
              class="app-footer__link"
              href="#"
            >Privacy</a>
            <a
              class="app-footer__link"
              href="#"
            >Terms</a>
            <a
              class="app-footer__link"
              href="#"
            >Contact</a>
          </div>
        </div>
      </div>

      <div class="app-footer__bottom">
        <span class="app-footer__copyright">
          © {{ new Date().getFullYear() }} Stack
        </span>
        <span class="app-footer__bottomLinks">
          <router-link
            class="app-footer__link app-footer__link--inline"
            :to="{ name: 'register' }"
          >
            Create account
          </router-link>
          <router-link
            class="app-footer__link app-footer__link--inline"
            :to="{ name: 'login' }"
          >
            Sign in
          </router-link>
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

.app-footer__top {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-24);

  @media (min-width: 768px) {
    grid-template-columns: 1.2fr 1.8fr;
    align-items: start;
  }
}

.app-footer__brand {
  display: flex;
  align-items: center;
  gap: var(--space-12);
}

.app-footer__logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  object-fit: contain;
}

.app-footer__brandText {
  display: grid;
  gap: 2px;
}

.app-footer__name {
  font-weight: 600;
  color: var(--ui-text);
}

.app-footer__meta {
  font-size: 12px;
  color: var(--ui-text-hint);
}

.app-footer__cols {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-24);

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.app-footer__col {
  display: grid;
  gap: var(--space-8);
  align-content: start;
}

.app-footer__colTitle {
  font-size: 12px;
  font-weight: 600;
  color: var(--ui-text);
  margin-bottom: var(--space-4);
}

.app-footer__link {
  font-size: 12px;
  color: var(--ui-text-muted);
  padding: var(--space-4) 0;
  width: fit-content;

  &:hover {
    color: var(--ui-text);
  }
}

.app-footer__link--inline {
  padding: 0;
}

.app-footer__bottom {
  margin-top: var(--space-24);
  padding-top: var(--space-16);
  border-top: 1px solid var(--ui-divider);
  display: flex;
  flex-direction: column;
  gap: var(--space-8);

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.app-footer__copyright {
  font-size: 12px;
  color: var(--ui-text-hint);
}

.app-footer__bottomLinks {
  display: inline-flex;
  align-items: center;
  gap: var(--space-16);
}
</style>
