import { RingStatus } from '@/constants/ringSwap';

// 接力环上的一个节点：该用户拿出 give_item_id，沿环换取下一件物品
export interface RingNode {
  user_id: string;
  item_id: string;
  confirmed: boolean;
  confirmed_at?: string;
  quit_at?: string;
}

export interface RingSwap {
  id: string;
  // 顺序即接力方向：nodes[i] 拿出自己的 item，换取 nodes[i + 1] 的 item，末尾接回首节点
  nodes: RingNode[];
  initiator_id: string;
  status: RingStatus;
  message: string;
  created_at: string;
  updated_at: string;
  // 全员确认时间，成交与失效判定留痕
  confirmed_at?: string;
  completed_at?: string;
  expired_at?: string;
  // 退出者，用于失效历史展示
  quit_by?: string;
}

export type RingSwapDraft = Pick<RingSwap, 'nodes' | 'initiator_id' | 'message'>;
