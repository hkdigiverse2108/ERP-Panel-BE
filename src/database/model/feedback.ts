import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IFeedback } from "../../types";

const feedbackSchema = new Schema<IFeedback>({
    ...baseSchemaFields,
    orderId: { type: Schema.Types.ObjectId, ref: 'pos-order' },
    customerId: { type: Schema.Types.ObjectId, ref: 'contact' },
    rating: { type: Number, required: true },
    comment: { type: String },
    isRecommended: { type: Boolean, default: false }
}, baseSchemaOptions);

export const feedbackModel = mongoose.model<IFeedback>('feedback', feedbackSchema);