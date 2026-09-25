<template>
  <section v-if="item" class="page detail-page">
    <RouterLink class="text-link" to="/home">返回首页</RouterLink>
    <div class="detail-layout">
      <ItemImageGallery :images="item.images" :fallback-text="item.category" />
      <article class="detail-panel">
        <div class="item-card__topline">
          <span class="pill">{{ item.category }}</span>
          <span class="status-pill" :class="statusToneClass(item.status)">
            {{ formatItemStatus(item.status) }}
          </span>
        </div>
        <h1>{{ item.title }}</h1>
        <p>{{ item.description }}</p>
        <dl class="detail-list">
          <div>
            <dt>成色</dt>
            <dd>{{ formatCondition(item.condition) }}</dd>
          </div>
          <div>
            <dt>地点</dt>
            <dd>{{ item.location }}</dd>
          </div>
          <div>
            <dt>发布时间</dt>
            <dd>{{ formatDate(item.created_at) }}</dd>
          </div>
        </dl>
        <UserBrief v-if="owner" :user="owner" />

        <div v-if="!isMine" class="exchange-box">
          <label>
            我的交换物
            <select v-model="selectedItemId">
              <option value="">选择一件我发布的可交换物品</option>
              <option v-for="myItem in ownAvailableItems" :key="myItem.id" :value="myItem.id">
                {{ myItem.title }}
              </option>
            </select>
          </label>
          <label>
            留言
            <textarea v-model="messageText" rows="3" />
          </label>
          <button class="primary-button" type="button" :disabled="item.status !== ItemStatus.AVAILABLE" @click="requestExchange">
            发起交换
          </button>
        </div>

        <div v-if="!isMine && item.status === ItemStatus.AVAILABLE" class="exchange-box ring-box">
          <p class="ring-box__title">三方环形接力</p>
          <p class="ring-box__hint">
            两人直接换不拢时，选一件自己的物品，沿各方“想换取”关系找最多三方闭环；成环即锁定，三方确认后一起成交。
          </p>
          <label>
            我拿出的物品
            <select v-model="ringOfferItemId">
              <option value="">选择一件我发布的可交换物品</option>
              <option v-for="myItem in ownAvailableItems" :key="myItem.id" :value="myItem.id">
                {{ myItem.title }}
              </option>
            </select>
          </label>
          <button class="secondary-button" type="button" :disabled="!ringOfferItemId" @click="searchRing">
            查找三方闭环
          </button>

          <div v-if="ringSearched" class="ring-result">
            <template v-if="ringCandidates.length">
              <p class="ring-result__summary">找到 {{ ringCandidates.length }} 个可成环方案：</p>
              <div
                v-for="(candidate, candidateIndex) in ringCandidates"
                :key="candidateIndex"
                class="ring-result__option"
                :class="{ selected: selectedRingIndex === candidateIndex }"
              >
                <ol>
                  <li v-for="(leg, legIndex) in candidate" :key="legIndex">
                    {{ userNickname(leg.user_id) }}：{{ itemTitle(leg.offer_item_id) }}
                    <span class="ring-arrow">→</span>
                    {{ itemTitle(leg.want_item_id) }}
                  </li>
                </ol>
                <button
                  class="primary-button"
                  type="button"
                  @click="selectedRingIndex = candidateIndex"
                >
                  {{ selectedRingIndex === candidateIndex ? '已选此环' : '选择此环' }}
                </button>
              </div>
              <button
                class="primary-button"
                type="button"
                :disabled="selectedRingIndex < 0"
                @click="startRing"
              >
                发起接力并锁定三件物品
              </button>
            </template>
            <p v-else class="ring-result__empty">{{ FORM_MESSAGES.ringNoCycle }}</p>
          </div>
        </div>

        <button v-else-if="isMine && item.status === ItemStatus.AVAILABLE" class="secondary-button" type="button" @click="offlineItem">
          下架这件物品
        </button>
        <p v-else-if="isMine && item.status === ItemStatus.LOCKED" class="ring-box__hint">
          这件物品正在环形接力中锁定，需等待接力成交或有人退出。
        </p>
      </article>
    </div>
  </section>
  <EmptyState v-else title="物品不存在" description="可能已被清理或链接无效" mark="404" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import EmptyState from '@/components/common/EmptyState.vue';
