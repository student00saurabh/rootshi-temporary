const { boolean } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const courcesSchema = new Schema({
  teacher: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },

  students: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      enrolledAt: {
        type: Date,
        default: Date.now,
      },
      paidPrice: {
        type: Number,
        required: true,
      },
      description: {
        type: String,
      },
      isSeen: {
        type: Boolean,
        default: false,
      },
    },
  ],
  image: {
    url: String,
    filename: String,
  },

  title: {
    type: String,
    required: true,
  },
  shortDescription: {
    type: String,
    required: true,
  },
  discription: {
    type: String,
  },
  tableOfContent: [
    {
      tile: {
        type: String,
      },
      duration: {
        type: Number,
      },
    },
  ],
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
  duration: {
    type: Number,
  },
  lounchedDate: {
    type: Date,
  },
  addInHomePage: {
    type: Boolean,
    default: false,
  },
  isPopular: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("Cources", courcesSchema);
