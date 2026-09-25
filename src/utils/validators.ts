import type { ItemDraft } from '@/models/item';
import type { RingPlanDraft } from '@/models/ringPlan';
import type { UserDraft } from '@/models/user';

import { FORM_MESSAGES } from '@/constants/messages';
import { RING_MAX_PARTIES } from '@/constants/ring';

export const validateItemDraft = (draft: Partial<ItemDraft>) => {
  if (!draft.title?.trim()) return FORM_MESSAGES.requiredTitle;
  if (!draft.description?.trim()) return FORM_MESSAGES.requiredDescription;
  return '';
};

export const validateUserDraft = (draft: Partial<UserDraft>) => {
  if (!draft.nickname?.trim()) return '昵称不能为空';
  if (!draft.phone?.trim()) return FORM_MESSAGES.requiredPhone;
  return '';
};

export const validateRingDraft = (draft: Pick<RingPlanDraft, 'legs'>) => {
  if (draft.legs.length !== RING_MAX_PARTIES) return '环形接力必须凑齐三方';
  const userIds = new Set(draft.legs.map((leg) => leg.user_id));
  if (userIds.size !== RING_MAX_PARTIES) return '三方必须是不同的参与者';
  const closed = draft.legs.every(
    (leg, index) => leg.want_item_id === draft.legs[(index + 1) % draft.legs.length].offer_item_id,
  );
  if (!closed) return FORM_MESSAGES.ringNoCycle;
  return '';
};
