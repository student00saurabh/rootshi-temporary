const { boolean } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const teacherSchema = new Schema({
  teacher: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  courses: [
    {
      type: Schema.Types.ObjectId,
      ref: "Cources",
    },
  ],
  description: {
    type: String,
    required: true,
  },
  ratting: {
    type: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  profession: {
    type: String,
  },
  about: {
    type: String,
  },
  experiance: {
    type: String,
  },
  priviousOrganisation: {
    type: String,
  },
  salary: {
    type: Number,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Teacher", ratingSchema);
