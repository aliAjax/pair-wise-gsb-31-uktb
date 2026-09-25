export enum RingStatus {
  LOCKED = 'locked',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/** 环形接力最多支持的参与方数量（含发起人） */
export const RING_MAX_PARTIES = 3;

export const RING_STATUS_OPTIONS = [
  { label: '待确认', value: RingStatus.LOCKED },
  { label: '已成交', value: RingStatus.COMPLETED },
  { label: '已失效', value: RingStatus.FAILED },
];

export const RING_ACTION_FLOW: Record<RingStatus, RingStatus[]> = {
  [RingStatus.LOCKED]: [RingStatus.COMPLETED, RingStatus.FAILED],
  [RingStatus.COMPLETED]: [],
  [RingStatus.FAILED]: [],
};

export const RING_STORAGE_HINTS = {
  statusKey: 'reswap:ring-plans',
  statusTouchedBy: [
    'models/ringPlan.ts',
    'stores/ringStore.ts',
    'components/common/RingPlanCard.vue',
    'pages/Rings.vue',
  ],
};
