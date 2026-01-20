const crypto = require("crypto");
const User = require("../models/user");

// Load env in development
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const brevo = require("@getbrevo/brevo");

/* ─────────────────────────────────────────
   RENDER FORGOT PASSWORD FORM
───────────────────────────────────────── */
module.exports.restform = async (req, res) => {
  res.render("emailer/emailSent.ejs", {
    message: "Enter your registered email address",
    alertmsg: false,
  });
};

/* ─────────────────────────────────────────
   FORGOT PASSWORD → SEND RESET EMAIL
───────────────────────────────────────── */
module.exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.render("emailer/emailSent.ejs", {
        message: "Email is required",
        alertmsg: true,
      });
    }

    const user = await User.findOne({ email });

    // Security: no user existence leak
    if (!user) {
      return res.render("emailer/emailSent.ejs", {
        message:
          "If this email is registered, a reset link will be sent shortly.",
        alertmsg: false,
      });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const domain =
      process.env.DOMAIN ||
      (process.env.NODE_ENV === "production"
        ? "https://rootshield.in"
        : "http://localhost:3000");

    const resetLink = `${domain}/reset-password/${token}`;

    /* ───── BREVO CONFIG ───── */
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY,
    );

    const htmlContent = `
      <div style="font-family:Arial; max-width:600px; margin:auto; padding:24px;">
        <h1 style="color:#1e3a8a;">Root Shield</h1>
        <p>Secure Password Reset</p>

        <p>Hello <strong>${user.name || "User"}</strong>,</p>

        <p>
          We received a request to reset your Root Shield account password.
        </p>

        <div style="text-align:center; margin:30px 0;">
          <a href="${resetLink}"
             style="background:#1e3a8a;color:#fff;padding:12px 24px;
                    text-decoration:none;border-radius:6px;">
            Reset Password
          </a>
        </div>

        <p>This link will expire in 1 hour.</p>

        <p style="font-size:12px;color:#777;">
          If you didn’t request this, please ignore this email.
        </p>
      </div>
    `;

    await apiInstance.sendTransacEmail({
      sender: {
        email: "thecubicals123@gmail.com", // VERIFIED SENDER
        name: "Root Shield",
      },
      to: [{ email: user.email }],
      subject: "Reset Your Root Shield Password",
      htmlContent,
    });

    req.flash("success", "Password reset link sent to your email.");
    res.redirect("/login");
  } catch (err) {
    console.error("Root Shield Reset Email Error:", err);
    req.flash("error", "Unable to send reset email.");
    res.redirect("/login");
  }
};

/* ─────────────────────────────────────────
   SHOW RESET PASSWORD PAGE
───────────────────────────────────────── */
module.exports.getResetPassword = async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash("error", "Reset link is invalid or expired");
      return res.redirect("/login");
    }

    res.render("emailer/reset.ejs", { token: req.params.token });
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong");
    res.redirect("/login");
  }
};

/* ─────────────────────────────────────────
   RESET PASSWORD FINAL
───────────────────────────────────────── */
module.exports.postResetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      req.flash("error", "Password must be at least 8 characters");
      return res.redirect("back");
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash("error", "Reset link expired or invalid");
      return res.redirect("/login");
    }

    user.setPassword(password, async (err, updatedUser) => {
      if (err) {
        req.flash("error", "Password reset failed");
        return res.redirect("/login");
      }

      updatedUser.resetPasswordToken = undefined;
      updatedUser.resetPasswordExpires = undefined;
      await updatedUser.save();

      req.flash("success", "Password reset successful. Please login.");
      res.redirect("/login");
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong");
    res.redirect("/login");
  }
};
