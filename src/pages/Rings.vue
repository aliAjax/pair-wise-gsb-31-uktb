<template>
  <section class="page rings-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">环形接力</p>
        <h1>三方各取所需，一起成交</h1>
      </div>
      <RouterLink class="primary-link" to="/ring/create">发起接力</RouterLink>
    </div>

    <div class="stats-row">
      <span>待确认 {{ stats.pending }}</span>
      <span>全员已确认 {{ stats.confirmed }}</span>
      <span>已成交 {{ stats.completed }}</span>
      <span>已失效 {{ stats.expired }}</span>
    </div>

    <div v-if="rings.length" class="exchange-list">
      <RingSwapCard
        v-for="ring in rings"
        :key="ring.id"
        :ring="ring"
        :items="itemStore.items"
        :users="authStore.users"
        :focused="ring.id === focusId"
        @confirm="confirmRing"
        @quit="quitRing"
        @complete="completeRing"
      />
    </div>
    <EmptyState v-else title="暂无接力方案" :description="PAGE_MESSAGES.ringEmpty" mark="环" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import EmptyState from '@/components/common/EmptyState.vue';
import RingSwapCard from '@/components/common/RingSwapCard.vue';
import { RingStatus } from '@/constants/ringSwap';
import { PAGE_MESSAGES } from '@/constants/messages';
import { useAuthStore } from '@/stores/authStore';
import { useItemStore } from '@/stores/itemStore';
import { useRingSwapStore } from '@/stores/ringSwapStore';

const route = useRoute();
const authStore = useAuthStore();
const itemStore = useItemStore();
const ringSwapStore = useRingSwapStore();

const focusId = typeof route.query.focus === 'string' ? route.query.focus : '';

const rings = computed(() =>
  authStore.currentUser ? ringSwapStore.related(authStore.currentUser.id) : [],
);

const stats = computed(() => ({
  pending: rings.value.filter((ring) => ring.status === RingStatus.PENDING).length,
  confirmed: rings.value.filter((ring) => ring.status === RingStatus.CONFIRMED).length,
  completed: rings.value.filter((ring) => ring.status === RingStatus.COMPLETED).length,
  expired: rings.value.filter((ring) => ring.status === RingStatus.EXPIRED).length,
}));

const confirmRing = async (id: string) => {
  if (!authStore.currentUser) return;
  await ringSwapStore.confirm(id, authStore.currentUser.id);
  await itemStore.hydrate();
};

const quitRing = async (id: string) => {
  if (!authStore.currentUser) return;
  await ringSwapStore.quit(id, authStore.currentUser.id);
  await itemStore.hydrate();
};

const completeRing = async (id: string) => {
  await ringSwapStore.complete(id);
  await itemStore.hydrate();
};
</script>
