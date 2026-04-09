import Joi from "joi";
import { baseApiSchema, objectId } from "./common";

export const addStockTransferSchema = Joi.object().keys({
  requestedToBranchId: objectId().required(),
  requestNote: Joi.string().allow("", null).optional(),
  items: Joi.array()
    .items(
      Joi.object().keys({
        productId: objectId().required(),
        price: Joi.number().min(0).optional(),
        requestedQty: Joi.number().min(0.001).required(),
      }),
    )
    .min(1)
    .required(),
  ...baseApiSchema,
});

export const approveStockTransferSchema = Joi.object().keys({
  transferId: objectId().required(),
  approvalNote: Joi.string().allow("", null).optional(),
  items: Joi.array()
    .items(
      Joi.object().keys({
        productId: objectId().required(),
        price: Joi.number().min(0).optional(),
        approvedQty: Joi.number().min(0).required(),
      }),
    )
    .min(1)
    .required(),
  ...baseApiSchema,
});


export const confirmReceiptStockTransferSchema = Joi.object().keys({
  transferId: objectId().required(),
  receiptNote: Joi.string().allow("", null).optional(),
  items: Joi.array()
    .items(
      Joi.object().keys({
        productId: objectId().required(),
        receivedQty: Joi.number().min(0).required(),
      }),
    )
    .min(1)
    .required(),
  ...baseApiSchema,
});

export const rejectStockTransferSchema = Joi.object().keys({
  transferId: objectId().required(),
  approvalNote: Joi.string().allow("", null).optional(),
  ...baseApiSchema,
});

export const cancelStockTransferSchema = Joi.object().keys({
  transferId: objectId().required(),
  requestNote: Joi.string().allow("", null).optional(),
  ...baseApiSchema,
});

export const getStockTransferSchema = Joi.object().keys({
  id: objectId().required(),
});

export const deleteStockTransferSchema = Joi.object().keys({
  id: objectId().required(),
});
