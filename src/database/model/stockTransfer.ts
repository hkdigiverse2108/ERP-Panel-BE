import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions, baseCommonFields } from "./base";
import { IStockTransfer } from "../../types/stockTransfer";

import { STOCK_TRANSFER_STATUS } from "../../common";

const ObjectId = Schema.Types.ObjectId;

const stockTransferSchema = new Schema<IStockTransfer>(
  {
    ...baseSchemaFields, // companyId, branchId (implicitly can be used for secondary scoping)
    transferNo: { type: String, index: true },

    requestedByBranchId: { type: ObjectId, ref: "branch", required: true },
    requestedToBranchId: { type: ObjectId, ref: "branch", required: true },

    status: {
      type: String,
      enum: Object.values(STOCK_TRANSFER_STATUS),
      default: STOCK_TRANSFER_STATUS.PENDING,
    },

    items: [
      {
        productId: { type: ObjectId, ref: "product", required: true },
        price: { type: Number, default: 0 },
        requestedQty: { type: Number, required: true }, // what A asked
        approvedQty: { type: Number, default: 0 }, // what B approved
        receivedQty: { type: Number, default: 0 }, // what A actually received
        _id: false,
      },
    ],

    requestNote: { type: String },
    approvalNote: { type: String },
    receiptNote: { type: String },

    // Tracking
    approvedBy: { type: ObjectId, ref: "user" },
    approvedAt: { type: Date },
    receivedBy: { type: ObjectId, ref: "user" },
    receivedAt: { type: Date },

    ...baseCommonFields,
  },
  baseSchemaOptions,
);

export const stockTransferModel = mongoose.model<IStockTransfer>("stock-transfer", stockTransferSchema);
