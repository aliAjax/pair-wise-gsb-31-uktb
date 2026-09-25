import { defineStore } from 'pinia';

import { ringApi } from '@/api/ringApi';
import { RingStatus } from '@/constants/ring';
import type { RingChainLeg, RingPlan, RingPlanDraft } from '@/models/ringPlan';
import { findTripleRings, toWantEdges } from '@/utils/ringMatcher';
import { message } from '@/utils/message';

import { useExchangeStore } from './exchangeStore';
import { useItemStore } from './itemStore';

export const useRingStore = defineStore('ringPlans', {
  state: () => ({
    ringPlans: [] as RingPlan[],
    loading: false,
  }),
  getters: {
    activePlans: (state) => state.ringPlans.filter((plan) => plan.status === RingStatus.LOCKED),
    historyPlans: (state) =>
      state.ringPlans.filter(
        (plan) => plan.status === RingStatus.COMPLETED || plan.status === RingStatus.FAILED,
      ),
    involving: (state) => (userId: string) =>
      state.ringPlans.filter((plan) => plan.legs.some((leg) => leg.user_id === userId)),
    activeInvolving() {
      return (userId: string) =>
        this.activePlans.filter((plan: RingPlan) =>
          plan.legs.some((leg) => leg.user_id === userId),
        );
    },
    lockedItemIds: (state) =>
      new Set(
        state.ringPlans
          .filter((plan) => plan.status === RingStatus.LOCKED)
          .flatMap((plan) => plan.legs.flatMap((leg) => [leg.offer_item_id, leg.want_item_id])),
      ),
  },
  actions: {
    async hydrate() {
      this.loading = true;
      try {
        this.ringPlans = await ringApi.list();
      } finally {
        this.loading = false;
      }
    },
    /** 沿“想换取”关系搜索最多三方、能回到自己物品的闭合方案 */
    findRings(initiatorUserId: string, offerItemId: string, targetItemId: string): RingChainLeg[][] {
      const itemStore = useItemStore();
      const exchangeStore = useExchangeStore();
      return findTripleRings(initiatorUserId, offerItemId, targetItemId, {
        items: itemStore.items,
        edges: toWantEdges(exchangeStore.exchanges),
      });
    },
    async createRing(draft: RingPlanDraft) {
      const plan = await ringApi.create(draft);
      await this.afterChanged();
      message('三方接力已成环，物品已锁定，等待各方确认', 'success');
      return plan;
    },
    async confirm(id: string, userId: string) {
      await ringApi.confirm(id, userId);
      await this.afterChanged();
      const plan = this.ringPlans.find((entry) => entry.id === id);
      if (plan?.status === RingStatus.COMPLETED) {
        message('全员确认，三件物品一起成交', 'success');
      } else {
        message('已确认，等待其他参与方', 'success');
      }
    },
    async quit(id: string, userId: string) {
      await ringApi.quit(id, userId);
      await this.afterChanged();
      message('已退出接力，本次锁定全部释放，方案已失效', 'success');
    },
    async afterChanged() {
      const itemStore = useItemStore();
      const exchangeStore = useExchangeStore();
      await Promise.all([this.hydrate(), itemStore.hydrate(), exchangeStore.hydrate()]);
    },
  },
});
