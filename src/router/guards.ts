import type { Router } from 'vue-router';

import { ExchangeStatus } from '@/constants/exchange';
import { ItemStatus } from '@/constants/item';
import { LOG_MESSAGES } from '@/constants/messages';
import { RingStatus } from '@/constants/ring';
import { useAuthStore } from '@/stores/authStore';
import { useExchangeStore } from '@/stores/exchangeStore';
import { useItemStore } from '@/stores/itemStore';
import { useRingStore } from '@/stores/ringStore';

export const setupRouterGuards = (router: Router) => {
  router.beforeEach(async () => {
    const authStore = useAuthStore();
    const itemStore = useItemStore();
    const exchangeStore = useExchangeStore();
    const ringStore = useRingStore();
    if (!authStore.currentUser) {
      await authStore.hydrate();
    }
    if (!itemStore.items.length) {
      await itemStore.hydrate();
    }
    if (!exchangeStore.exchanges.length) {
      await exchangeStore.hydrate();
    }
    if (!ringStore.ringPlans.length) {
      await ringStore.hydrate();
    }

    const statusProbe =
      itemStore.items.some((item) => item.status === ItemStatus.AVAILABLE) ||
      itemStore.items.some((item) => item.status === ItemStatus.LOCKED);
    const exchangeProbe = exchangeStore.exchanges.some((item) => item.status === ExchangeStatus.PENDING);
    const ringProbe = ringStore.ringPlans.some((plan) => plan.status === RingStatus.LOCKED);
    if (import.meta.env.DEV && (statusProbe || exchangeProbe || ringProbe)) {
      console.debug(LOG_MESSAGES.storageHydrated);
    }
    return true;
  });
};
