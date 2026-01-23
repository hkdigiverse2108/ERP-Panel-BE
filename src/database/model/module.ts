const mongoose = require('mongoose')

const moduleSchema: any = new mongoose.Schema({
    tabName: { type: String },
    displayName: { type: String, default: null },
    tabUrl: { type: String },
    number: { type: Number, default: 0 },
    hasView: { type: Boolean, default: false },
    hasAdd: { type: Boolean, default: false },
    hasEdit: { type: Boolean, default: false },
    hasDelete: { type: Boolean, default: false },
    default: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    parentId: { type: mongoose.Schema.Types.ObjectId, default: null, ref: "module" },
}, { timestamps: true, versionKey: false })

export const moduleModel = mongoose.model('module', moduleSchema);