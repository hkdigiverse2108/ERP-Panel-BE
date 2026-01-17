export const USER_ROLES = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  USER: "user",
} as const;

export const USER_TYPES = {
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
} as const;

export const DISCOUNT_TYPE = {
  PERCENTAGE: "percentage",
  FLAT: "flat",
} as const;

export const DISCOUNT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export const EMPLOYEE_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
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
  POINTS: "points",
  CASHBACK: "cashback",
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
