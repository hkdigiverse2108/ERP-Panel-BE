export const USER_ROLES = {
  SUPER_ADMIN: "superAdmin",
  ADMIN: "admin",
  USER: "user",
} as const;

export const PRODUCT_TYPE = ['finished', 'raw_material', 'semi_finished', 'service', 'non_inventory'] as const;

export const PRODUCT_STATUS = ["active", "inactive"] as const;
export const ACCOUNT_TYPE = ['bank', 'cash', 'other'] as const;
export const ACCOUNT_NATURE = ['assets', 'liabilities', 'income', 'expenses']  as const;
export const CONTACT_TYPE = ['customer', 'supplier', 'transport', 'both']  as const;
export const CUSTOMER_TYPE = ['retailer', 'wholesaler', 'merchant', 'other']  as const;
export const SUPPLIER_TYPE = ['manufacturer', 'stockiest', 'trader', 'other']  as const;
export const CONTACT_STATUS = ['active', 'inactive']  as const;
export const COUPON_DISCOUNT_TYPE = ['percentage', 'flat'] as const;
export const COUPON_STATUS = ["active", "inactive"] as const;
export const DISCOUNT_TYPE = ['percentage', 'flat'] as const;
export const DISCOUNT_STATUS = ['active', 'inactive'] as const;
export const EMPLOYEE_STATUS = ['active', 'inactive'] as const;
export const INVOICE_PAYMENT_STATUS = ['paid', 'unpaid', 'partial'] as const;
export const LOYALTY_STATUS = ["active", "inactive"] as const;
export const LOYALTY_TYPE = ["points", "cashback"]  as const;
export const PRODUCT_EXPIRY_TYPE = ["MFG", "expiry"]  as const;
export const SUPPLIER_PAYMENT_STATUS = ['paid', 'unpaid', 'partial']  as const;
export const VOUCHAR_TYPE = ["journal", "payment", "receipt", "expense", "contra"]  as const;
