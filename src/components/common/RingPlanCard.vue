<template>
  <article class="exchange-card ring-card">
    <header>
      <span class="status-pill" :class="statusToneClass(plan.status)">
        {{ formatRingStatus(plan.status) }}
      </span>
      <small>{{ formatDate(plan.updated_at) }}</small>
    </header>

    <ol class="ring-card__chain">
      <li v-for="(leg, index) in plan.legs" :key="`${leg.user_id}-${index}`" class="ring-card__leg">
        <div class="ring-card__who">
          <span>{{ userOf(leg.user_id)?.nickname ?? '未知用户' }}</span>
          <em v-if="plan.status === RingStatus.LOCKED" class="ring-card__confirm" :class="{ done: leg.confirmed }">
            {{ leg.confirmed ? '已确认' : '待确认' }}
          </em>
        </div>
        <div class="exchange-card__items">
          <div>
            <span>拿出</span>
            <strong>{{ itemOf(leg.offer_item_id)?.title ?? '未知物品' }}</strong>
          </div>
          <div>
            <span>换取</span>
            <strong>{{ itemOf(leg.want_item_id)?.title ?? '未知物品' }}</strong>
          </div>
        </div>
      </li>
    </ol>

    <p v-if="plan.status === RingStatus.FAILED" class="ring-card__reason">
      {{ quitUserName }} 选择退出，已释放全部物品，方案失效
    </p>
    <p v-else>{{ plan.message || formatStatusMessage(plan.status) }}</p>

    <footer>
      <span v-if="plan.status === RingStatus.LOCKED">
        已确认 {{ confirmedCount }} / {{ plan.legs.length }}
      </span>
      <span v-else-if="plan.completed_at">成交于 {{ formatDate(plan.completed_at) }}</span>
      <div v-if="canOperate" class="exchange-card__actions">
        <button v-if="!myLeg?.confirmed" type="button" @click="$emit('confirm', plan.id)">
          确认接力
        </button>
        <button type="button" @click="$emit('quit', plan.id)">退出</button>
      </div>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { RingStatus } from '@/constants/ring';
import type { Item } from '@/models/item';
import type { RingPlan } from '@/models/ringPlan';
import type { User } from '@/models/user';
import { useAuthStore } from '@/stores/authStore';
import {
  formatDate,
  formatRingStatus,
  formatStatusMessage,
  statusToneClass,
} from '@/utils/formatters';

const props = defineProps<{
  plan: RingPlan;
  items: Item[];
  users: User[];
}>();

defineEmits<{
  confirm: [id: string];
  quit: [id: string];
}>();

const authStore = useAuthStore();
const itemOf = (itemId: string) => props.items.find((item) => item.id === itemId);
const userOf = (userId: string) => props.users.find((user) => user.id === userId);
const confirmedCount = computed(() => props.plan.legs.filter((leg) => leg.confirmed).length);
const quitUserName = computed(() => {
  const quitBy = props.plan.legs.find((leg) => leg.quit_by)?.quit_by;
  return quitBy ? userOf(quitBy)?.nickname ?? '有参与方' : '有参与方';
});
const myLeg = computed(() =>
  props.plan.legs.find((leg) => leg.user_id === authStore.currentUser?.id),
);
const canOperate = computed(
  () => props.plan.status === RingStatus.LOCKED && Boolean(myLeg.value),
);
</script>
