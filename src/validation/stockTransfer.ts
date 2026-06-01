import Joi from "joi";
import { baseApiSchema, objectId } from "./common";

export const addStockTransferSchema = Joi.object().keys({
  requestedToBranchId: objectId().required(),
  requestNote: Joi.string().allow("", null).optional(),
  items: Joi.array()
    .items(
      Joi.object().keys({
        productId: objectId().required(),
        variantId: objectId().optional().allow(null),
        price: Joi.number().min(0).optional(),
        requestedQty: Joi.number().min(0.001).required(),
      }),
    )
    .min(1)
    .required(),
  ...baseApiSchema,
});

export const approveStockTransferSchema = Joi.object().keys({
  stockTransferId: objectId().required(),
  approvalNote: Joi.string().allow("", null).optional(),
  items: Joi.array()
    .items(
      Joi.object().keys({
        productId: objectId().required(),
        variantId: objectId().optional().allow(null),
        price: Joi.number().min(0).optional(),
        approvedQty: Joi.number().min(0).required(),
      }),
    )
    .min(1)
    .required(),
  ...baseApiSchema,
});

export const editStockTransferSchema = Joi.object().keys({
  stockTransferId: objectId().required(),
  requestedToBranchId: objectId().optional(),
  requestNote: Joi.string().allow("", null).optional(),
  items: Joi.array()
    .items(
      Joi.object().keys({
        productId: objectId().required(),
        variantId: objectId().optional().allow(null),
        price: Joi.number().min(0).optional(),
        requestedQty: Joi.number().min(0.001).required(),
      }),
    )
    .min(1)
    .optional(),
  ...baseApiSchema,
});


export const confirmReceiptStockTransferSchema = Joi.object().keys({
  stockTransferId: objectId().required(),
  receiptNote: Joi.string().allow("", null).optional(),
  items: Joi.array()
    .items(
      Joi.object().keys({
        productId: objectId().required(),
        variantId: objectId().optional().allow(null),
        receivedQty: Joi.number().min(0).required(),
      }),
    )
    .min(1)
    .required(),
  ...baseApiSchema,
});

export const dispatchStockTransferSchema = Joi.object().keys({
  stockTransferId: objectId().required(),
  ...baseApiSchema,
});

export const rejectStockTransferSchema = Joi.object().keys({
  stockTransferId: objectId().required(),
  approvalNote: Joi.string().allow("", null).optional(),
  ...baseApiSchema,
});

export const cancelStockTransferSchema = Joi.object().keys({
  stockTransferId: objectId().required(),
  requestNote: Joi.string().allow("", null).optional(),
  ...baseApiSchema,
});

export const getStockTransferSchema = Joi.object().keys({
  id: objectId().required(),
});

export const deleteStockTransferSchema = Joi.object().keys({
  id: objectId().required(),
});
