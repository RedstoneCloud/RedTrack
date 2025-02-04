import { model, Schema } from "mongoose";

export default model("servers", new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    ip: {
        type: String,
        required: true
    },
    port: {
        type: Number,
        required: true,
        default: 19132
    },
    color: {
        type: String,
        required: true,
        default: () => `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
    }
}));