const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const {
  saveRedirectUrl,
  isVerified,
  isLoggedIn,
  isAdmin,
} = require("../middleware.js");
const multer = require("multer");
const upload = multer();
const userController = require("../controllers/users.js");

// signup GET
//Signup POST
router
  .route("/signup")
  .get(userController.renderSignupForm)
  .post(wrapAsync(userController.signup));

//Login GET
//Login POST
router
  .route("/login")
  .get(userController.renderLoginForm)
  .post(
    isVerified,
    saveRedirectUrl,
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    userController.login,
  );

router.get("/logout", userController.logout);

router.post("/verify/:id/resend", userController.resendOtp);
router.get("/verify-email", userController.renderVerifyEmailForm);
router.post("/verify/:id", userController.verifyEmail);

router.get("/profile", isLoggedIn, userController.profile);
router.post(
  "/profile/update",
  upload.none(),
  isLoggedIn,
  userController.updateProfile,
);
router.post(
  "/profile/change-password",
  isLoggedIn,
  userController.changePassword,
);
router.get(
  "/profile/enrollments",
  isLoggedIn,
  userController.enrollmentHistory,
);

router.get("/my-courses", isLoggedIn, userController.myCourses);
router.get("/certificates", isLoggedIn, userController.myCertificates);

// Generate certificate SVG
// router.get(
//   "/certificates/:id/svg",
//   isLoggedIn,
//   userController.generateCertificateSVG,
// );

// In your routes file
router.post(
  "/certificate/issue",
  isLoggedIn,
  isAdmin,
  userController.issueCertificate,
);

// Download certificate as image
router.get(
  "/certificates/:id/download/image",
  isLoggedIn,
  userController.downloadCertificateImage,
);

// Download certificate as PDF
router.get(
  "/certificates/:id/download/pdf",
  isLoggedIn,
  userController.downloadCertificatePDF,
);

module.exports = router;
