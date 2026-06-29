import { apiResponse, HTTP_STATUS, PAY_LATER_STATUS, PAYMENT_MODE, POS_ORDER_STATUS, POS_PAYMENT_STATUS, POS_PAYMENT_TYPE, POS_VOUCHER_TYPE, REDEEM_CREDIT_TYPE, REDEEM_CREDIT_MODEL, CASH_REGISTER_STATUS, PREFIX_MODULES } from "../../common";
import { contactModel, productModel, taxModel, branchModel, PosOrderModel, additionalChargeModel, PosPaymentModel, userModel, stockModel, couponModel, loyaltyPointsModel, returnPosOrderModel, PosCashRegisterModel, posCreditNoteModel, discountModel } from "../../database";
import { applyDateFilter, checkBranch, checkCompany, checkIdExist, checkStockQty, countData, createOne, getAndIncrementPrefix, getDataWithSorting, getFirstMatch, handleIncludeId, reqInfo, responseMessage, updateData } from "../../helper";
import { addPosOrderSchema, deletePosOrderSchema, editPosOrderSchema, getPosOrderSchema, releasePosOrderSchema, getCustomerPosDetailsSchema } from "../../validation";
import { applyCoupon, applyLoyalty, applyPosDiscount, applyRedeemCredit, revertCoupon, revertDiscount, revertLoyalty, revertRedeemCredit } from "./helper";

const ObjectId = require("mongoose").Types.ObjectId;

