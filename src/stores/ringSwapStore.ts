import { defineStore } from 'pinia';

import { ringSwapApi } from '@/api/ringSwapApi';
import { RingStatus } from '@/constants/ringSwap';
import type { RingSwap, RingSwapDraft } from '@/models/ringSwap';
import { message } from '@/utils/message';

export const useRingSwapStore = defineStore('ringSwaps', {
  state: () => ({
    ringSwaps: [] as RingSwap[],
    loading: false,
  }),
  getters: {
    // 与当前用户相关的接力（按更新时间倒序）
    related: (state) => (userId: string) =>
      state.ringSwaps
        .filter((ring) => ring.nodes.some((node) => node.user_id === userId))
        .slice()
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    pendingOf: (state) => (userId: string) =>
      state.ringSwaps.filter(
        (ring) => ring.status === RingStatus.PENDING && ring.nodes.some((node) => node.user_id === userId),
      ),
  },
  actions: {
    async hydrate() {
      this.loading = true;
      try {
        this.ringSwaps = await ringSwapApi.list();
      } finally {
        this.loading = false;
      }
    },
    async refresh() {
      this.ringSwaps = await ringSwapApi.list();
    },
    async create(draft: RingSwapDraft) {
      const ring = await ringSwapApi.create(draft);
      this.ringSwaps = await ringSwapApi.list();
      message('接力环已成立，三件物品已锁定，等待各方确认', 'success');
      return ring;
    },
    async confirm(id: string, userId: string) {
      const ring = await ringSwapApi.confirm(id, userId);
      this.ringSwaps = await ringSwapApi.list();
      if (ring.status === RingStatus.CONFIRMED) {
        message('三方均已确认，可以成交', 'success');
      } else {
        message('已确认，等待其他参与者', 'success');
      }
    },
    async quit(id: string, userId: string) {
      await ringSwapApi.quit(id, userId);
      this.ringSwaps = await ringSwapApi.list();
      message('已退出，本次物品占用已释放，方案标记为失效', 'success');
    },
    async complete(id: string) {
      await ringSwapApi.complete(id);
      this.ringSwaps = await ringSwapApi.list();
      message('三件物品已一起成交', 'success');
    },
  },
});
