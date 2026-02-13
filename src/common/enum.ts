export const LOGIN_SOURCES = {
  SUPER_ADMIN_PANEL: "super-admin-panel",
  ADMIN_PANEL: "admin-panel",
  WEBSITE: "website",
} as const;

export const USER_ROLES = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  USER: "user",
} as const;

export const USER_TYPES = {
  USER: "user",
  EMPLOYEE: "employee",
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
} as const;

export const PRODUCT_TYPE = {
  FINISHED: "finished",
  RAW_MATERIAL: "raw_material",
  SEMI_FINISHED: "semi_finished",
  SERVICE: "service",
  NON_INVENTORY: "non_inventory",
} as const;

export const RECIPE_TYPE = {
  ASSEMBLE: "assemble",
  UNASSEMBLE: "unassemble",
} as const;

export const PRODUCT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DISCONTINUED: "discontinued",
} as const;

export const PRODUCT_REQUEST_STATUS = {
  ACTIVE: "accepted",
  REJECTED: "rejected",
  PENDING: "pending",
} as const;

export const APPROVAL_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export const PAYMENT_MODE = {
  // PAYMENT: "payment",
  CASH: "cash",
  CARD: "card",
  UPI: "upi",
  WALLET: "wallet",
  BANK: "bank",
  CHEQUE: "cheque",
} as const;

export const ACCOUNT_TYPE = {
  BANK: "bank",
  CASH: "cash",
  OTHER: "other",
} as const;

export const ACCOUNT_NATURE = {
  ASSETS: "assets",
  LIABILITIES: "liabilities",
  INCOME: "income",
  EXPENSES: "expenses",
} as const;

export const ACCOUNT_GROUP_TYPE = {
  SALES: "sales",
  SALES_RETURN: "sales_return",
  PURCHASE: "purchase",
  PURCHASE_RETURN: "purchase_return",
  LIABILITIES: "liabilities",
  ASSETS: "assets",
  INCOME: "income",
  EXPENSES: "expenses",
} as const;

export const CONTACT_TYPE = {
  CUSTOMER: "customer",
  SUPPLIER: "supplier",
  TRANSPORTER: "transporter",
  BOTH: "both",
} as const;

export const CUSTOMER_TYPE = {
  RETAILER: "retailer",
  WHOLESALER: "wholesaler",
  MERCHANT: "merchant",
  OTHER: "other",
} as const;

export const SUPPLIER_TYPE = {
  MANUFACTURER: "manufacturer",
  STOCKIEST: "stockiest",
  TRADER: "trader",
  OTHER: "other",
} as const;

export const CONTACT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export const COUPON_DISCOUNT_TYPE = {
  PERCENTAGE: "percentage",
  FLAT: "flat",
} as const;

export const COUPON_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  EXPIRED: "expired",
} as const;

export const VALUE_TYPE = {
  PERCENTAGE: "percentage",
  FLAT: "flat",
} as const;

export const DISCOUNT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export const EMPLOYEE_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export const INVOICE_PAYMENT_STATUS = {
  PAID: "paid",
  UNPAID: "unpaid",
  PARTIAL: "partial",
} as const;

export const LOYALTY_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export const LOYALTY_TYPE = {
  DISCOUNT: "discount",
  FREE_PRODUCT: "free_product",
} as const;

export const PRODUCT_EXPIRY_TYPE = {
  MFG: "MFG",
  EXPIRY: "expiry",
} as const;

export const SUPPLIER_PAYMENT_STATUS = {
  PAID: "paid",
  UNPAID: "unpaid",
  PARTIAL: "partial",
} as const;

export const VOUCHAR_TYPE = {
  JOURNAL: "journal",
  PAYMENT: "payment",
  RECEIPT: "receipt",
  EXPENSE: "expense",
  CONTRA: "contra",
} as const;

export const INVOICE_STATUS = {
  ACTIVE: "active",
  DRAFT: "draft",
  CANCELLED: "cancelled",
} as const;

export const SUPPLIER_BILL_STATUS = {
  ACTIVE: "active",
  DRAFT: "draft",
  CANCELLED: "cancelled",
} as const;

export const LOCATION_TYPE = {
  COUNTRY: "country",
  STATE: "state",
  CITY: "city",
} as const;

export const TAX_TYPE = {
  DEFAULT: "default",
  TAX_INCLUSIVE: "tax_inclusive",
  TAX_EXCLUSIVE: "tax_exclusive",
  OUT_OF_SCOPE: "out_of_scope",
} as const;

export const ORDER_STATUS = {
  IN_PROGRESS: "in_progress",
  DELIVERED: "delivered",
  PARTIALLY_DELIVERED: "partially_delivered",
  EXCEED: "exceed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const ADDITIONAL_CHARGE_TYPE = {
  PURCHASE: "purchase",
  SALE: "sales",
} as const;

export const CONSUMPTION_TYPE = {
  EXPIRED: "expired",
  SAMPLE: "sample",
  PRODUCTION: "production",
  SCRAP_WASTAGE: "scrap_wastage",
} as const;

export const POS_PAYMENT_METHOD = {
  CASH: "cash",
  CARD: "card",
  UPI: "upi",
  WALLET: "wallet",
  MULTIPAY: "multipay",
  PAY_LATER: "pay_later",
} as const;

export const POS_PAYMENT_STATUS = {
  PAID: "paid",
  UNPAID: "unpaid",
  PARTIAL: "partial",
} as const;

export const POS_ORDER_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  HOLD: "hold",
  CANCELLED: "cancelled",
} as const;

export const POS_ORDER_TYPE = {
  WALK_IN: "walk_in",
  DELIVERY: "delivery",
} as const;

export const PAY_LATER_STATUS = {
  OPEN: "open",
  PARTIAL: "partial",
  SETTLED: "settled",
} as const;

export const POS_VOUCHER_TYPE = {
  SALES: "sales",
  PURCHASE: "purchase",
  EXPENSE: "expense",
} as const;

export const POS_PAYMENT_TYPE = {
  AGAINST_BILL: "against_bill",
  ADVANCE: "advance",
} as const;

export const POS_RECEIPT_TYPE = {
  AGAINST_BILL: "against_bill",
  ADVANCE: "advance",
} as const;


export const LOYALTY_REDEMPTION_TYPE = {
  SINGLE: "single",
  MULTIPLE: "multiple",
} as const;
