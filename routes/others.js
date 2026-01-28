const express = require("express");
const router = express.Router();
const othersController = require("../controllers/others");

router.post("/contact", othersController.contact);

module.exports = router;
