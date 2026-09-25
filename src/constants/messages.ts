import { ExchangeStatus } from './exchange';
import { ItemStatus } from './item';
import { RingStatus } from './ring';

export const PAGE_MESSAGES = {
  homeEmpty: '暂时没有符合条件的闲置物品',
  publishReady: '发布后会同步写入 localStorage 和 IndexedDB',
  exchangeEmpty: '还没有交换请求，先去首页挑一件合眼缘的物品',
  profileUpdated: '个人资料已更新',
  ringActiveEmpty: '当前没有进行中的环形接力，去物品详情发起三方接力吧',
  ringHistoryEmpty: '还没有成交或失效的接力记录',
};

export const FORM_MESSAGES = {
  requiredTitle: '物品标题不能为空',
  requiredDescription: '请描述你希望交换的物品',
  requiredPhone: '请填写联系方式',
  imageLimit: '最多上传 4 张图片',
  exchangeNeedOwnItem: '请先发布一件可交换物品',
  ringNeedOwnItem: '发起环形接力需要先选择一件自己的可交换物品',
  ringNoCycle: '沿“想换取”关系找不到能回到你物品的三方闭环',
};

export const LOG_MESSAGES = {
  storageHydrated: 'storage hydrated with status maps',
  itemStatusUsed: `ItemStatus includes ${ItemStatus.AVAILABLE}, ${ItemStatus.EXCHANGED}, ${ItemStatus.OFFLINE}, ${ItemStatus.LOCKED}`,
  exchangeStatusUsed: `ExchangeStatus includes ${ExchangeStatus.PENDING}, ${ExchangeStatus.ACCEPTED}, ${ExchangeStatus.REJECTED}, ${ExchangeStatus.COMPLETED}`,
  ringStatusUsed: `RingStatus includes ${RingStatus.LOCKED}, ${RingStatus.COMPLETED}, ${RingStatus.FAILED}`,
};

export const STATUS_MESSAGE_MAP: Record<string, string> = Object.fromEntries([
  [ItemStatus.AVAILABLE, '这件物品可发起交换'],
  [ItemStatus.EXCHANGED, '这件物品已完成交换'],
  [ItemStatus.OFFLINE, '这件物品已下架'],
  [ItemStatus.LOCKED, '这件物品已在环形接力中锁定，不能参与其他方案'],
  [ExchangeStatus.PENDING, '等待对方确认'],
  [ExchangeStatus.ACCEPTED, '交换已同意，可确认完成'],
  [ExchangeStatus.REJECTED, '交换请求已拒绝'],
  [ExchangeStatus.COMPLETED, '交换流程已完成'],
  [RingStatus.LOCKED, '三件物品已锁定，等待三方各自确认'],
  [RingStatus.COMPLETED, '三方均已确认，接力成交'],
  [RingStatus.FAILED, '有参与方退出，锁定已释放，方案失效'],
]);
