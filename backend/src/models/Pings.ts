import { model, Schema, ObjectId } from "mongoose";

export default model("pings_new", new Schema({
    timestamp: {
        type: Number,
        required: true
    },
    data: {
        type: Object,
        required: true,
        default: {}
        //serverId : playerCount
    }
}).index({ timestamp: 1 }));