export const addPosOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addPosOrderSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);
    value.branchId = await checkBranch(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
    if (!value.branchId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Branch Id"), {}, {}));

    if (value.branchId && !(await checkIdExist(branchModel, value.branchId, "Branch", res))) return;
    if (value.salesManId && !(await checkIdExist(userModel, value.salesManId, "Sales Man", res))) return;
    if (value.couponId && !(await checkIdExist(couponModel, value.couponId, "Coupon", res))) return;
    if (value.discountId && !(await checkIdExist(discountModel, value.discountId, "Discount", res))) return;

    // Get customer name if customer provided
    if (value.customerId) {
      const customer = await getFirstMatch(contactModel, { _id: value.customerId, isDeleted: false }, {}, {});
      if (customer) {
        value.customerName = customer.companyName || `${customer.firstName} ${customer.lastName || ""}`.trim();
      }
    }

    // Validate products exist
    for (const item of value.items) {
      if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      if (!(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
    }

    // Check stock qty
    if (!(await checkStockQty(value.items, value.branchId, res))) return;

    for (const item of value.additionalCharges) {
      if (!(await checkIdExist(additionalChargeModel, item?.chargeId, "Additional Charge", res))) return;
      if (!(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
    }

    // --- Link Open Cash Register ---
    const openRegister = await getFirstMatch(
      PosCashRegisterModel,
      {
        branchId: value.branchId,
        status: CASH_REGISTER_STATUS.OPEN,
        isDeleted: false,
      },
      {},
      {},
    );

    if (!openRegister) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "No open cash register found. Please open a cash register before creating a POS order.", {}, {}));
    }
    value.posCashRegisterId = openRegister._id;
    // -------------------------------

    value.orderNo = await getAndIncrementPrefix({
      branchId: value.branchId,
      companyId: value.companyId,
      prefixType: PREFIX_MODULES.POS_ORDER,
      model: PosOrderModel,
      fieldName: "orderNo",
    });

    // Set hold date if status is hold
    if (value.status === POS_ORDER_STATUS.HOLD) {
      value.holdDate = new Date();
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    // Calculate paid amount from multiple payments if provided
    if (value?.multiplePayments && value?.multiplePayments?.length > 0) {
      value.paidAmount = value.multiplePayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    }

    if (value.redeemCreditId && value.redeemCreditAmount > 0) {
      const redeemResponse = await applyRedeemCredit(value.redeemCreditId, value.redeemCreditType, value.redeemCreditAmount, value.customerId);
      if (redeemResponse !== "Redeem credit applied successfully") {
        return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, redeemResponse, {}, {}));
      }

      // Map to model name for refPath
      if (value.redeemCreditType === REDEEM_CREDIT_TYPE.CREDIT_NOTE) value.redeemCreditType = REDEEM_CREDIT_MODEL.CREDIT_NOTE;
      else if (value.redeemCreditType === REDEEM_CREDIT_TYPE.ADVANCE_PAYMENT) value.redeemCreditType = REDEEM_CREDIT_MODEL.ADVANCE_PAYMENT;
    }

    // Set payment status based on paid amount
    const totalAmount = value?.totalAmount;
    const paidAmount = value?.paidAmount || 0;
    const dueAmount = Math.max(0, totalAmount - paidAmount);

    value.dueAmount = dueAmount;

    if (paidAmount >= totalAmount) {
      value.paymentStatus = POS_PAYMENT_STATUS.PAID;
      value.status = POS_ORDER_STATUS.COMPLETED;
      if (totalAmount === 0 && req.body.status === POS_ORDER_STATUS.HOLD) {
        value.status = POS_ORDER_STATUS.HOLD;
      }
    } else if (paidAmount > 0 && paidAmount < totalAmount) {
      value.paymentStatus = POS_PAYMENT_STATUS.PARTIAL;
    } else {
      value.paymentStatus = POS_PAYMENT_STATUS.UNPAID;
    }

    // Handle Pay Later status
    if (dueAmount > 0) {
      value.payLater = value.payLater || {};
      value.payLater.status = paidAmount > 0 ? PAY_LATER_STATUS.PARTIAL : PAY_LATER_STATUS.OPEN;
    } else {
      if (value.payLater) {
        value.payLater.status = PAY_LATER_STATUS.SETTLED;
        value.payLater.settledDate = new Date();
      }
    }

    if (value.couponId) {
      const couponResponse = await applyCoupon(value.couponId, value.customerId, value.totalAmount);
      if (couponResponse !== "Coupon applied successfully") {
        return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, couponResponse, {}, {}));
      }
    }

    if (value.discountId) {
      const discountResponse = await applyPosDiscount(value.discountId, value.customerId);

      if (discountResponse !== "Discount applied successfully") {
        return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, discountResponse, {}, {}));
      }
    }

    if (value.loyaltyId) {
      const loyaltyResponse = await applyLoyalty(value.loyaltyId, value.customerId, Number(value.totalMrp));
      if (loyaltyResponse !== "Loyalty redeemed successfully") {
        return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, loyaltyResponse, {}, {}));
      }
    }

    const response = await createOne(PosOrderModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    // --- Stock Management Logic ---
    if (response.status !== POS_ORDER_STATUS.CANCELLED) {
      for (const item of response.items) {
        let deductFromParent = false;
        let parentStockRatio = 1;
        if (item.variantId) {
          const product = await productModel.findById(item.productId).lean();
          if (product && product.variants) {
            const variant = product.variants.find((v: any) => v._id.toString() === item.variantId.toString()) as any;
            if (variant && variant.deductFromParent) {
              deductFromParent = true;
              parentStockRatio = variant.parentStockRatio || 1;
            }
          }
        }

        const stockMatchCriteria: any = {
          productId: item.productId,
          branchId: response.branchId,
          isDeleted: false,
        };
        if (deductFromParent) {
          stockMatchCriteria.variantId = { $exists: false };
        } else if (item.variantId) {
          stockMatchCriteria.variantId = item.variantId;
        } else {
          stockMatchCriteria.variantId = { $exists: false };
        }

        await stockModel.findOneAndUpdate(
          stockMatchCriteria,
          { $inc: { qty: -(item.qty * parentStockRatio) } },
        );
      }
    }
    // -------------------------------
    // --- Link Credit Note to Order ---
    if (response && value.redeemCreditId && value.redeemCreditType === REDEEM_CREDIT_MODEL.CREDIT_NOTE) {
      await posCreditNoteModel.updateOne({ _id: value.redeemCreditId }, { $addToSet: { usedOnOrderIds: response._id } });
    }
    // ---------------------------------

    // --- Loyalty Points Logic ---
    if (response.status !== POS_ORDER_STATUS.CANCELLED && response.customerId) {
      const loyaltyConfig = await getFirstMatch(loyaltyPointsModel, { companyId: response.companyId }, {}, {});
      if (loyaltyConfig && loyaltyConfig.amount > 0 && loyaltyConfig.points > 0) {
        const pointsToEarn = Math.floor(response.totalAmount / loyaltyConfig.amount) * loyaltyConfig.points;
        if (pointsToEarn > 0) {
          await contactModel.findByIdAndUpdate(response.customerId, {
            $inc: { loyaltyPoints: pointsToEarn },
          });
        }
      }
    }

    // Add payment entry (multiple entries if multiplePayments provided)
    if (value.multiplePayments && value.multiplePayments.length > 0) {
      for (const payment of value.multiplePayments) {
        if (payment.amount > 0) {
          const paymentData = {
            companyId: response.companyId,
            branchId: response.branchId,
            posOrderId: response._id,
            posCashRegisterId: response.posCashRegisterId,
            partyId: response.customerId,
            amount: payment.amount,
            paymentMode: payment.method,
            voucherType: POS_VOUCHER_TYPE.SALES,
            paymentType: POS_PAYMENT_TYPE.AGAINST_BILL,
            paymentNo: await getAndIncrementPrefix({
              branchId: response.branchId,
              companyId: response.companyId,
              prefixType: PREFIX_MODULES.RECEIPT,
              model: PosPaymentModel,
              fieldName: "paymentNo",
            }),
            createdBy: user?._id || null,
            updatedBy: user?._id || null,
          };
          await createOne(PosPaymentModel, paymentData);
        }
      }
    } else {
      const otherPaidAmount = (response.paidAmount || 0) - (value.redeemCreditAmount || 0);
      if (otherPaidAmount > 0) {
        const paymentData = {
          companyId: response.companyId,
          branchId: response.branchId,
          posOrderId: response._id,
          posCashRegisterId: response.posCashRegisterId,
          partyId: response.customerId,
          amount: otherPaidAmount,
          paymentMode: value.paymentMethod || PAYMENT_MODE.CASH,
          voucherType: POS_VOUCHER_TYPE.SALES,
          paymentType: POS_PAYMENT_TYPE.AGAINST_BILL,
          paymentNo: await getAndIncrementPrefix({
            branchId: response.branchId,
            companyId: response.companyId,
            prefixType: PREFIX_MODULES.RECEIPT,
            model: PosPaymentModel,
            fieldName: "paymentNo",
          }),
          createdBy: user?._id || null,
          updatedBy: user?._id || null,
        };
        await createOne(PosPaymentModel, paymentData);
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("POS Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editPosOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editPosOrderSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(PosOrderModel, { _id: value?.posOrderId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Order"), {}, {}));
    }

    // Check if the associated cash register is closed
    if (isExist.posCashRegisterId) {
      const register = await PosCashRegisterModel.findById(isExist.posCashRegisterId);
      if (register && register.status === CASH_REGISTER_STATUS.CLOSED) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "This order cannot be edited because its associated cash register has been closed.", {}, {}));
      }
    } else {
      // Fallback for orders without posCashRegisterId (Historical data)
      const register = await PosCashRegisterModel.findOne({
        companyId: isExist.companyId,
        branchId: isExist.branchId,
        createdAt: { $lte: isExist.createdAt },
        isDeleted: false,
      }).sort({ createdAt: -1 });

      if (register && register.status === CASH_REGISTER_STATUS.CLOSED) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "This order cannot be edited because its associated cash register has been closed.", {}, {}));
      }
    }

    if (value.couponId && !(await checkIdExist(couponModel, value.couponId, "Coupon", res))) return;

    if (value.salesManId && !(await checkIdExist(userModel, value.salesManId, "Sales Man", res))) return;

    // Validate customer if being changed
    if (value.customerId && value.customerId !== isExist.customerId?.toString()) {
      if (!(await checkIdExist(contactModel, value.customerId, "Customer", res))) return;
      const customer = await getFirstMatch(contactModel, { _id: value.customerId, isDeleted: false }, {}, {});
      if (customer) {
        value.customerName = customer.companyName || `${customer.firstName} ${customer.lastName || ""}`.trim();
      }
    }

    // Validate products exist

    if (value?.items) {
      for (const item of value?.items) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
        if (!(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
      }

      // Check stock qty
      if (!(await checkStockQty(value.items, isExist.branchId, res, isExist.items))) return;
    }

    if (value?.additionalCharges) {
      for (const item of value.additionalCharges) {
        if (!(await checkIdExist(additionalChargeModel, item?.chargeId, "Additional Charge", res))) return;
        if (!(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
      }
    }

    // Update hold date if status is being changed to hold
    if (value.status === POS_ORDER_STATUS.HOLD && isExist.status !== POS_ORDER_STATUS.HOLD) {
      value.holdDate = new Date();
    }

    value.updatedBy = user?._id || null;

    // Handle payment logic for edit
    const totalAmount = value.totalAmount !== undefined ? value.totalAmount : isExist.totalAmount;
    const oldPaidAmount = isExist.paidAmount || 0;

    let newPaidAmount = oldPaidAmount;
    let paymentDiff = 0;

    if (value.multiplePayments && value.multiplePayments.length > 0) {
      paymentDiff = value.multiplePayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      newPaidAmount = oldPaidAmount + paymentDiff;
      value.paidAmount = newPaidAmount;
    } else if (value.paidAmount !== undefined) {
      newPaidAmount = value.paidAmount;
      paymentDiff = newPaidAmount - oldPaidAmount;
    }

    const dueAmount = Math.max(0, totalAmount - newPaidAmount);
    value.dueAmount = dueAmount;

    if (newPaidAmount >= totalAmount) {
      value.paymentStatus = POS_PAYMENT_STATUS.PAID;
      value.status = POS_ORDER_STATUS.COMPLETED;
      if (totalAmount === 0 && req.body.status === POS_ORDER_STATUS.HOLD) {
        value.status = POS_ORDER_STATUS.HOLD;
      }
    } else if (newPaidAmount > 0 && newPaidAmount < totalAmount) {
      value.paymentStatus = POS_PAYMENT_STATUS.PARTIAL;
    } else {
      value.paymentStatus = POS_PAYMENT_STATUS.UNPAID;
    }

    // Handle Pay Later status within posOrder
    if (dueAmount > 0) {
      value.payLater = {
        ...(isExist.payLater || {}),
        ...(value.payLater || {}),
        status: newPaidAmount > 0 ? PAY_LATER_STATUS.PARTIAL : PAY_LATER_STATUS.OPEN,
      };
    } else {
      value.payLater = {
        ...(isExist.payLater || {}),
        ...(value.payLater || {}),
        status: PAY_LATER_STATUS.SETTLED,
        settledDate: new Date(),
      };
    }

    // Handle discount logic for edit
    if (value.discountId !== undefined && value.discountId?.toString() !== isExist.discountId?.toString()) {
      if (isExist.discountId) {
        await revertDiscount(isExist.discountId.toString(), isExist.customerId?.toString());
      }
      if (value.discountId) {
        const discountResponse = await applyPosDiscount(value.discountId, value.customerId || isExist.customerId?.toString());
        if (discountResponse !== "Discount applied successfully") {
          return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, discountResponse, {}, {}));
        }
      }
    }

    // Map to model name for refPath validation
    if (value.redeemCreditType) {
      if (value.redeemCreditType === REDEEM_CREDIT_TYPE.CREDIT_NOTE) value.redeemCreditType = REDEEM_CREDIT_MODEL.CREDIT_NOTE;
      else if (value.redeemCreditType === REDEEM_CREDIT_TYPE.ADVANCE_PAYMENT) value.redeemCreditType = REDEEM_CREDIT_MODEL.ADVANCE_PAYMENT;
    }

    // --- Handle Credit Redemption Synchronization ---
    const oldRedeemId = isExist.redeemCreditId?.toString();
    const newRedeemId = value.redeemCreditId?.toString();
    const oldAmount = Number(isExist.redeemCreditAmount) || 0;
    const newAmount = Number(value.redeemCreditAmount) || 0;

    if (oldRedeemId !== newRedeemId) {
      if (oldRedeemId) {
        await revertRedeemCredit(oldRedeemId, isExist.redeemCreditType, oldAmount, isExist._id?.toString());
      }
      if (newRedeemId) {
        const applyRes = await applyRedeemCredit(newRedeemId, value.redeemCreditType, newAmount, value.customerId || isExist.customerId?.toString(), isExist._id?.toString());
        if (typeof applyRes === "string" && applyRes !== "Redeem credit applied successfully") {
          return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, applyRes, {}, {}));
        }
      }
    } else if (oldRedeemId && oldAmount !== newAmount) {
      const diff = newAmount - oldAmount;
      if (diff > 0) {
        const applyRes = await applyRedeemCredit(oldRedeemId, isExist.redeemCreditType, diff, isExist.customerId?.toString(), isExist._id?.toString());
        if (typeof applyRes === "string" && applyRes !== "Redeem credit applied successfully") {
          return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, applyRes, {}, {}));
        }
      } else if (diff < 0) {
        await revertRedeemCredit(oldRedeemId, isExist.redeemCreditType, Math.abs(diff), isExist._id?.toString());
        // await applyRedeemCredit(oldRedeemId, isExist.redeemCreditType, newAmount, isExist.customerId?.toString(), isExist._id?.toString());
      }
    }
    // ------------------------------------------------

    const response = await updateData(PosOrderModel, { _id: value?.posOrderId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("POS Order"), {}, {}));
    }

    // --- Stock Management Logic ---
    const oldStatus = isExist.status;
    const newStatus = response.status;
    const wasActive = oldStatus !== POS_ORDER_STATUS.CANCELLED;
    const isActive = newStatus !== POS_ORDER_STATUS.CANCELLED;

    // 1. Revert the old quantities back to stock if it was active
    if (wasActive) {
      for (const item of isExist.items) {
        let deductFromParent = false;
        let parentStockRatio = 1;
        if (item.variantId) {
          const product = await productModel.findById(item.productId).lean();
          if (product && product.variants) {
            const variant = product.variants.find((v: any) => v._id.toString() === item.variantId.toString()) as any;
            if (variant && variant.deductFromParent) {
              deductFromParent = true;
              parentStockRatio = variant.parentStockRatio || 1;
            }
          }
        }

        const stockMatchCriteria: any = {
          productId: item.productId,
          branchId: isExist.branchId,
          isDeleted: false,
        };
        if (deductFromParent) {
          stockMatchCriteria.variantId = { $exists: false };
        } else if (item.variantId) {
          stockMatchCriteria.variantId = item.variantId;
        } else {
          stockMatchCriteria.variantId = { $exists: false };
        }

        await stockModel.findOneAndUpdate(
          stockMatchCriteria,
          { $inc: { qty: item.qty * parentStockRatio } },
        );
      }
    }

    // 2. Deduct the new quantities from stock if it is now active
    if (isActive) {
      for (const item of response.items) {
        let deductFromParent = false;
        let parentStockRatio = 1;
        if (item.variantId) {
          const product = await productModel.findById(item.productId).lean();
          if (product && product.variants) {
            const variant = product.variants.find((v: any) => v._id.toString() === item.variantId.toString()) as any;
            if (variant && variant.deductFromParent) {
              deductFromParent = true;
              parentStockRatio = variant.parentStockRatio || 1;
            }
          }
        }

        const stockMatchCriteria: any = {
          productId: item.productId,
          branchId: response.branchId,
          isDeleted: false,
        };
        if (deductFromParent) {
          stockMatchCriteria.variantId = { $exists: false };
        } else if (item.variantId) {
          stockMatchCriteria.variantId = item.variantId;
        } else {
          stockMatchCriteria.variantId = { $exists: false };
        }

        await stockModel.findOneAndUpdate(
          stockMatchCriteria,
          { $inc: { qty: -(item.qty * parentStockRatio) } },
        );
      }
    }
    // -------------------------------

    // --- Loyalty Points Logic ---
    const loyaltyConfig = await getFirstMatch(loyaltyPointsModel, { companyId: response.companyId, isActive: true }, {}, {});
    if (loyaltyConfig && loyaltyConfig.amount > 0 && loyaltyConfig.points > 0) {
      // 1. Revert old points if it was active
      if (wasActive && isExist.customerId) {
        const oldPoints = Math.floor(isExist.totalAmount / loyaltyConfig.amount) * loyaltyConfig.points;
        if (oldPoints > 0) {
          await contactModel.findByIdAndUpdate(isExist.customerId, {
            $inc: { loyaltyPoints: -oldPoints },
          });
        }
      }

      // 2. Apply new points if it is now active
      if (isActive && response.customerId) {
        const newPoints = Math.floor(response.totalAmount / loyaltyConfig.amount) * loyaltyConfig.points;
        if (newPoints > 0) {
          await contactModel.findByIdAndUpdate(response.customerId, {
            $inc: { loyaltyPoints: newPoints },
          });
        }
      }
    }
    // ----------------------------

    // Add payment entry if there's a difference
    if (paymentDiff > 0) {
      if (value.multiplePayments && value.multiplePayments.length > 0) {
        for (const payment of value.multiplePayments) {
          if (payment.amount > 0) {
            const paymentData = {
              companyId: response.companyId,
              branchId: response.branchId,
              posOrderId: response._id,
              posCashRegisterId: response.posCashRegisterId,
              partyId: response.customerId,
              amount: payment.amount,
              paymentMode: payment.method,
              voucherType: POS_VOUCHER_TYPE.SALES,
              paymentType: POS_PAYMENT_TYPE.AGAINST_BILL,
              paymentNo: await getAndIncrementPrefix({
                branchId: response.branchId,
                companyId: response.companyId,
                prefixType: PREFIX_MODULES.RECEIPT,
                model: PosPaymentModel,
                fieldName: "paymentNo",
              }),
              createdBy: user?._id || null,
              updatedBy: user?._id || null,
            };
            await createOne(PosPaymentModel, paymentData);
          }
        }
      } else {
        const paymentData = {
          companyId: response.companyId,
          branchId: response.branchId,
          posOrderId: response._id,
          posCashRegisterId: response.posCashRegisterId,
          partyId: response.customerId,
          amount: paymentDiff,
          paymentMode: value.paymentMethod || PAYMENT_MODE.CASH,
          voucherType: POS_VOUCHER_TYPE.SALES,
          paymentType: POS_PAYMENT_TYPE.AGAINST_BILL,
          paymentNo: await getAndIncrementPrefix({
            branchId: response.branchId,
            companyId: response.companyId,
            prefixType: PREFIX_MODULES.RECEIPT,
            model: PosPaymentModel,
            fieldName: "paymentNo",
          }),
          createdBy: user?._id || null,
          updatedBy: user?._id || null,
        };
        await createOne(PosPaymentModel, paymentData);
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("POS Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deletePosOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deletePosOrderSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(PosOrderModel, { _id: value?.id, isDeleted: false }, {}, {});
    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Order"), {}, {}));
    }

    // Check if the associated cash register is closed
    if (isExist.posCashRegisterId) {
      const register = await PosCashRegisterModel.findById(isExist.posCashRegisterId);
      if (register && register.status === CASH_REGISTER_STATUS.CLOSED) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "This order cannot be deleted because its associated cash register has been closed.", {}, {}));
      }
    } else {
      // Fallback for orders without posCashRegisterId (Historical data)
      const register = await PosCashRegisterModel.findOne({
        companyId: isExist.companyId,
        branchId: isExist.branchId,
        createdAt: { $lte: isExist.createdAt },
        isDeleted: false,
      }).sort({ createdAt: -1 });

      if (register && register.status === CASH_REGISTER_STATUS.CLOSED) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "This order cannot be deleted because its associated cash register has been closed.", {}, {}));
      }
    }

    // Prevent deletion if return orders exist
    const hasReturns = await returnPosOrderModel.findOne({
      posOrderId: isExist._id,
      isDeleted: false,
    });
    if (hasReturns) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Cannot delete order with active returns. Please delete the return order first.", {}, {}));
    }

    // -----------------------------------------------------------
    // --- Stock Management Logic ---
    // Revert stock if the order was not cancelled
    if (isExist.status !== POS_ORDER_STATUS.CANCELLED) {
      for (const item of isExist.items) {
        let deductFromParent = false;
        let parentStockRatio = 1;
        if (item.variantId) {
          const product = await productModel.findById(item.productId).lean();
          if (product && product.variants) {
            const variant = product.variants.find((v: any) => v._id.toString() === item.variantId.toString()) as any;
            if (variant && variant.deductFromParent) {
              deductFromParent = true;
              parentStockRatio = variant.parentStockRatio || 1;
            }
          }
        }

        const stockMatchCriteria: any = {
          productId: item.productId,
          branchId: isExist.branchId,
          isDeleted: false,
        };
        if (deductFromParent) {
          stockMatchCriteria.variantId = { $exists: false };
        } else if (item.variantId) {
          stockMatchCriteria.variantId = item.variantId;
        } else {
          stockMatchCriteria.variantId = { $exists: false };
        }

        await stockModel.findOneAndUpdate(
          stockMatchCriteria,
          { $inc: { qty: item.qty * parentStockRatio } },
        );
      }
    }

    let response;
    if (isExist.status === POS_ORDER_STATUS.HOLD) {
      // if order status is hold then permanent delete it
      response = await PosOrderModel.deleteOne({
        _id: new ObjectId(value?.id),
      });
      // Also permanent delete any associated payments
      await PosPaymentModel.deleteMany({ posOrderId: new ObjectId(value?.id) });
    } else {
      // otherwise just softdelete it
      const payload = {
        isDeleted: true,
        updatedBy: user?._id || null,
      };
      response = await updateData(PosOrderModel, { _id: new ObjectId(value?.id) }, payload, {});

      // Soft delete associated payments
      await PosPaymentModel.updateMany({ posOrderId: new ObjectId(value?.id) }, { isDeleted: true, updatedBy: user?._id || null });
    }

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("POS Order"), {}, {}));
    }

    // --- Revert Coupon, Loyalty Campaign, and Redeem Credit ---
    if (isExist.couponId && isExist.customerId) {
      await revertCoupon(isExist.couponId, isExist.customerId);
    }
    if (isExist.discountId) {
      await revertDiscount(isExist.discountId.toString(), isExist.customerId?.toString());
    }
    if (isExist.loyaltyId && isExist.customerId) {
      await revertLoyalty(isExist.loyaltyId, isExist.customerId);
    }
    if (isExist.redeemCreditId && isExist.redeemCreditAmount > 0) {
      await revertRedeemCredit(isExist.redeemCreditId, isExist.redeemCreditType, isExist.redeemCreditAmount, isExist._id);
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("POS Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const posOrderDropDown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const { customerFilter, branchFilter, companyFilter, duePaymentFilter, search, returnableFilter, includeId } = req.query;

    let criteria: any = { isDeleted: false, isActive: true };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = new ObjectId(companyFilter as string);
    }
    if (branchId) {
      criteria.branchId = branchId;
    }
    if (branchFilter) {
      criteria.branchId = new ObjectId(branchFilter as string);
    }
    if (customerFilter) {
      criteria.customerId = new ObjectId(customerFilter as string);
    }

    if (duePaymentFilter === true || duePaymentFilter === "true") {
      criteria.dueAmount = { $gt: 0 };
    }

    if (search) {
      criteria.orderNo = { $regex: search, $options: "si" };
    }

    if (returnableFilter === true || returnableFilter === "true") {
      criteria.status = POS_ORDER_STATUS.COMPLETED;
    }

    criteria = handleIncludeId(criteria, includeId);

    const response = await PosOrderModel.find(criteria, {
      orderNo: 1,
      totalAmount: 1,
      dueAmount: 1,
      paidAmount: 1,
      customerId: 1,
      branchId: 1,
    })
      .populate([{ path: "branchId", select: "name" }])
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Order Dropdown"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllPosOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    let { page, limit, search, activeFilter, companyFilter, statusFilter, customerFilter, duePaymentFilter, paymentStatusFilter, methodFilter, branchFilter, tableNoFilter, orderTypeFilter, startDate, endDate, lastBillFilter, orderListFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (branchId) {
      criteria.branchId = branchId;
    }
    if (branchFilter) {
      criteria.branchId = new ObjectId(branchFilter);
    }
    if (customerFilter) {
      criteria.customerId = new ObjectId(customerFilter);
    }

    if (duePaymentFilter == "true") {
      criteria.dueAmount = { $gt: 0 };
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (search) {
      criteria.$or = [{ orderNo: { $regex: search, $options: "si" } }, { tableNo: { $regex: search, $options: "si" } }];
    }

    if (statusFilter) {
      criteria.status = statusFilter;
    }

    if (paymentStatusFilter) {
      criteria.paymentStatus = paymentStatusFilter;
    }

    if (methodFilter) {
      criteria["multiplePayments.method"] = methodFilter;
    }

    if (orderTypeFilter) {
      criteria.orderType = orderTypeFilter;
    }
    if (tableNoFilter) {
      criteria.tableNo = tableNoFilter;
    }

    if (orderListFilter == "true") {
      criteria.status = { $ne: POS_ORDER_STATUS.HOLD };
    }

    applyDateFilter(criteria, startDate as string, endDate as string);

    const options = {
      sort: { createdAt: -1 },
      ...(lastBillFilter === "true" && { limit: 1, skip: 0 }),
      populate: [
        { path: "branchId", select: "name" },
        { path: "companyId", select: "name" },
        { path: "salesManId", select: "fullName" },
        {
          path: "customerId",
          select: "firstName lastName companyName email phoneNo address.state",
          populate: [{ path: "address.state", select: "name" }],
        },
        { path: "items.productId", select: "name sku itemCode barcode barcodeType variants" },
        { path: "invoiceId", select: "documentNo" },
        { path: "additionalCharges.taxId", select: "name percentage" },
        { path: "additionalCharges.chargeId", select: "name" },
        { path: "posCashRegisterId", select: "registerNo status" },
        { path: "payLater.paymentTermsId", select: "name day" },
        { path: "createdBy", select: "fullName userType" },
      ],
      ...(lastBillFilter !== "true" && { skip: (page - 1) * limit, limit }),
    };

    const response = await getDataWithSorting(PosOrderModel, criteria, {}, options);

    const productIds: any = [...new Set(response.flatMap((order) => order?.items?.map((i) => i.productId?._id?.toString())))];

    const stockData = await stockModel
      .find(
        {
          productId: { $in: productIds },
          companyId: criteria.companyId,
          ...(criteria.branchId && { branchId: criteria.branchId }),
          isDeleted: false,
        },
        { productId: 1, variantId: 1, salesTaxId: 1, purchaseTaxId: 1, isSalesTaxIncluding: 1, isPurchaseTaxIncluding: 1 },
      )
      .populate("salesTaxId", "name percentage")
      .populate("purchaseTaxId", "name percentage");

    const taxMap = {};
    for (const s of stockData) {
      const variantIdStr = s.variantId ? s.variantId.toString() : "null";
      const key = `${s.productId.toString()}_${variantIdStr}`;
      taxMap[key] = { salesTaxId: s.salesTaxId, purchaseTaxId: s.purchaseTaxId, isSalesTaxIncluding: s.isSalesTaxIncluding, isPurchaseTaxIncluding: s.isPurchaseTaxIncluding };
    }

    response.forEach((order) => {
      order.items.forEach((item) => {
        const product = item.productId;
        if (!product) return;
        const variantIdStr = item.variantId ? item.variantId.toString() : "null";
        const key = `${product._id.toString()}_${variantIdStr}`;
        const tax = taxMap[key];

        const updatedProduct = {
          ...product,
          salesTaxId: tax?.salesTaxId || null,
          purchaseTaxId: tax?.purchaseTaxId || null,
          isSalesTaxIncluding: tax?.isSalesTaxIncluding ?? null,
          isPurchaseTaxIncluding: tax?.isPurchaseTaxIncluding ?? null,
          variantId: item.variantId || null,
        };

        const matchedVariant = item.variantId
          ? (product.variants || []).find((v: any) => v._id.toString() === item.variantId.toString())
          : null;

        if (matchedVariant) {
          updatedProduct.name = `${product.name} - ${matchedVariant.name}`;
          if (matchedVariant.sku) updatedProduct.sku = matchedVariant.sku;
          if (matchedVariant.itemCode) updatedProduct.itemCode = matchedVariant.itemCode;
          if (matchedVariant.barcode) updatedProduct.barcode = matchedVariant.barcode;
          if (matchedVariant.barcodeType) updatedProduct.barcodeType = matchedVariant.barcodeType;
          updatedProduct.isActive = matchedVariant.isActive ?? updatedProduct.isActive;
          if (matchedVariant.attributes) updatedProduct.attributes = matchedVariant.attributes;
        }

        item.productId = updatedProduct;
      });
    });

    const totalData = await countData(PosOrderModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Order"), { posOrder_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOnePosOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getPosOrderSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      PosOrderModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "branchId", select: "name" },
          { path: "companyId", select: "name" },
          { path: "salesManId", select: "fullName" },
          {
            path: "customerId",
            select: "firstName lastName companyName email phoneNo",
          },
          {
            path: "items.productId",
            select: "-isDeleted -isActive -createdAt -updatedAt -createdBy -updatedBy -images -nutrition",
            populate: [
              { path: "brandId", select: "name" },
              { path: "categoryId", select: "name" },
            ],
          },
          { path: "invoiceId", select: "documentNo" },
          { path: "additionalCharges.taxId", select: "name percentage" },
          { path: "additionalCharges.chargeId", select: "name" },
          { path: "posCashRegisterId", select: "name status" },
          { path: "payLater.paymentTermsId", select: "name day" },
          { path: "createdBy", select: "fullName userType" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Order"), {}, {}));
    }

    const productIds = response?.items?.map((item) => item?.productId?._id);

    const stockResponse = await getDataWithSorting(
      stockModel,
      {
        isDeleted: false,
        isActive: true,
        companyId: response?.companyId,
        branchId: response?.branchId,
        productId: { $in: productIds },
      },
      {
        productId: 1,
        variantId: 1,
        qty: 1,
        mrp: 1,
        sellingDiscount: 1,
        sellingPrice: 1,
        sellingMargin: 1,
        landingCost: 1,
        purchasePrice: 1,
        purchaseTaxId: 1,
        salesTaxId: 1,
        isPurchaseTaxIncluding: 1,
        isSalesTaxIncluding: 1,
      },
      {
        sort: { updatedAt: -1 },
        populate: [
          { path: "purchaseTaxId", select: "name percentage" },
          { path: "salesTaxId", select: "name percentage" },
          { path: "uomId", select: "name code" },
        ],
      },
    );

    const stockMap = stockResponse.reduce((acc, stock) => {
      const variantIdStr = stock.variantId ? stock.variantId.toString() : "null";
      const key = `${stock.productId.toString()}_${variantIdStr}`;
      acc[key] = stock;
      return acc;
    }, {});

    const updatedResponse = {
      ...response,
      items: response.items.map((item) => {
        const product = item.productId;
        if (product && product._id) {
          const variantIdStr = item.variantId ? item.variantId.toString() : "null";
          const stockKey = `${product._id.toString()}_${variantIdStr}`;
          const stock = stockMap[stockKey];

          const matchedVariant = item.variantId
            ? (product.variants || []).find((v: any) => v._id.toString() === item.variantId.toString())
            : null;

          const updatedProduct = {
            ...product,
            qty: stock?.qty ?? 0,
            purchasePrice: stock?.purchasePrice ?? (matchedVariant ? (matchedVariant.purchasePrice ?? 0) : product.purchasePrice),
            landingCost: stock?.landingCost ?? product.landingCost,
            mrp: stock?.mrp ?? (matchedVariant ? (matchedVariant.mrp ?? 0) : product.mrp),
            sellingPrice: stock?.sellingPrice ?? (matchedVariant ? (matchedVariant.sellingPrice ?? 0) : product.sellingPrice),
            sellingDiscount: stock?.sellingDiscount ?? product.sellingDiscount,
            sellingMargin: stock?.sellingMargin ?? product.sellingMargin,
            purchaseTaxId: stock?.purchaseTaxId,
            salesTaxId: stock?.salesTaxId,
            isPurchaseTaxIncluding: stock?.isPurchaseTaxIncluding,
            isSalesTaxIncluding: stock?.isSalesTaxIncluding,
            uomId: stock?.uomId,
            variantId: item.variantId || null,
          };

          if (matchedVariant) {
            updatedProduct.name = `${product.name} - ${matchedVariant.name}`;
            if (matchedVariant.sku) updatedProduct.sku = matchedVariant.sku;
            if (matchedVariant.itemCode) updatedProduct.itemCode = matchedVariant.itemCode;
            if (matchedVariant.barcode) updatedProduct.barcode = matchedVariant.barcode;
            if (matchedVariant.barcodeType) updatedProduct.barcodeType = matchedVariant.barcodeType;
            updatedProduct.isActive = matchedVariant.isActive ?? updatedProduct.isActive;
            if (matchedVariant.attributes) updatedProduct.attributes = matchedVariant.attributes;
          }

          item.productId = updatedProduct;
        }
        return item;
      }),
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Order"), updatedResponse, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllHoldOrders = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const { search } = req.query;

    let criteria: any = { isDeleted: false, status: POS_ORDER_STATUS.HOLD };
    if (companyId) {
      criteria.companyId = companyId;
    }
    const branchId = user?.branchId?._id;
    if (branchId) {
      criteria.branchId = branchId;
    }

    if (search) {
      criteria.$or = [{ orderNo: { $regex: search, $options: "si" } }, { customerName: { $regex: search, $options: "si" } }, { tableNo: { $regex: search, $options: "si" } }];
    }

    const options = {
      sort: { holdDate: -1 },
      populate: [
        { path: "branchId", select: "name" },
        { path: "companyId", select: "name" },
        { path: "salesManId", select: "fullName" },
        { path: "customerId", select: "firstName lastName companyName phoneNo" },
        { path: "posCashRegisterId", select: "registerNo status" },
        { path: "payLater.paymentTermsId", select: "name day" },
        {
          path: "items.productId",
          select: "-isDeleted -isActive -createdAt -updatedAt -createdBy -updatedBy -images -nutrition",
        },
        { path: "createdBy", select: "fullName userType" },
      ],
      limit: 100,
    };
    const response = await getDataWithSorting(PosOrderModel, criteria, {}, options);

    const productIds = response?.map((order) => order?.items?.map((item) => item?.productId?._id)).flat();

    const stockResponse = await getDataWithSorting(
      stockModel,
      {
        isDeleted: false,
        isActive: true,
        companyId: criteria.companyId,
        ...(criteria.branchId && { branchId: criteria.branchId }),
        productId: { $in: productIds },
      },
      {
        productId: 1,
        variantId: 1,
        qty: 1,
        mrp: 1,
        sellingDiscount: 1,
        sellingPrice: 1,
        sellingMargin: 1,
        landingCost: 1,
        purchasePrice: 1,
        purchaseTaxId: 1,
        salesTaxId: 1,
        isPurchaseTaxIncluding: 1,
        isSalesTaxIncluding: 1,
      },
      {
        sort: { updatedAt: -1 },
        populate: [
          { path: "purchaseTaxId", select: "name percentage" },
          { path: "salesTaxId", select: "name percentage" },
          { path: "uomId", select: "name code" },
        ],
      },
    );

    const stockMap = stockResponse.reduce((acc, stock) => {
      const variantIdStr = stock.variantId ? stock.variantId.toString() : "null";
      const key = `${stock.productId.toString()}_${variantIdStr}`;
      acc[key] = stock;
      return acc;
    }, {});

    const updatedResponse = response.map((order) => {
      if (order.items) {
        order.items = order.items.map((item) => {
          const product = item.productId;
          if (product && product._id) {
            const variantIdStr = item.variantId ? item.variantId.toString() : "null";
            const stockKey = `${product._id.toString()}_${variantIdStr}`;
            const stock = stockMap[stockKey];

            const matchedVariant = item.variantId
              ? (product.variants || []).find((v: any) => v._id.toString() === item.variantId.toString())
              : null;

            const updatedProduct = {
              ...product,
              qty: stock?.qty ?? 0,
              purchasePrice: stock?.purchasePrice ?? (matchedVariant ? (matchedVariant.purchasePrice ?? 0) : product.purchasePrice),
              landingCost: stock?.landingCost ?? product.landingCost,
              mrp: stock?.mrp ?? (matchedVariant ? (matchedVariant.mrp ?? 0) : product.mrp),
              sellingPrice: stock?.sellingPrice ?? (matchedVariant ? (matchedVariant.sellingPrice ?? 0) : product.sellingPrice),
              sellingDiscount: stock?.sellingDiscount ?? product.sellingDiscount,
              sellingMargin: stock?.sellingMargin ?? product.sellingMargin,
              purchaseTaxId: stock?.purchaseTaxId,
              salesTaxId: stock?.salesTaxId,
              isPurchaseTaxIncluding: stock?.isPurchaseTaxIncluding,
              isSalesTaxIncluding: stock?.isSalesTaxIncluding,
              uomId: stock?.uomId,
              variantId: item.variantId || null,
            };

            if (matchedVariant) {
              updatedProduct.name = `${product.name} - ${matchedVariant.name}`;
              if (matchedVariant.sku) updatedProduct.sku = matchedVariant.sku;
              if (matchedVariant.itemCode) updatedProduct.itemCode = matchedVariant.itemCode;
              if (matchedVariant.barcode) updatedProduct.barcode = matchedVariant.barcode;
              if (matchedVariant.barcodeType) updatedProduct.barcodeType = matchedVariant.barcodeType;
              updatedProduct.isActive = matchedVariant.isActive ?? updatedProduct.isActive;
              if (matchedVariant.attributes) updatedProduct.attributes = matchedVariant.attributes;
            }

            item.productId = updatedProduct;
          }
          return item;
        });
      }
      return order;
    });

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Hold Orders"), updatedResponse, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getShortHoldOrders = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const { search, companyFilter, branchFilter } = req.query;

    let criteria: any = { isDeleted: false, status: POS_ORDER_STATUS.HOLD };
    if (companyId) {
      criteria.companyId = companyId;
    }
    if (companyFilter) {
      criteria.companyId = new ObjectId(companyFilter);
    }
    if (branchId) {
      criteria.branchId = branchId;
    }
    if (branchFilter) {
      criteria.branchId = new ObjectId(branchFilter);
    }

    if (search) {
      criteria.$or = [{ orderNo: { $regex: search, $options: "si" } }, { customerName: { $regex: search, $options: "si" } }, { tableNo: { $regex: search, $options: "si" } }];
    }

    const options = {
      sort: { holdDate: -1 },
      populate: [
        { path: "customerId", select: "firstName lastName phoneNo " },
        { path: "branchId", select: "name" },
      ],
      limit: 100,
    };

    const selectedFields = { orderNo: 1, holdDate: 1, totalAmount: 1, customerId: 1, createdAt: 1, branchId: 1 };

    const response = await getDataWithSorting(PosOrderModel, criteria, selectedFields, options);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Hold Orders"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getCustomerPosDetails = async (req, res) => {
  try {
    reqInfo(req);

    const { error, value } = getCustomerPosDetailsSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }
    const { id } = value;

    const select = "firstName lastName  email phoneNo whatsappNo productDetails loyaltyPoints remarks status";

    const customer = await getFirstMatch(contactModel, { _id: id, isDeleted: false }, select, {});
    if (!customer) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Customer"), {}, {}));
    }

    const posOrders = await getDataWithSorting(PosOrderModel, { customerId: id, isDeleted: false }, {}, { sort: { createdAt: -1 } });

    const totalDueAmount = posOrders.reduce((acc, item) => acc + Number(item.dueAmount || 0), 0);
    const totalPaidAmount = posOrders.reduce((acc, item) => acc + Number(item.paidAmount || 0), 0);
    const totalPurchaseAmount = posOrders.reduce((acc, item) => acc + Number(item.totalAmount || 0), 0);

    const { totalAmount = 0, orderNo = "-", _id = "-", paymentMethod = "-", createdAt = "-" } = posOrders?.[0] ?? {};

    const lastBill = { _id, totalAmount, orderNo, paymentMethod, createdAt };

    const allPurchasedProduct = posOrders.reduce((acc, item) => {
      const product = item.items?.[0];
      if (product) {
        acc[product.productId] = (acc[product.productId] || 0) + 1;
      }
      return acc;
    }, {});

    const mostPurchasedProductId = Object.keys(allPurchasedProduct).reduce((maxProductId, productId) => {
      if (!maxProductId || allPurchasedProduct[productId] > allPurchasedProduct[maxProductId]) {
        return productId;
      }
      return maxProductId;
    }, null);

    let mostPurchasedProduct;
    if (mostPurchasedProductId) {
      mostPurchasedProduct = await getFirstMatch(productModel, { _id: mostPurchasedProductId, isDeleted: false }, "name", {});
    }

    return res.status(HTTP_STATUS.OK).json(
      new apiResponse(
        HTTP_STATUS.OK,
        responseMessage?.getDataSuccess("Customer POS Details"),
        {
          customer,
          totalDueAmount,
          totalPaidAmount,
          totalPurchaseAmount,
          lastBill,
          mostPurchasedProduct,
        },
        {},
      ),
    );
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const releasePosOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = releasePosOrderSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(PosOrderModel, { _id: value?.posOrderId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Order"), {}, {}));
    }

    // Check if the associated cash register is closed
    if (isExist.posCashRegisterId) {
      const register = await PosCashRegisterModel.findById(isExist.posCashRegisterId);
      if (register && register.status === CASH_REGISTER_STATUS.CLOSED) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "This order cannot be released because its associated cash register has been closed.", {}, {}));
      }
    } else {
      // Fallback for orders without posCashRegisterId (Historical data)
      const register = await PosCashRegisterModel.findOne({
        companyId: isExist.companyId,
        branchId: isExist.branchId,
        createdAt: { $lte: isExist.createdAt },
        isDeleted: false,
      }).sort({ createdAt: -1 });

      if (register && register.status === CASH_REGISTER_STATUS.CLOSED) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "This order cannot be released because its associated cash register has been closed.", {}, {}));
      }
    }

    if (isExist.status !== POS_ORDER_STATUS.HOLD) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Order is not on hold", {}, {}));
    }

    const payload = {
      status: POS_ORDER_STATUS.PENDING,
      updatedBy: user?._id || null,
    };

    const response = await updateData(PosOrderModel, { _id: value?.posOrderId }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("POS Order"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "POS Order released from hold successfully", response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const festivalAnalytics = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id || user?.companyId;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Start date and End date are required", {}, {}));
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const criteria: any = {
      isDeleted: false,
      companyId,
      status: { $ne: POS_ORDER_STATUS.CANCELLED },
      createdAt: { $gte: start, $lte: end }
    };

    const orders = await PosOrderModel.find(criteria)
      .populate("customerId")
      .populate("items.productId")
      .lean();

    let totalSales = 0;
    const customerMap = new Map();
    const productQtyMap = new Map();

    for (const order of orders) {
      totalSales += order.totalAmount || 0;

      if (order.customerId) {
        const custId = order.customerId._id.toString();
        if (!customerMap.has(custId)) {
          customerMap.set(custId, {
            _id: order.customerId._id,
            name: `${order.customerId.firstName} ${order.customerId.lastName || ""}`.trim(),
            phone: order.customerId.phoneNo ? `${order.customerId.phoneNo.countryCode}-${order.customerId.phoneNo.phoneNo}` : "-",
            whatsapp: order.customerId.whatsappNo ? `${order.customerId.whatsappNo.countryCode}-${order.customerId.whatsappNo.phoneNo}` : "-",
          });
        }
      }

      if (order.items) {
        for (const item of order.items) {
          if (item.productId) {
            const prodId = item.productId._id.toString();
            const current = productQtyMap.get(prodId) || { name: item.productId.name, qty: 0 };
            current.qty += item.qty || 0;
            productQtyMap.set(prodId, current);
          }
        }
      }
    }

    const customers = Array.from(customerMap.values());
    const topProducts = Array.from(productQtyMap.values())
      .sort((a: any, b: any) => b.qty - a.qty)
      .slice(0, 5);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Festival analytics retrieved successfully", {
      totalSales,
      ordersCount: orders.length,
      customers,
      topProducts
    }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
  }
};



