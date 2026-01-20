const express = require("express");
const router = express.Router();
const { isLoggedIn, isAdmin } = require("../middleware");
const adminController = require("../controllers/admin.js");
const multer = require("multer");

const { cloudinary, storage } = require("../Cloudconfig.js");
const upload = multer({ storage });

// router.route("/login").get(userController.renderLoginForm);
router.get("/", isLoggedIn, isAdmin, adminController.index);

module.exports = router;
