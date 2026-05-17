#!/usr/bin/env node
const mongoose = require("mongoose");
if (process.env.NODE_ENV !== "production") require("dotenv").config();

const uri =
  process.env.MONGO_URL ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/rootshield";

(async () => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
    const coll = mongoose.connection.collection("certificates");
    const indexes = await coll.indexes();
    console.log("Current indexes:");
    console.dir(indexes, { depth: null });

    const target = indexes.find(
      (i) => i.key && i.key.course === 1 && i.key.student === 1,
    );
    if (!target) {
      console.log(
        "No index with keys {course:1, student:1} found — nothing to drop.",
      );
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log("Found index:", target.name);
    if (
      target.partialFilterExpression &&
      target.partialFilterExpression.course
    ) {
      console.log("Index already partial/filtered. No drop required.");
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log("Dropping index", target.name);
    await coll.dropIndex(target.name);
    console.log("Index dropped.");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error while dropping index:", err);
    try {
      await mongoose.disconnect();
    } catch (e) {}
    process.exit(1);
  }
})();
