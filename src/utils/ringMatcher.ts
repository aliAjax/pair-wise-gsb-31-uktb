import { ExchangeStatus } from '@/constants/exchange';
import { ItemStatus } from '@/constants/item';
import { RING_MAX_PARTIES } from '@/constants/ring';
import type { Exchange } from '@/models/exchange';
import type { Item } from '@/models/item';
import type { RingChainLeg } from '@/models/ringPlan';

/**
 * “想换取”关系边：user 拿出 offerItemId，想换取 wantItemId。
 * 来源于待确认（pending）的双人交换请求。
 */
export interface WantEdge {
  user_id: string;
  offer_item_id: string;
  want_item_id: string;
}

export const toWantEdges = (exchanges: Exchange[]): WantEdge[] =>
  exchanges
    .filter((exchange) => exchange.status === ExchangeStatus.PENDING)
    .map((exchange) => ({
      user_id: exchange.from_user_id,
      offer_item_id: exchange.from_item_id,
      want_item_id: exchange.to_item_id,
    }));

interface RingMatcherContext {
  items: Item[];
  edges: WantEdge[];
}

const itemOwner = (items: Item[], itemId: string) =>
  items.find((item) => item.id === itemId)?.user_id;

const isUsableItem = (item: Item | undefined, lockedItemIds: Set<string>) =>
  Boolean(
    item &&
      (item.status === ItemStatus.AVAILABLE ||
        (item.status === ItemStatus.LOCKED && lockedItemIds.has(item.id))),
  );

/**
 * 成环判断（纯函数，不读写存储）：
 * 沿“想换取”关系从发起人选中的目标物品出发，最多经过 RING_MAX_PARTIES 方，
 * 找到一条能回到发起人自己物品的闭合链路。
 *
 * 物品流向闭合条件（按 legs 顺序）：
 *   legs[i].want_item_id === legs[(i + 1) % n].offer_item_id
 * 即每一方“想换取”的物品，恰好是下一方“拿出”的物品。
 *
 * @param initiatorUserId 发起人
 * @param initiatorOfferItemId 发起人拿出的自己的物品
 * @param targetItemId 发起人选中的他人物品（希望换取的第一件物品）
 */
export const findTripleRings = (
  initiatorUserId: string,
  initiatorOfferItemId: string,
  targetItemId: string,
  context: RingMatcherContext,
): RingChainLeg[][] => {
  const { items, edges } = context;
  const rings: RingChainLeg[][] = [];
  const seenRingKeys = new Set<string>();

  const starter: RingChainLeg = {
    user_id: initiatorUserId,
    offer_item_id: initiatorOfferItemId,
    want_item_id: targetItemId,
  };

  // 第二跳：targetItemId 的所有者，必须愿意拿出 targetItemId 去换别的东西
  const secondUserEdges = edges.filter(
    (edge) =>
      edge.user_id === itemOwner(items, targetItemId) &&
      edge.offer_item_id === targetItemId &&
      edge.user_id !== initiatorUserId,
  );

  for (const secondEdge of secondUserEdges) {
    // 第三跳：第三方拿出 secondEdge.want_item_id，且想换回发起人拿出的物品
    const thirdEdges = edges.filter(
      (edge) =>
        edge.user_id === itemOwner(items, secondEdge.want_item_id) &&
        edge.offer_item_id === secondEdge.want_item_id &&
        edge.want_item_id === initiatorOfferItemId &&
        edge.user_id !== initiatorUserId &&
        edge.user_id !== secondEdge.user_id,
    );
    for (const thirdEdge of thirdEdges) {
      const candidate = [starter, { ...secondEdge }, { ...thirdEdge }];
      if (isClosedRing(candidate) && candidate.length === RING_MAX_PARTIES) {
        const key = candidate.map((leg) => leg.user_id).join('>');
        if (!seenRingKeys.has(key)) {
          seenRingKeys.add(key);
          rings.push(candidate);
        }
      }
    }
  }

  return rings;
};

/**
 * 通用闭合校验：参与方互异、每段拿出的物品归本人所有、相邻段首尾相接
 * （leg[i].want === leg[i+1].offer，末段的 want 回首段 offer）。
 * 注意：环中每件物品天然“既是上段 want、又是下段 offer”，因此不做 offer/want 去重。
 * 供成环搜索结果与建环前的二次校验共用。
 */
export const isClosedRing = (legs: RingChainLeg[], items: Item[] = []): boolean => {
  if (legs.length < 2 || legs.length > RING_MAX_PARTIES) return false;

  const userIds = new Set<string>();
  for (const leg of legs) {
    if (userIds.has(leg.user_id)) return false;
    userIds.add(leg.user_id);

    if (items.length) {
      const offerItem = items.find((item) => item.id === leg.offer_item_id);
      if (!offerItem || offerItem.user_id !== leg.user_id) return false;
    }
  }

  return legs.every(
    (leg, index) => leg.want_item_id === legs[(index + 1) % legs.length].offer_item_id,
  );
};

/**
 * 建环前的可锁定校验：三件物品当前都必须是可交换状态，
 * 不能同时处于另一个进行中的方案里。
 */
export const assertItemsLockable = (
  legs: RingChainLeg[],
  items: Item[],
  lockedItemIds: Set<string>,
): string => {
  const involvedItemIds = new Set(legs.flatMap((leg) => [leg.offer_item_id, leg.want_item_id]));
  for (const itemId of involvedItemIds) {
    const item = items.find((entry) => entry.id === itemId);
    if (!item) return '环中存在已被删除的物品';
    if (!isUsableItem(item, lockedItemIds)) return '环中物品已参与其他交换方案';
  }
  if (!isClosedRing(legs, items)) return '接力关系没有闭合';
  return '';
};
