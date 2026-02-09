import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { PAYLATER_STATUS } from "../../common";

const payLaterSchema = new Schema(
  {
    ...baseSchemaFields,

    customerId: {
      type: Schema.Types.ObjectId,
      ref: "contact",
      index: true,
    },

    posOrderId: {
      type: Schema.Types.ObjectId,
      ref: "pos-order",
      index: true,
    },

    totalAmount: { type: Number },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number },

    status: {
      type: String,
      enum: Object.values(PAYLATER_STATUS),
      default: PAYLATER_STATUS.OPEN,
    },

    dueDate: { type: Date },
    note: { type: String },
    sendReminder: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);

export const PayLaterModel = mongoose.model("pay-later", payLaterSchema);
