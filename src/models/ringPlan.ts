import { RingStatus } from '@/constants/ring';

/**
 * 环中的一段接力（成环判断阶段的纯数据）：
 * user 拿出 offer_item_id，换取 want_item_id。
 */
export interface RingChainLeg {
  user_id: string;
  offer_item_id: string;
  want_item_id: string;
}

/**
 * 环中的一段接力：user 拿出 offer_item_id，换取 want_item_id。
 * 环闭合时，下一段的 offer_item_id 必须等于本段的 want_item_id。
 */
export interface RingLeg extends RingChainLeg {
  /** 该参与方是否已确认；发起人同样需要确认 */
  confirmed: boolean;
  confirmed_at?: string;
  /** 退出方 user_id，仅失效方案保留历史时使用 */
  quit_by?: string;
}

export interface RingPlan {
  id: string;
  /** 发起方，即选中他人物品、沿想换取关系成环的用户 */
  initiator_user_id: string;
  /** 有序接力段，长度为 RING_MAX_PARTIES（3） */
  legs: RingLeg[];
  status: RingStatus;
  message: string;
  created_at: string;
  updated_at: string;
  /** 全员成交时间 */
  completed_at?: string;
  /** 失效原因（某方退出） */
  failed_reason?: string;
}

export type RingPlanDraft = Pick<RingPlan, 'initiator_user_id' | 'message'> & {
  legs: RingChainLeg[];
};
