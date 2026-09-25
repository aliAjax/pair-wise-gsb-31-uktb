<template>
  <article class="exchange-card ring-card" :class="{ 'ring-card--focus': focused }">
    <header>
      <span class="pill">三方接力</span>
      <span class="status-pill" :class="statusToneClass(ring.status)">
        {{ formatRingStatus(ring.status) }}
      </span>
      <small>{{ formatDate(ring.updated_at) }}</small>
    </header>

    <ol class="ring-chain">
      <li v-for="(node, index) in ring.nodes" :key="node.user_id" class="ring-chain__node">
        <span class="ring-chain__order">{{ index + 1 }}</span>
        <div>
          <strong>{{ titleOf(node.item_id) }}</strong>
          <small>{{ nicknameOf(node.user_id) }}</small>
        </div>
        <span v-if="node.quit_at" class="status-pill status-muted">已退出</span>
        <span v-else-if="node.confirmed" class="status-pill status-good">已确认</span>
        <span v-else class="status-pill status-wait">待确认</span>
      </li>
    </ol>

    <p class="form-note">
      接力方向：{{ ring.nodes.map((node) => titleOf(node.item_id)).join(' → ') }} →
      {{ titleOf(ring.nodes[0].item_id) }}
    </p>
    <p v-if="ring.message">{{ ring.message }}</p>
    <footer>
      <small v-if="ring.status === RingStatus.EXPIRED && ring.quit_by">
        {{ nicknameOf(ring.quit_by) }} 退出，物品占用已释放，记录已留存
      </small>
      <small v-else-if="ring.status === RingStatus.COMPLETED && ring.completed_at">
        成交于 {{ formatDate(ring.completed_at) }}
      </small>
      <div v-if="canOperate" class="exchange-card__actions">
        <button
          v-if="ring.status === RingStatus.PENDING && !myNode?.confirmed"
          type="button"
          @click="$emit('confirm', ring.id)"
        >
          我确认
        </button>
        <button
          v-if="ring.status === RingStatus.PENDING || ring.status === RingStatus.CONFIRMED"
          type="button"
          @click="$emit('quit', ring.id)"
        >
          我退出
        </button>
        <button v-if="ring.status === RingStatus.CONFIRMED" type="button" @click="$emit('complete', ring.id)">
          三方一起成交
        </button>
      </div>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { RingStatus } from '@/constants/ringSwap';
import type { RingSwap } from '@/models/ringSwap';
import type { Item } from '@/models/item';
import type { User } from '@/models/user';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, formatRingStatus, statusToneClass } from '@/utils/formatters';

const props = defineProps<{
  ring: RingSwap;
  items: Item[];
  users: User[];
  focused?: boolean;
}>();

defineEmits<{
  confirm: [id: string];
  quit: [id: string];
  complete: [id: string];
}>();

const authStore = useAuthStore();
const myNode = computed(() => props.ring.nodes.find((node) => node.user_id === authStore.currentUser?.id));
const canOperate = computed(
  () =>
    Boolean(myNode.value) &&
    (props.ring.status === RingStatus.PENDING || props.ring.status === RingStatus.CONFIRMED),
);

const titleOf = (itemId: string) => props.items.find((item) => item.id === itemId)?.title ?? '未知物品';
const nicknameOf = (userId: string) => props.users.find((user) => user.id === userId)?.nickname ?? '未知用户';
</script>
