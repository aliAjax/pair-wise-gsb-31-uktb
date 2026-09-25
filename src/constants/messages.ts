import { ExchangeStatus } from './exchange';
import { ItemStatus } from './item';
import { RingStatus } from './ringSwap';

export const PAGE_MESSAGES = {
  homeEmpty: '暂时没有符合条件的闲置物品',
  publishReady: '发布后会同步写入 localStorage 和 IndexedDB',
  exchangeEmpty: '还没有交换请求，先去首页挑一件合眼缘的物品',
  ringEmpty: '还没有环形接力，挑一件他人物品试试三方接力',
  ringBuilderEmpty: '当前的「想换取」关系还凑不成三方环，可以先多发起点对点交换意愿',
  profileUpdated: '个人资料已更新',
};

export const FORM_MESSAGES = {
  requiredTitle: '物品标题不能为空',
  requiredDescription: '请描述你希望交换的物品',
  requiredPhone: '请填写联系方式',
  imageLimit: '最多上传 4 张图片',
  exchangeNeedOwnItem: '请先发布一件可交换物品',
  ringNeedStartItem: '请先选择你要拿出的物品',
  ringNotFound: '沿「想换取」关系找不到回到你物品的三方环',
  ringItemLocked: '环上有物品已被其它方案锁定',
};

export const LOG_MESSAGES = {
  storageHydrated: 'storage hydrated with status maps',
  itemStatusUsed: `ItemStatus includes ${ItemStatus.AVAILABLE}, ${ItemStatus.LOCKED}, ${ItemStatus.EXCHANGED}, ${ItemStatus.OFFLINE}`,
  exchangeStatusUsed: `ExchangeStatus includes ${ExchangeStatus.PENDING}, ${ExchangeStatus.ACCEPTED}, ${ExchangeStatus.REJECTED}, ${ExchangeStatus.COMPLETED}`,
  ringStatusUsed: `RingStatus includes ${RingStatus.PENDING}, ${RingStatus.CONFIRMED}, ${RingStatus.COMPLETED}, ${RingStatus.EXPIRED}`,
};

export const STATUS_MESSAGE_MAP = {
  [ItemStatus.AVAILABLE]: '这件物品可发起交换',
  [ItemStatus.LOCKED]: '物品已锁定在接力方案中，暂不能参与其它交换',
  [ItemStatus.EXCHANGED]: '这件物品已完成交换',
  [ItemStatus.OFFLINE]: '这件物品已下架',
  [ExchangeStatus.PENDING]: '等待对方确认',
  [ExchangeStatus.ACCEPTED]: '交换已同意，可确认完成',
  [ExchangeStatus.REJECTED]: '交换请求已拒绝',
  [ExchangeStatus.COMPLETED]: '交换流程已完成',
};

// RingStatus 的字符串值与 ExchangeStatus 有重合，单独建表避免键冲突
export const RING_STATUS_MESSAGE_MAP: Record<RingStatus, string> = {
  [RingStatus.PENDING]: '等待接力各方确认',
  [RingStatus.CONFIRMED]: '三方已全部确认，可以成交',
  [RingStatus.COMPLETED]: '接力已成交',
  [RingStatus.EXPIRED]: '有人退出，方案已失效，物品占用已释放',
};
