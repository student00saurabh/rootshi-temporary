const mongoose = require("mongoose");
const User = require("../models/user.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/rootshield";

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
  try {
    const users = await User.findOneAndDelete({
      email: "thecubicals123@gmail.com",
    });
    console.log("Admin user removed", users);
  } catch {
    console.log("Error in checking admin user");
  }
};

initDB();
