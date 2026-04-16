// import * as cron from "cron";
import { CronJob } from "cron";
import { companyModel, couponModel, discountModel, notificationModel, PrefixModel, productModel, stockModel } from "../database";
import { COUPON_STATUS, DISCOUNT_STATUS, SOCKET_EVENTS, SOCKET_TYPE } from "../common";
import { sendNotification } from "./socket";

const ObjectId = require("mongoose").Types.ObjectId;

export const deactivateExpiredCoupons = async () => {
  try {
    const now = new Date();

    // 1. Coupons expired by endDate
    await couponModel.updateMany(
      {
        isDeleted: false,
        isActive: true,
        status: COUPON_STATUS.ACTIVE,
        endDate: { $lte: now },
      },
      {
        $set: { isActive: false, status: COUPON_STATUS.EXPIRED },
      },
    );

    // 2. Coupons expired by expiryDays (calculated from createdAt)
    const couponsWithExpiryDays = await couponModel.find({
      isDeleted: false,
      isActive: true,
      status: COUPON_STATUS.ACTIVE,
      expiryDays: { $exists: true, $ne: null },
    });

    for (const coupon of couponsWithExpiryDays) {
      const expiryDate = new Date(coupon.createdAt);
      expiryDate.setDate(expiryDate.getDate() + coupon.expiryDays);

      if (now > expiryDate) {
        await couponModel.updateOne({ _id: coupon._id }, { $set: { isActive: false, status: COUPON_STATUS.EXPIRED } });
      }
    }

    console.log(`[CRON] Expired coupons deactivated at ${now.toISOString()}`);
  } catch (error) {
    console.error("[CRON] Error deactivating expired coupons:", error);
  }
};

export const deactivateExpiredDiscounts = async () => {
  try {
    const now = new Date();

    // 1. Discounts expired by endDateTime
    const expiredByDate = await discountModel.updateMany(
      {
        isDeleted: false,
        status: DISCOUNT_STATUS.ACTIVE,
        hasEndDate: true,
        endDateTime: { $lte: now },
      },
      {
        $set: { status: DISCOUNT_STATUS.INACTIVE },
      },
    );

    // 2. Discounts that hit their total usage limit
    const expiredByUsage = await discountModel.updateMany(
      {
        isDeleted: false,
        status: DISCOUNT_STATUS.ACTIVE,
        usageLimitTotal: { $exists: true, $ne: null },
        $expr: { $gte: ["$usedCount", "$usageLimitTotal"] },
      },
      {
        $set: { status: DISCOUNT_STATUS.INACTIVE },
      },
    );

    const totalDeactivated = (expiredByDate.modifiedCount || 0) + (expiredByUsage.modifiedCount || 0);
    if (totalDeactivated > 0) {
      console.log(`[CRON] Deactivated ${totalDeactivated} expired/exhausted discounts at ${now.toISOString()}`);
    }
  } catch (error) {
    console.error("[CRON] Error deactivating expired discounts:", error);
  }
};

