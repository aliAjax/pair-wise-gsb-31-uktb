import { EXCHANGE_ACTION_FLOW, ExchangeStatus } from '@/constants/exchange';
import { ItemStatus } from '@/constants/item';
import { RingStatus } from '@/constants/ring';
import type { Exchange, ExchangeDraft } from '@/models/exchange';
import type { RingPlan } from '@/models/ringPlan';

import { itemApi } from './itemApi';
import { storage, STORAGE_KEYS } from '@/utils/storage';

const seedExchanges: Exchange[] = [
  {
    id: 'exchange_seed',
    from_user_id: 'user_me',
    to_user_id: 'user_lin',
    from_item_id: 'item_chair',
    to_item_id: 'item_camera',
    status: ExchangeStatus.PENDING,
    message: '露营椅换拍立得，可以同城当面交换。',
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    // 环形接力演示边：林小雨愿意用拍立得换陈木木的设计书
    id: 'exchange_seed_ring_b',
    from_user_id: 'user_lin',
    to_user_id: 'user_chen',
    from_item_id: 'item_camera',
    to_item_id: 'item_books',
    status: ExchangeStatus.PENDING,
    message: '拍立得带相纸，想换你的设计书。',
    created_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
  },
  {
    // 环形接力演示边：陈木木愿意用设计书换青禾的露营椅，三方因此可闭环
    id: 'exchange_seed_ring_c',
    from_user_id: 'user_chen',
    to_user_id: 'user_me',
    from_item_id: 'item_books',
    to_item_id: 'item_chair',
    status: ExchangeStatus.PENDING,
    message: '书比较重，希望换把露营椅周末带走。',
    created_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
];

export const exchangeApi = {
  async list(): Promise<Exchange[]> {
    const exchanges = await storage.get<Exchange[]>(STORAGE_KEYS.exchanges, []);
    if (exchanges.length) return exchanges;
    await storage.set(STORAGE_KEYS.exchanges, seedExchanges);
    return seedExchanges;
  },

  async create(draft: ExchangeDraft): Promise<Exchange> {
    const exchanges = await this.list();
    const targetItem = await itemApi.detail(draft.to_item_id);
    if (!targetItem || targetItem.status !== ItemStatus.AVAILABLE) {
      throw new Error('目标物品当前不可交换');
    }
    const offerItem = await itemApi.detail(draft.from_item_id);
    if (!offerItem || offerItem.status !== ItemStatus.AVAILABLE) {
      throw new Error('我的物品当前不可交换');
    }
    const lockedItemIds = await this.lockedItemIds();
    if ([draft.from_item_id, draft.to_item_id].some((id) => lockedItemIds.has(id))) {
      throw new Error('物品已被环形接力锁定，暂时不能参与其他方案');
    }
    const nextExchange: Exchange = {
      ...draft,
      id: storage.createId('exchange'),
      status: draft.status ?? ExchangeStatus.PENDING,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await storage.set(STORAGE_KEYS.exchanges, [nextExchange, ...exchanges]);
    return nextExchange;
  },

  /** 处于待确认环形方案中的物品，不允许其他交换方案同时占用 */
  async lockedItemIds(): Promise<Set<string>> {
    const plans = await storage.get<RingPlan[]>(STORAGE_KEYS.ringPlans, []);
    return new Set(
      plans
        .filter((plan) => plan.status === RingStatus.LOCKED)
        .flatMap((plan) => plan.legs.flatMap((leg) => [leg.offer_item_id, leg.want_item_id])),
    );
  },

  async transition(id: string, status: ExchangeStatus): Promise<Exchange> {
    const exchanges = await this.list();
    const current = exchanges.find((item) => item.id === id);
    if (!current) throw new Error('交换请求不存在');
    if (!EXCHANGE_ACTION_FLOW[current.status].includes(status)) {
      throw new Error('当前状态不允许该操作');
    }
    const lockedItemIds = await this.lockedItemIds();
    if (
      status !== ExchangeStatus.REJECTED &&
      [current.from_item_id, current.to_item_id].some((itemId) => lockedItemIds.has(itemId))
    ) {
      throw new Error('物品已被环形接力锁定，请等待接力方案结束');
    }
    const nextExchange: Exchange = { ...current, status, updated_at: new Date().toISOString() };
    if (status === ExchangeStatus.COMPLETED) {
      await itemApi.setStatus(current.from_item_id, ItemStatus.EXCHANGED);
      await itemApi.setStatus(current.to_item_id, ItemStatus.EXCHANGED);
    }
    await storage.set(
      STORAGE_KEYS.exchanges,
      exchanges.map((item) => (item.id === id ? nextExchange : item)),
    );
    return nextExchange;
  },
};
