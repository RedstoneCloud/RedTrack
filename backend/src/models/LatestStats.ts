import { model, Schema } from "mongoose";

export default model("latest_stats", new Schema({
    serverId: {
        type: String,
        required: true,
        unique: true
    },
    latestCount: {
        type: Number,
        required: true
    },
    latestTimestamp: {
        type: Number,
        required: true
    },
    dayKey: {
        type: String,
        required: true
    },
    dailyPeak: {
        type: Number,
        required: true
    },
    dailyPeakTimestamp: {
        type: Number,
        required: true
    },
    record: {
        type: Number,
        required: true
    },
    recordTimestamp: {
        type: Number,
        required: true
    }
}).index({ serverId: 1 }));
