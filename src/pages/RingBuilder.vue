<template>
  <section class="page ring-builder-page">
    <RouterLink class="text-link" to="/rings">返回接力列表</RouterLink>
    <div class="page-heading">
      <div>
        <p class="eyebrow">环形接力 · 最多三方</p>
        <h1>沿「想换取」关系围成一圈</h1>
      </div>
    </div>

    <p class="form-note">
      你选中一件他人物品后，系统沿双方交换意愿寻找最多三方并回到你物品的闭合环。
      成环即锁定三件物品，任何一件都不能再参与其它方案，随后由三方各自确认。
    </p>

    <div v-if="!authStore.currentUser" class="detail-panel">请先登录再发起接力。</div>
    <template v-else>
      <div class="ring-form detail-panel">
        <label>
          我拿出的物品
          <select v-model="startItemId">
            <option value="">选择一件我发布的可交换物品</option>
            <option v-for="myItem in ownAvailableItems" :key="myItem.id" :value="myItem.id">
              {{ myItem.title }}
            </option>
          </select>
        </label>

        <label>
          我选中的他人物品
          <select v-model="selectedItemId">
            <option value="">选择一件想换取的他人物品</option>
            <option v-for="other in othersAvailableItems" :key="other.id" :value="other.id">
              {{ other.title }} · {{ ownerNickname(other.user_id) }}
            </option>
          </select>
        </label>

        <label>
          接力留言
          <textarea v-model="messageText" rows="3" />
        </label>

        <button class="primary-button" type="button" :disabled="!startItemId || !selectedItemId" @click="probeRing">
          检查能否成环
        </button>
      </div>

      <div v-if="probed" class="detail-panel ring-preview">
        <template v-if="ring">
          <h2>找到三方闭环</h2>
          <ol class="ring-chain">
            <li v-for="(itemId, index) in ring.itemIds" :key="itemId" class="ring-chain__node">
              <span class="ring-chain__order">{{ index + 1 }}</span>
              <div>
                <strong>{{ titleOf(itemId) }}</strong>
                <small>{{ ownerNickname(ownerIdOf(itemId)) }} 拿出此物，换取下一件</small>
              </div>
            </li>
          </ol>
          <p class="form-note">
            第 3 件物品的物主想换回你的「{{ titleOf(startItemId) }}」，环在此闭合。
          </p>
          <button class="primary-button" type="button" @click="submitRing">锁定三件物品并发起接力</button>
        </template>
        <EmptyState v-else title="凑不成三方环" :description="PAGE_MESSAGES.ringBuilderEmpty" mark="×" />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import EmptyState from '@/components/common/EmptyState.vue';
import { ItemStatus } from '@/constants/item';
import { PAGE_MESSAGES } from '@/constants/messages';
import { useAuthStore } from '@/stores/authStore';
import { useExchangeStore } from '@/stores/exchangeStore';
import { useItemStore } from '@/stores/itemStore';
import { useRingSwapStore } from '@/stores/ringSwapStore';
import type { RingPath } from '@/utils/ringGraph';
import { findThreeWayRing } from '@/utils/ringGraph';
import { message } from '@/utils/message';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const itemStore = useItemStore();
const exchangeStore = useExchangeStore();
const ringSwapStore = useRingSwapStore();

const startItemId = ref('');
const selectedItemId = ref(typeof route.query.item === 'string' ? route.query.item : '');
const messageText = ref('三方接力，各自拿出一件、各取所需，确认后一起交换。');
const probed = ref(false);
const ring = ref<RingPath | null>(null);

const ownAvailableItems = computed(() =>
  authStore.currentUser ? itemStore.availableMyItems(authStore.currentUser.id) : [],
);
const othersAvailableItems = computed(() =>
  itemStore.items.filter(
    (item) => item.status === ItemStatus.AVAILABLE && item.user_id !== authStore.currentUser?.id,
  ),
);

const titleOf = (itemId: string) => itemStore.items.find((item) => item.id === itemId)?.title ?? '未知物品';
const ownerIdOf = (itemId: string) => itemStore.items.find((item) => item.id === itemId)?.user_id ?? '';
const ownerNickname = (userId: string) =>
  authStore.users.find((user) => user.id === userId)?.nickname ?? '未知用户';

const probeRing = () => {
  if (!authStore.currentUser) return;
  if (!startItemId.value) {
    message('请先选择你要拿出的物品', 'error');
    return;
  }
  ring.value = findThreeWayRing({
    startItemId: startItemId.value,
    selectedItemId: selectedItemId.value,
    items: itemStore.items,
    exchanges: exchangeStore.exchanges,
  });
  probed.value = true;
};

// 选择变化后旧的探测结果失效，需要重新检查
watch([startItemId, selectedItemId], () => {
  probed.value = false;
  ring.value = null;
});

const submitRing = async () => {
  if (!authStore.currentUser || !ring.value) return;
  const nodes = ring.value.itemIds.map((itemId) => ({
    user_id: ownerIdOf(itemId),
    item_id: itemId,
    confirmed: false,
  }));
  const created = await ringSwapStore.create({
    nodes,
    initiator_id: authStore.currentUser.id,
    message: messageText.value,
  });
  await itemStore.hydrate();
  await exchangeStore.hydrate();
  router.push(`/rings?focus=${created.id}`);
};
</script>
