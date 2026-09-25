<template>
  <section class="page exchanges-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">环形接力</p>
        <h1>三方各取所需，成环后一起成交</h1>
      </div>
    </div>

    <div class="ring-tip">
      成环前每件物品都会先锁定，不能同时参与其他方案；全员确认后三件物品一起成交，任一方退出则释放全部占用。
    </div>

    <div class="stats-row">
      <span>进行中 {{ activeList.length }}</span>
      <span>已成交 {{ completedCount }}</span>
      <span>已失效 {{ failedCount }}</span>
    </div>

    <div class="segmented">
      <button :class="{ active: tab === 'active' }" type="button" @click="tab = 'active'">
        待确认
      </button>
      <button :class="{ active: tab === 'mine' }" type="button" @click="tab = 'mine'">
        与我相关
      </button>
      <button :class="{ active: tab === 'history' }" type="button" @click="tab = 'history'">
        历史记录
      </button>
    </div>

    <div v-if="visiblePlans.length" class="exchange-list">
      <RingPlanCard
        v-for="plan in visiblePlans"
        :key="plan.id"
        :plan="plan"
        :items="itemStore.items"
        :users="authStore.users"
        @confirm="confirmPlan"
        @quit="quitPlan"
      />
    </div>
    <EmptyState
      v-else
      :title="tab === 'history' ? '暂无历史接力' : '暂无进行中的环形接力'"
      :description="tab === 'history' ? PAGE_MESSAGES.ringHistoryEmpty : PAGE_MESSAGES.ringActiveEmpty"
      mark="环"
    >
      <RouterLink class="text-link" to="/home">去首页找一件他人物品</RouterLink>
    </EmptyState>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';

import EmptyState from '@/components/common/EmptyState.vue';
import RingPlanCard from '@/components/common/RingPlanCard.vue';
import { PAGE_MESSAGES } from '@/constants/messages';
import { RingStatus } from '@/constants/ring';
import { useAuthStore } from '@/stores/authStore';
import { useItemStore } from '@/stores/itemStore';
import { useRingStore } from '@/stores/ringStore';

const authStore = useAuthStore();
const itemStore = useItemStore();
const ringStore = useRingStore();
const tab = ref<'active' | 'mine' | 'history'>('active');

const activeList = computed(() => ringStore.activePlans);
const completedCount = computed(
  () => ringStore.ringPlans.filter((plan) => plan.status === RingStatus.COMPLETED).length,
);
const failedCount = computed(
  () => ringStore.ringPlans.filter((plan) => plan.status === RingStatus.FAILED).length,
);

const visiblePlans = computed(() => {
  if (tab.value === 'active') return activeList.value;
  if (tab.value === 'history') return ringStore.historyPlans;
  return authStore.currentUser
    ? ringStore.involving(authStore.currentUser.id)
    : [];
});

const confirmPlan = async (id: string) => {
  if (!authStore.currentUser) return;
  await ringStore.confirm(id, authStore.currentUser.id);
};

const quitPlan = async (id: string) => {
  if (!authStore.currentUser) return;
  await ringStore.quit(id, authStore.currentUser.id);
};
</script>
