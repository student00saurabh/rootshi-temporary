const crypto = require("crypto");
const User = require("../models/user.js");

// Load .env in development
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// ─────────────────────────────────────────
// RENDER EMAIL FORM
// ─────────────────────────────────────────
module.exports.restform = async (req, res) => {
  res.render("emailer/emailSent.ejs", {
    message: "Enter an existing email id!",
    alertmsg: false,
  });
};

// ─────────────────────────────────────────
// FORGOT PASSWORD → GENERATE LINK + SEND EMAIL
// ─────────────────────────────────────────
module.exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.render("emailer/emailSent.ejs", {
        message: "Make sure, this is a correct email id!",
        alertmsg: true,
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Auto-detect domain
    const domain =
      process.env.DOMAIN ||
      (process.env.NODE_ENV === "production"
        ? "https://rootshield.in"
        : "http://localhost:3000");
    const resetLink = `${domain}/reset-password/${token}`;

    // ─────────────────────────────────────────
    // BREVO CONFIG
    // ─────────────────────────────────────────
    const brevo = require("@getbrevo/brevo");
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY,
    );

    // EMAIL HTML
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; padding:20px; background:#f7f7f7; border-radius:8px;">
        <div style="text-align:center; margin-bottom:20px;">
          <img src="https://thecubicals.online/images/logo.png" style="height:50px;">
        </div>
        <h2 style="color:#1A2B4C;">Reset Your Password</h2>
        <p>Hello <strong>${user.name || user.username || "User"}</strong>,</p>
        <p>We received a request to reset your password on <b>TheCubicals</b>.</p>
        <div style="text-align:center; margin:30px 0;">
          <a href="${resetLink}" style="background:#A23E48; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; font-size:16px;">
            Reset Password
          </a>
        </div>
        <p>This link will expire in <strong>1 hour</strong>.</p>
        <p>If the button does not work, use this link:</p>
        <p><a href="${resetLink}" style="color:#1A2B4C;">${resetLink}</a></p>
        <hr style="border:none; border-top:1px solid #ccc; margin:30px 0;">
        <p style="font-size:12px; color:#777;">This is an automated message. Please do not reply directly.</p>
      </div>
    `;

    // SEND EMAIL
    await apiInstance.sendTransacEmail({
      sender: { email: "info@rootshield.in", name: "RootShield" },
      to: [{ email: user.email }],
      subject: "Reset Your Password | RootShield",
      htmlContent: htmlContent,
    });

    req.flash("success", "Password reset link has been sent to your email.");
    return res.redirect("/login");
  } catch (err) {
    console.error("Brevo Email Error:", err);
    req.flash("error", "Error sending email. Try again.");
    return res.redirect("/login");
  }
};

// ─────────────────────────────────────────
// SHOW RESET PAGE
// ─────────────────────────────────────────
module.exports.getResetPassword = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    req.flash("error", "Reset link is invalid or expired");
    return res.redirect("/login");
  }

  res.render("emailer/reset.ejs", { token: req.params.token });
};

// ─────────────────────────────────────────
// RESET PASSWORD FINAL SUBMIT
// ─────────────────────────────────────────
module.exports.postResetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    req.flash("error", "Reset link is invalid or expired");
    return res.redirect("/login");
  }

  // Passport-local-mongoose method
  user.setPassword(password, async (err, updatedUser) => {
    if (err) {
      req.flash("error", "Something went wrong. Try again!");
      return res.redirect("/login");
    }

    updatedUser.resetPasswordToken = undefined;
    updatedUser.resetPasswordExpires = undefined;
    await updatedUser.save();

    req.flash("success", "Password updated successfully!");
    res.redirect("/login");
  });
};
