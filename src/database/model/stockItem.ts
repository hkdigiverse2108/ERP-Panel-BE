import mongoose, { Schema } from "mongoose";

const stockItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product", required: true },
    itemCode: { type: String, required: true },
    batchId: { type: Schema.Types.ObjectId, ref: "batch", required: true },

    landingCost: { type: Number, required: true },
    price: { type: Number, required: true },
    mrp: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },

    systemQty: { type: Number, required: true },
    physicalQty: { type: Number, required: true },

    differenceQty: { type: Number, required: true },
    differenceAmount: { type: Number, required: true },
  },
  { _id: false },
);

const stockAdjustmentSchema = new Schema<any>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "company", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "branch", required: true },

    departmentId: { type: Schema.Types.ObjectId, ref: "department" },
    categoryId: { type: Schema.Types.ObjectId, ref: "category" },
    brandId: { type: Schema.Types.ObjectId, ref: "brand" },

    focusOn: {
      type: String,
      enum: ["PhysicalQty", "SystemQty"],
      required: true,
    },

    remark: { type: String },

    items: { type: [stockItemSchema], required: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "employee" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "employee" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const stockAdjustmentModel = mongoose.model("stock-adjustment", stockAdjustmentSchema);