export const resetPrefixNumbers = async () => {
  try {
    const now = new Date();
    // Determine the financial year that just ended (e.g., if today is April 1st, 2025, the year was 2024-25)
    const currentYear = now.getFullYear();
    const financialYearSuffix = currentYear.toString().slice(-2);
    const previousYear = currentYear - 1;
    const financialYear = `${previousYear}-${financialYearSuffix}`;

    console.log(`[CRON] Starting Financial Year Prefix Reset for ${financialYear}...`);

    const prefixes = await PrefixModel.find({ isDeleted: false });

    for (const prefix of prefixes) {
      // 1. Store the current number in history before resetting
      const historyEntry = {
        financialYear: financialYear,
        lastNumber: prefix.currentNumber || 1,
        resetDate: now,
      };

      // 2. Reset currentNumber back to sequenceNumber (the starting reference)
      await PrefixModel.updateOne(
        { _id: prefix._id },
        {
          $set: { currentNumber: prefix.sequenceNumber || 1 },
          $push: { history: historyEntry },
        },
      );
    }

    // 3. Update the Current Financial Year for all companies
    const startDate = new Date(Date.UTC(currentYear, 3, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(currentYear + 1, 2, 31, 23, 59, 59, 999));
    const newFinancialYear = `${startDate.toISOString()} - ${endDate.toISOString()}`;
    await companyModel.updateMany({ isDeleted: false }, { $set: { financialYear: newFinancialYear } });

    console.log(`[CRON] Successfully updated company financial year to ${newFinancialYear} and reset ${prefixes.length} prefixes.`);
  } catch (error) {
    console.error("[CRON] Error resetting prefix numbers:", error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Stock Alert Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dedup guard: returns true if a notification for this
 * (branchId, eventType, productId) was already sent today.
 */
const wasAlreadyNotifiedToday = async (branchId: string, eventType: string, productId: string): Promise<boolean> => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const existing = await notificationModel.findOne({
    branchId,
    eventType,
    "meta.productId": productId,
    createdAt: { $gte: startOfToday },
  });

  return !!existing;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Stock Expiry Check
//    Fires STOCK_EXPIRED for every (product, branch) where the product's
//    calculatedExpiryDate is within the next EXPIRY_WARN_DAYS days
//    and the branch still has qty > 0.
// ─────────────────────────────────────────────────────────────────────────────
const EXPIRY_WARN_DAYS = 7;

export const checkStockExpiry = async () => {
  try {
    const now = new Date();
    const warningDate = new Date(now.getTime() + EXPIRY_WARN_DAYS * 24 * 60 * 60 * 1000);

    // Products that have expiry tracking and are expiring within the warning window
    const expiringProducts = await productModel.find({
      isDeleted: false,
      hasExpiry: true,
      calculatedExpiryDate: { $lte: warningDate },
    });

    if (!expiringProducts.length) return;

    for (const product of expiringProducts) {
      // Find all branch stocks for this product with qty > 0
      const stocks = await stockModel.find({
        productId: new ObjectId(product._id),
        isDeleted: false,
        qty: { $gt: 0 },
      });

      for (const stock of stocks) {
        const branchId = String(stock.branchId);
        const productId = String(product._id);

        // Skip if already notified today for this product + branch
        const alreadyNotified = await wasAlreadyNotifiedToday(branchId, SOCKET_EVENTS.STOCK_EXPIRED, productId);
        if (alreadyNotified) continue;

        const isExpired = product.calculatedExpiryDate <= now;
        const expiryLabel = isExpired ? "has expired" : `expires on ${product.calculatedExpiryDate.toDateString()}`;

        await sendNotification({
          companyId: stock.companyId,
          branchId: stock.branchId,
          title: isExpired ? "Stock Expired" : "Stock Expiring Soon",
          message: `${product.name} ${expiryLabel} (Available qty: ${stock.qty})`,
          eventType: SOCKET_EVENTS.STOCK_EXPIRED,
          meta: {
            type: SOCKET_TYPE.STOCK,
            productId,
            expiryDate: product.calculatedExpiryDate,
            qty: stock.qty,
            isExpired,
          },
        });
      }
    }

    console.log(`[CRON] Stock expiry check completed at ${now.toISOString()}`);
  } catch (error) {
    console.error("[CRON] Error checking stock expiry:", error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Stock Low Check
//    Fires STOCK_LOW for every (product, branch) where
//    0 < stock.qty <= product.minimumQty.
// ─────────────────────────────────────────────────────────────────────────────
export const checkStockLow = async () => {
  try {
    const now = new Date();

    // Aggregate: join stock with product, filter where qty is between 1 and minimumQty
    const lowStocks: any[] = await stockModel.aggregate([
      { $match: { isDeleted: false, qty: { $gt: 0 } } },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $match: {
          "product.isDeleted": false,
          "product.minimumQty": { $gt: 0 },
          $expr: { $lte: ["$qty", "$product.minimumQty"] },
        },
      },
    ]);

    if (!lowStocks.length) return;

    for (const stock of lowStocks) {
      const branchId = String(stock.branchId);
      const productId = String(stock.productId);

      // Skip if already notified today for this product + branch
      const alreadyNotified = await wasAlreadyNotifiedToday(branchId, SOCKET_EVENTS.STOCK_LOW, productId);
      if (alreadyNotified) continue;

      await sendNotification({
        companyId: stock.companyId,
        branchId: stock.branchId,
        title: "Low Stock Alert",
        message: `${stock.product.name} is running low (Available: ${stock.qty}, Minimum: ${stock.product.minimumQty})`,
        eventType: SOCKET_EVENTS.STOCK_LOW,
        meta: {
          type: SOCKET_TYPE.STOCK,
          productId,
          currentQty: stock.qty,
          minimumQty: stock.product.minimumQty,
        },
      });
    }

    console.log(`[CRON] Stock low check completed at ${now.toISOString()}`);
  } catch (error) {
    console.error("[CRON] Error checking low stock:", error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Out-of-Stock Check
//    Fires STOCK_OUT for every (product, branch) where stock.qty === 0.
// ─────────────────────────────────────────────────────────────────────────────
export const checkOutOfStock = async () => {
  try {
    const now = new Date();

    const outOfStocks: any[] = await stockModel.aggregate([
      { $match: { isDeleted: false, qty: { $lte: 0 } } },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      { $match: { "product.isDeleted": false } },
    ]);

    if (!outOfStocks.length) return;

    for (const stock of outOfStocks) {
      const branchId = String(stock.branchId);
      const productId = String(stock.productId);

      // Skip if already notified today for this product + branch
      const alreadyNotified = await wasAlreadyNotifiedToday(branchId, SOCKET_EVENTS.STOCK_OUT, productId);
      if (alreadyNotified) continue;

      await sendNotification({
        companyId: stock.companyId,
        branchId: stock.branchId,
        title: "Out of Stock",
        message: `${stock.product.name} is out of stock`,
        eventType: SOCKET_EVENTS.STOCK_OUT,
        meta: {
          type: SOCKET_TYPE.STOCK,
          productId,
          currentQty: stock.qty,
        },
      });
    }

    console.log(`[CRON] Out-of-stock check completed at ${now.toISOString()}`);
  } catch (error) {
    console.error("[CRON] Error checking out-of-stock:", error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

export const initCronJobs = () => {
  // check every 1 hour
  const couponExpiryCron = new CronJob("0 * * * *", deactivateExpiredCoupons);
  couponExpiryCron.start();
  console.log("[CRON] Coupon expiry cron job initialized (runs every 1 hour)");

  const discountExpiryCron = new CronJob("0 * * * *", deactivateExpiredDiscounts);
  discountExpiryCron.start();
  console.log("[CRON] Discount expiry cron job initialized (runs every 1 hour)");

  // Financial Year Reset: Runs on April 1st at 12:00 AM
  const prefixResetCron = new CronJob("0 0 0 1 4 *", resetPrefixNumbers);
  // const prefixResetCron = new CronJob("* * * * *", resetPrefixNumbers);
  prefixResetCron.start();
  console.log("[CRON] Financial Year Prefix Reset cron job initialized (runs every April 1st at 12:00 AM)");

  // Stock Expiry: runs daily at 12:00 AM
  const stockExpiryCron = new CronJob("0 0 * * *", checkStockExpiry);
  // const stockExpiryCron = new CronJob("* * * * *", checkStockExpiry);
  stockExpiryCron.start();
  console.log("[CRON] Stock expiry check cron job initialized (runs daily at 12:00 AM)");

  // Stock Low: runs daily at 12:00 AM
  const stockLowCron = new CronJob("0 0 * * *", checkStockLow);
  // const stockLowCron = new CronJob("* * * * *", checkStockLow);
  stockLowCron.start();
  console.log("[CRON] Stock low check cron job initialized (runs daily at 12:00 AM)");

  // Out of Stock: runs daily at 12:00 AM alongside low stock
  const outOfStockCron = new CronJob("0 0 * * *", checkOutOfStock);
  // const outOfStockCron = new CronJob("* * * * *", checkOutOfStock);
  outOfStockCron.start();
  console.log("[CRON] Out-of-stock check cron job initialized (runs daily at 12:00 AM)");
};
