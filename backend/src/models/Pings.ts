import { model, Schema, ObjectId } from "mongoose";

export default model("pings", new Schema({
    server: {
        type: String, //ObjectId
        required: true
    },
    timestamp: {
        type: Number,
        required: true,
        default: Math.floor(Date.now()) //UNIX Timestamp
    },
    playerCount: {
        type: Number,
        required: true,
        default: -1 //<0=server offline
    }
}));