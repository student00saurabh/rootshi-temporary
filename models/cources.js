const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const courcesSchema = new Schema({
  teacher: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  title: {
    type: String,
    required: true,
  },
  shortDescription: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  actualPrice: {
    type: Number,
    required: true,
  },
  courceType: {
    type: String,
    enum: [
      "CYBERSECURITY",
      "WEB DEV",
      "ADVANCED",
      "MACHINE LEARNING",
      "ETHICAL HACKING",
      "DATA SCIENCE",
      "ARTIFICIAL INTELLIGENCE",
      "other",
    ],
    required: true,
  },

  message: {
    type: String,
  },
  msgDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  gps: {
    latitude: Number,
    longitude: Number,
  },
});

module.exports = mongoose.model("Cources", courcesSchema);
