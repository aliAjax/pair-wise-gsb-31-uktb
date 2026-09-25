export enum RingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

export const RING_PARTICIPANT_COUNT = 3;

export const RING_STATUS_OPTIONS = [
  { label: '待确认', value: RingStatus.PENDING },
  { label: '全员已确认', value: RingStatus.CONFIRMED },
  { label: '已成交', value: RingStatus.COMPLETED },
  { label: '已失效', value: RingStatus.EXPIRED },
];

// 环形接力状态机：全员确认后才允许成交；任何阶段退出都进入失效并保留历史
export const RING_ACTION_FLOW: Record<RingStatus, RingStatus[]> = {
  [RingStatus.PENDING]: [RingStatus.CONFIRMED, RingStatus.EXPIRED],
  [RingStatus.CONFIRMED]: [RingStatus.COMPLETED, RingStatus.EXPIRED],
  [RingStatus.COMPLETED]: [],
  [RingStatus.EXPIRED]: [],
};

export const RING_STORAGE_HINTS = {
  statusKey: 'reswap:ring-swaps',
  statusTouchedBy: ['models/ringSwap.ts', 'stores/ringSwapStore.ts', 'components/common/RingSwapCard.vue'],
};