import ItemImageGallery from '@/components/common/ItemImageGallery.vue';
import UserBrief from '@/components/common/UserBrief.vue';
import { ExchangeStatus } from '@/constants/exchange';
import { ItemStatus } from '@/constants/item';
import { FORM_MESSAGES } from '@/constants/messages';
import type { RingChainLeg } from '@/models/ringPlan';
import { useAuthStore } from '@/stores/authStore';
import { useExchangeStore } from '@/stores/exchangeStore';
import { useItemStore } from '@/stores/itemStore';
import { useRingStore } from '@/stores/ringStore';
import { formatCondition, formatDate, formatItemStatus, statusToneClass } from '@/utils/formatters';
import { message } from '@/utils/message';

const route = useRoute();
const router = useRouter();
const itemStore = useItemStore();
const authStore = useAuthStore();
const exchangeStore = useExchangeStore();
const ringStore = useRingStore();

const item = computed(() => itemStore.items.find((entry) => entry.id === route.params.id));
const owner = computed(() => authStore.users.find((user) => user.id === item.value?.user_id));
const isMine = computed(() => authStore.currentUser?.id === item.value?.user_id);
const ownAvailableItems = computed(() =>
  authStore.currentUser ? itemStore.availableMyItems(authStore.currentUser.id) : [],
);
const selectedItemId = ref('');
const messageText = ref('我想用这件闲置与你交换，可以沟通时间和地点。');

const ringOfferItemId = ref('');
const ringSearched = ref(false);
const ringCandidates = ref<RingChainLeg[][]>([]);
const selectedRingIndex = ref(-1);

const itemTitle = (itemId: string) =>
  itemStore.items.find((entry) => entry.id === itemId)?.title ?? '未知物品';
const userNickname = (userId: string) =>
  authStore.users.find((user) => user.id === userId)?.nickname ?? '未知用户';

const requestExchange = async () => {
  if (!authStore.currentUser || !item.value || !owner.value) return;
  if (!itemStore.assertCanExchange(authStore.currentUser.id)) return;
  if (!selectedItemId.value) {
    message('请选择一件自己的物品', 'error');
    return;
  }
  await exchangeStore.create({
    from_user_id: authStore.currentUser.id,
    to_user_id: owner.value.id,
    from_item_id: selectedItemId.value,
    to_item_id: item.value.id,
    status: ExchangeStatus.PENDING,
    message: messageText.value,
  });
};

const searchRing = () => {
  if (!authStore.currentUser || !item.value) return;
  if (!ringOfferItemId.value) {
    message(FORM_MESSAGES.ringNeedOwnItem, 'error');
    return;
  }
  ringCandidates.value = ringStore.findRings(
    authStore.currentUser.id,
    ringOfferItemId.value,
    item.value.id,
  );
  selectedRingIndex.value = ringCandidates.value.length ? 0 : -1;
  ringSearched.value = true;
  if (!ringCandidates.value.length) {
    message(FORM_MESSAGES.ringNoCycle, 'error');
  }
};

const startRing = async () => {
  if (!authStore.currentUser || !item.value) return;
  const candidate = ringCandidates.value[selectedRingIndex.value];
  if (!candidate) return;
  const plan = await ringStore.createRing({
    initiator_user_id: authStore.currentUser.id,
    legs: candidate,
    message: messageText.value || '三方环形接力，等待大家确认。',
  });
  if (plan) {
    await router.push('/rings');
  }
};

const offlineItem = async () => {
  if (!item.value) return;
  await itemStore.offline(item.value.id);
};
</script>
