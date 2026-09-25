import { RingStatus } from '@/constants/ringSwap';
import { ItemStatus } from '@/constants/item';
import type { RingNode, RingSwap, RingSwapDraft } from '@/models/ringSwap';

import { itemApi } from './itemApi';
import { storage, STORAGE_KEYS } from '@/utils/storage';

// 成环后第一件被锁定的物品必须同时满足：未交换、未下架、未被其它方案占用
const assertItemsFree = async (itemIds: string[]) => {
  for (const itemId of itemIds) {
    const item = await itemApi.detail(itemId);
    if (!item) throw new Error('环上物品不存在，方案无法成立');
    if (item.status === ItemStatus.LOCKED) {
      throw new Error(`「${item.title}」已被其它接力方案锁定`);
    }
    if (item.status !== ItemStatus.AVAILABLE) {
      throw new Error(`「${item.title}」当前不可交换`);
    }
  }
};

const buildNodes = async (draft: RingSwapDraft): Promise<RingNode[]> =>
  draft.nodes.map((node) => {
    if (node.user_id !== draft.initiator_id) {
      return { user_id: node.user_id, item_id: node.item_id, confirmed: false };
    }
    return {
      user_id: node.user_id,
      item_id: node.item_id,
      confirmed: true,
      confirmed_at: new Date().toISOString(),
    };
  });

export const ringSwapApi = {
  async list(): Promise<RingSwap[]> {
    return storage.get<RingSwap[]>(STORAGE_KEYS.ringSwaps, []);
  },

  async detail(id: string): Promise<RingSwap | undefined> {
    const rings = await this.list();
    return rings.find((ring) => ring.id === id);
  },

  async create(draft: RingSwapDraft): Promise<RingSwap> {
    const rings = await this.list();
    const itemIds = draft.nodes.map((node) => node.item_id);
    if (new Set(itemIds).size !== 3 || new Set(draft.nodes.map((node) => node.user_id)).size !== 3) {
      throw new Error('接力环必须由三方各一件物品组成');
    }
    await assertItemsFree(itemIds);

    const timestamp = new Date().toISOString();
    const ring: RingSwap = {
      id: storage.createId('ring'),
      nodes: await buildNodes(draft),
      initiator_id: draft.initiator_id,
      status: RingStatus.PENDING,
      message: draft.message,
      created_at: timestamp,
      updated_at: timestamp,
    };

    // 成环前先锁定全部物品，任何一件都不能再参与另一方案
    for (const itemId of itemIds) {
      await itemApi.setStatus(itemId, ItemStatus.LOCKED);
    }
    await storage.set(STORAGE_KEYS.ringSwaps, [ring, ...rings]);
    return ring;
  },

  async confirm(id: string, userId: string): Promise<RingSwap> {
    const rings = await this.list();
    const current = rings.find((ring) => ring.id === id);
    if (!current) throw new Error('接力方案不存在');
    if (current.status !== RingStatus.PENDING) throw new Error('该方案当前不能确认');

    const node = current.nodes.find((entry) => entry.user_id === userId);
    if (!node) throw new Error('你不在这次接力中');

    const timestamp = new Date().toISOString();
    const nodes = current.nodes.map((entry) =>
      entry.user_id === userId ? { ...entry, confirmed: true, confirmed_at: timestamp } : entry,
    );
    const allConfirmed = nodes.every((entry) => entry.confirmed);
    const next: RingSwap = {
      ...current,
      nodes,
      status: allConfirmed ? RingStatus.CONFIRMED : RingStatus.PENDING,
      confirmed_at: allConfirmed ? timestamp : current.confirmed_at,
      updated_at: timestamp,
    };
    await storage.set(
      STORAGE_KEYS.ringSwaps,
      rings.map((ring) => (ring.id === id ? next : ring)),
    );
    return next;
  },

  // 任意参与者退出：释放本次占用，方案转为失效但保留历史
  async quit(id: string, userId: string): Promise<RingSwap> {
    const rings = await this.list();
    const current = rings.find((ring) => ring.id === id);
    if (!current) throw new Error('接力方案不存在');
    if (current.status === RingStatus.COMPLETED || current.status === RingStatus.EXPIRED) {
      throw new Error('该方案已结束，不能退出');
    }

    const timestamp = new Date().toISOString();
    for (const node of current.nodes) {
      const item = await itemApi.detail(node.item_id);
      if (item && item.status === ItemStatus.LOCKED) {
        await itemApi.setStatus(node.item_id, ItemStatus.AVAILABLE);
      }
    }
    const nodes = current.nodes.map((entry) =>
      entry.user_id === userId ? { ...entry, confirmed: false, quit_at: timestamp } : entry,
    );
    const next: RingSwap = {
      ...current,
      nodes,
      status: RingStatus.EXPIRED,
      expired_at: timestamp,
      quit_by: userId,
      updated_at: timestamp,
    };
    await storage.set(
      STORAGE_KEYS.ringSwaps,
      rings.map((ring) => (ring.id === id ? next : ring)),
    );
    return next;
  },

  // 全员确认后三件物品一起成交
  async complete(id: string): Promise<RingSwap> {
    const rings = await this.list();
    const current = rings.find((ring) => ring.id === id);
    if (!current) throw new Error('接力方案不存在');
    if (current.status !== RingStatus.CONFIRMED) throw new Error('需三方全部确认后才能成交');

    const timestamp = new Date().toISOString();
    for (const node of current.nodes) {
      await itemApi.setStatus(node.item_id, ItemStatus.EXCHANGED);
    }
    const next: RingSwap = {
      ...current,
      status: RingStatus.COMPLETED,
      completed_at: timestamp,
      updated_at: timestamp,
    };
    await storage.set(
      STORAGE_KEYS.ringSwaps,
      rings.map((ring) => (ring.id === id ? next : ring)),
    );
    return next;
  },
};
