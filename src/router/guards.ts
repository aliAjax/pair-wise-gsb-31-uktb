import type { Router } from 'vue-router';

import { ExchangeStatus } from '@/constants/exchange';
import { ItemStatus } from '@/constants/item';
import { RingStatus } from '@/constants/ringSwap';
import { LOG_MESSAGES } from '@/constants/messages';
import { useAuthStore } from '@/stores/authStore';
import { useExchangeStore } from '@/stores/exchangeStore';
import { useItemStore } from '@/stores/itemStore';
import { useRingSwapStore } from '@/stores/ringSwapStore';

export const setupRouterGuards = (router: Router) => {
  router.beforeEach(async () => {
    const authStore = useAuthStore();
    const itemStore = useItemStore();
    const exchangeStore = useExchangeStore();
    const ringSwapStore = useRingSwapStore();
    if (!authStore.currentUser) {
      await authStore.hydrate();
    }
    if (!itemStore.items.length) {
      await itemStore.hydrate();
    }
    if (!exchangeStore.exchanges.length) {
      await exchangeStore.hydrate();
    }
    if (!ringSwapStore.ringSwaps.length) {
      await ringSwapStore.hydrate();
    }

    const statusProbe = itemStore.items.some(
      (item) => item.status === ItemStatus.AVAILABLE || item.status === ItemStatus.LOCKED,
    );
    const exchangeProbe = exchangeStore.exchanges.some((item) => item.status === ExchangeStatus.PENDING);
    const ringProbe = ringSwapStore.ringSwaps.some(
      (ring) => ring.status === RingStatus.PENDING || ring.status === RingStatus.CONFIRMED,
    );
    if (import.meta.env.DEV && (statusProbe || exchangeProbe || ringProbe)) {
      console.debug(LOG_MESSAGES.storageHydrated);
    }
    return true;
  });
};
