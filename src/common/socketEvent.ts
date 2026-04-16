export const SOCKET_EVENTS = {
  NOTIFICATION_NEW: "notification:new",
  STOCK_TRANSFER: "stock:transfer",
  STOCK_EXPIRED: "stock:expired",
  STOCK_LOW: "stock:low",
  STOCK_OUT: "stock:out",
} as const;

export const SOCKET_TYPE = {
  STOCK_TRANSFER: "stockTransfer",
  STOCK: "stock",
};
