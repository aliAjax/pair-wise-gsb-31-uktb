import { ExchangeStatus } from '@/constants/exchange';
import { ItemStatus } from '@/constants/item';
import { RING_ACTION_FLOW, RingStatus } from '@/constants/ring';
import type { Exchange } from '@/models/exchange';
import type { RingChainLeg, RingPlan, RingPlanDraft } from '@/models/ringPlan';
import { assertItemsLockable, isClosedRing } from '@/utils/ringMatcher';
import { storage, STORAGE_KEYS } from '@/utils/storage';

import { exchangeApi } from './exchangeApi';
import { itemApi } from './itemApi';

const ringItemIds = (legs: RingChainLeg[]) =>
  Array.from(new Set(legs.flatMap((leg) => [leg.offer_item_id, leg.want_item_id])));

export const ringApi = {
  async list(): Promise<RingPlan[]> {
    return storage.get<RingPlan[]>(STORAGE_KEYS.ringPlans, []);
  },

  async detail(id: string): Promise<RingPlan | undefined> {
    const plans = await this.list();
    return plans.find((plan) => plan.id === id);
  },

  /** 成环前先锁定：校验闭合关系与占用情况，三件物品一起置为 LOCKED */
  async create(draft: RingPlanDraft): Promise<RingPlan> {
    const plans = await this.list();
    if (plans.some((plan) => plan.status === RingStatus.LOCKED)) {
      throw new Error('已有进行中的环形接力，等待其成交或退出后再发起');
    }
    const items = await itemApi.list();

    // 建环时尚无“本方案自己的锁定”，任何 LOCKED/非可交换物品都视为被占用
    const lockError = assertItemsLockable(draft.legs, items, new Set());
    if (lockError) throw new Error(lockError);

    const timestamp = new Date().toISOString();
    const plan: RingPlan = {
      id: storage.createId('ring'),
      initiator_user_id: draft.initiator_user_id,
      legs: draft.legs.map((leg) => ({ ...leg, confirmed: false })),
      status: RingStatus.LOCKED,
      message: draft.message,
      created_at: timestamp,
      updated_at: timestamp,
    };

    for (const itemId of ringItemIds(plan.legs)) {
      await itemApi.setStatus(itemId, ItemStatus.LOCKED);
    }
    await storage.set(STORAGE_KEYS.ringPlans, [plan, ...plans]);
    return plan;
  },

  /** 参与方确认；全员确认后三件物品一起成交 */
  async confirm(id: string, userId: string): Promise<RingPlan> {
    const plans = await this.list();
    const plan = plans.find((entry) => entry.id === id);
    if (!plan) throw new Error('接力方案不存在');
    if (plan.status !== RingStatus.LOCKED) throw new Error('方案已结束，不能再确认');
    const leg = plan.legs.find((entry) => entry.user_id === userId);
    if (!leg) throw new Error('你不是本方案的参与方');
    if (leg.confirmed) return plan;

    leg.confirmed = true;
    leg.confirmed_at = new Date().toISOString();
    plan.updated_at = new Date().toISOString();

    if (plan.legs.every((entry) => entry.confirmed)) {
      await this.settle(plan);
    }

    await storage.set(
      STORAGE_KEYS.ringPlans,
      plans.map((entry) => (entry.id === id ? plan : entry)),
    );
    return plan;
  },

  /** 某方退出：释放本次占用，方案转失效，历史保留 */
  async quit(id: string, userId: string): Promise<RingPlan> {
    const plans = await this.list();
    const plan = plans.find((entry) => entry.id === id);
    if (!plan) throw new Error('接力方案不存在');
    if (!RING_ACTION_FLOW[plan.status].includes(RingStatus.FAILED)) {
      throw new Error('方案已结束，不能退出');
    }
    if (!plan.legs.some((leg) => leg.user_id === userId)) {
      throw new Error('你不是本方案的参与方');
    }

    const items = await itemApi.list();
    for (const itemId of ringItemIds(plan.legs)) {
      const item = items.find((entry) => entry.id === itemId);
      if (item?.status === ItemStatus.LOCKED) {
        await itemApi.setStatus(itemId, ItemStatus.AVAILABLE);
      }
    }

    plan.status = RingStatus.FAILED;
    plan.failed_reason = 'ring-quit';
    plan.legs = plan.legs.map((leg) =>
      leg.user_id === userId ? { ...leg, quit_by: userId, confirmed: false } : leg,
    );
    plan.updated_at = new Date().toISOString();

    await storage.set(
      STORAGE_KEYS.ringPlans,
      plans.map((entry) => (entry.id === id ? plan : entry)),
    );
    return plan;
  },

  /** 全员确认后的成交：三件物品一起置为已交换，并闭环对应双人请求 */
  async settle(plan: RingPlan): Promise<void> {
    if (!isClosedRing(plan.legs)) throw new Error('接力关系没有闭合');

    const exchanges = await exchangeApi.list();
    const matched = new Set<string>();

    // 环内每一段“拿出→想换取”对应一条待确认双人请求，成交时一并闭环
    for (const leg of plan.legs) {
      const exchange = exchanges.find(
        (entry) =>
          entry.status === ExchangeStatus.PENDING &&
          entry.from_user_id === leg.user_id &&
          entry.from_item_id === leg.offer_item_id &&
          entry.to_item_id === leg.want_item_id,
      );
      if (exchange) matched.add(exchange.id);
    }

    const timestamp = new Date().toISOString();
    const nextExchanges: Exchange[] = exchanges.map((exchange) =>
      matched.has(exchange.id)
        ? { ...exchange, status: ExchangeStatus.COMPLETED, updated_at: timestamp }
        : exchange,
    );
    await storage.set(STORAGE_KEYS.exchanges, nextExchanges);

    for (const itemId of ringItemIds(plan.legs)) {
      await itemApi.setStatus(itemId, ItemStatus.EXCHANGED);
    }

    plan.status = RingStatus.COMPLETED;
    plan.completed_at = timestamp;
    plan.updated_at = timestamp;
  },
};
