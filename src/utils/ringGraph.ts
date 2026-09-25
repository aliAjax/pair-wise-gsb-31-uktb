import { ExchangeStatus } from '@/constants/exchange';
import type { Exchange } from '@/models/exchange';
import type { Item } from '@/models/item';

export interface WantEdge {
  from: string;
  to: string;
}

// 从双方交换请求提取「想换取」有向边：拿出 from_item，想换 to_item。
// 已拒绝的请求不再代表换意，其余状态都构成边。
export const buildWantEdges = (exchanges: Exchange[]): WantEdge[] =>
  exchanges
    .filter((exchange) => exchange.status !== ExchangeStatus.REJECTED)
    .map((exchange) => ({ from: exchange.from_item_id, to: exchange.to_item_id }));

export interface RingPath {
  // 环上物品顺序：每个节点拿出当前物品，换取下一节点的物品，末尾回到首件
  itemIds: [string, string, string];
}

interface FindRingParams {
  // 我拿出的物品（起点，也是环闭合点）
  startItemId: string;
  // 我选中的他人物品
  selectedItemId: string;
  items: Item[];
  exchanges: Exchange[];
}

const ownerOf = (items: Item[], itemId: string) => items.find((item) => item.id === itemId)?.user_id;

/**
 * 以「我拿出 startItem 想换 selectedItem」作为第一跳，
 * 沿「想换取」关系寻找最多三方的闭合环：
 * start → selected → bridge → start。
 * 三件物品必须分属三位不同用户且当前均可交换。
 */
export const findThreeWayRing = ({
  startItemId,
  selectedItemId,
  items,
  exchanges,
}: FindRingParams): RingPath | null => {
  if (!startItemId || !selectedItemId || startItemId === selectedItemId) return null;

  const edges = buildWantEdges(exchanges);
  const startOwner = ownerOf(items, startItemId);
  const selectedOwner = ownerOf(items, selectedItemId);
  if (!startOwner || !selectedOwner || startOwner === selectedOwner) return null;

  const bridge = edges.find((edge) => {
    if (edge.from !== selectedItemId) return false;
    const bridgeItem = items.find((item) => item.id === edge.to);
    if (!bridgeItem) return false;
    const bridgeOwner = bridgeItem.user_id;
    if (bridgeOwner === startOwner || bridgeOwner === selectedOwner) return false;
    const closes = edges.some((close) => close.from === edge.to && close.to === startItemId);
    return Boolean(closes);
  });

  if (!bridge) return null;
  return { itemIds: [startItemId, selectedItemId, bridge.to] };
};
