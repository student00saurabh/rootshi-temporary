const User = require("../models/user");
const Contact = require("../models/contact");

module.exports.contact = async (req, res) => {
  try {
  } catch (error) {
    console.log(error);
    req.flash("error", "Something went wrong!");
    res.redirect("/login");
  }
};
