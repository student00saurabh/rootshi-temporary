const { saveRedirectUrl } = require("../middleware.js");
const User = require("../models/user.js");
const Cources = require("../models/cources.js");
const bcrypt = require("bcrypt");
const brevo = require("@getbrevo/brevo");
const Certificate = require("../models/certification.js");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

// Load environment variables (only in development)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// Configure Brevo API
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY,
);

const emailApi = new brevo.TransactionalEmailsApi();
emailApi.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY,
);

// Constants for better maintainability
const OTP_EXPIRY_MINUTES = 10;
const OTP_EXPIRY_MS = OTP_EXPIRY_MINUTES * 60 * 1000;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Professional OTP Email Template
async function sendVerificationOTP(user) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP with expiry
  user.otp = otp;
  user.otpExpires = Date.now() + OTP_EXPIRY_MS;
  await user.save();

  const domain = process.env.DOMAIN || "https://rootshield.in";

  // HTML Email Template with RootShield Theme
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email | RootShield</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      
      body {
        font-family: 'Inter', Arial, sans-serif;
        line-height: 1.6;
        color: #374151;
        margin: 0;
        padding: 0;
        background-color: #f9fafb;
      }
      
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        border: 1px solid #e5e7eb;
      }
      
      .header {
        background: linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%);
        padding: 40px 20px;
        text-align: center;
        color: white;
      }
      
      .logo {
        font-size: 36px;
        font-weight: 800;
        margin-bottom: 10px;
        letter-spacing: -0.5px;
      }
      
      .logo-gradient {
        background: linear-gradient(90deg, #60a5fa 0%, #22d3ee 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      .subtitle {
        font-size: 14px;
        opacity: 0.9;
        letter-spacing: 1px;
        text-transform: uppercase;
        font-weight: 500;
      }
      
      .content {
        padding: 40px;
      }
      
      .greeting {
        font-size: 20px;
        font-weight: 600;
        color: #111827;
        margin-bottom: 20px;
      }
      
      .message {
        color: #4b5563;
        margin-bottom: 30px;
        font-size: 15px;
        line-height: 1.7;
      }
      
      .otp-container {
        text-align: center;
        margin: 40px 0;
      }
      
      .otp-code {
        display: inline-block;
        padding: 20px 30px;
        font-size: 36px;
        font-weight: 700;
        letter-spacing: 8px;
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border: 2px solid #0ea5e9;
        border-radius: 16px;
        color: #0369a1;
        box-shadow: 0 4px 20px rgba(14, 165, 233, 0.15);
      }
      
      .expiry-notice {
        background-color: #fef3c7;
        border-left: 4px solid #f59e0b;
        padding: 16px;
        border-radius: 8px;
        margin: 30px 0;
        color: #92400e;
        font-size: 14px;
      }
      
      .security-error {
        background-color: #fef2f2;
        border-left: 4px solid #ef4444;
        padding: 16px;
        border-radius: 8px;
        margin: 30px 0;
        color: #991b1b;
        font-size: 14px;
      }
      
      .support-info {
        background-color: #f0f9ff;
        border-radius: 12px;
        padding: 25px;
        margin: 40px 0;
        border: 1px solid #bae6fd;
      }
      
      .footer {
        background-color: #f9fafb;
        padding: 30px 40px;
        text-align: center;
        border-top: 1px solid #e5e7eb;
        color: #6b7280;
        font-size: 13px;
      }
      
      .contact-link {
        color: #2563eb;
        text-decoration: none;
        font-weight: 500;
      }
      
      @media (max-width: 600px) {
        .content, .footer {
          padding: 30px 20px;
        }
        
        .header {
          padding: 30px 20px;
        }
        
        .otp-code {
          font-size: 28px;
          letter-spacing: 6px;
          padding: 15px 20px;
        }
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <!-- Header -->
      <div class="header">
        <div class="logo">
          <span class="logo-gradient">RootShield</span>
        </div>
        <div class="subtitle">Email Verification Required</div>
      </div>
      
      <!-- Content -->
      <div class="content">
        <div class="greeting">
          Hello ${user.name || user.username || "Future Security Professional"},
        </div>
        
        <div class="message">
          <p>Thank you for choosing <strong>RootShield</strong> – India's leading cybersecurity and web development education platform.</p>
          <p>To complete your registration and activate your account, please use the One-Time Password (OTP) below:</p>
        </div>
        
        <div class="otp-container">
          <div class="otp-code">${otp}</div>
        </div>
        
        <div class="expiry-notice">
          ⏰ <strong>Expires in ${OTP_EXPIRY_MINUTES} minutes</strong><br>
          This OTP is valid for ${OTP_EXPIRY_MINUTES} minutes only. After this time, you'll need to request a new verification code.
        </div>
        
        <div class="security-error">
          🔒 <strong>Security Notice</strong><br>
          Never share this OTP with anyone. RootShield representatives will never ask for your OTP or password. Keep your account credentials secure.
        </div>
        
        <div class="support-info">
          <p><strong>Need assistance?</strong></p>
          <p>If you didn't request this verification or need help, please contact our support team immediately:</p>
          <p>📧 <a href="mailto:info@rootshield.in" class="contact-link">info@rootshield.in</a></p>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>
          <strong>RootShield Security Team</strong><br>
          Udyam Registered Education Platform • Delhi, India
        </p>
        <div style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
          <p>
            This is an automated security email. Please do not reply directly.<br>
            Protecting your learning journey is our priority.
          </p>
          <p style="margin-top: 15px;">
            © ${new Date().getFullYear()} RootShield. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  // Plain text version
  const textContent = `
  ROOTSHIELD EMAIL VERIFICATION
  ==============================
  
  Hello ${user.name || user.username || "Future Security Professional"},
  
  Thank you for choosing RootShield - India's leading cybersecurity and web development education platform.
  
  EMAIL VERIFICATION REQUIRED:
  
  Your One-Time Password (OTP): ${otp}
  
  ⚠️ IMPORTANT NOTES:
  • This OTP expires in ${OTP_EXPIRY_MINUTES} minutes
  • Never share this code with anyone
  • RootShield staff will NEVER ask for your OTP
  
  🔒 SECURITY REMINDER:
  Keep your account credentials secure. If you didn't request this verification, please contact our security team immediately.
  
  📞 SUPPORT:
  Email: info@rootshield.in
  Website: ${domain}
  
  ---
  RootShield | Udyam Registered Education Platform
  Cybersecurity & Web Development Education
  Delhi, India
  
  This is an automated security message. Please do not reply.
  © ${new Date().getFullYear()} RootShield. All rights reserved.
  `;

  try {
    await emailApi.sendTransacEmail({
      sender: { email: "info@rootshield.in", name: "RootShield Verification" },
      to: [{ email: user.email, name: user.name || user.username }],
      subject: "🔐 Verify Your Email | RootShield Account Activation",
      htmlContent: htmlContent,
      textContent: textContent,
    });

    console.log(`✅ Verification OTP sent to: ${user.email}`);
  } catch (emailErr) {
    console.error(
      `❌ Failed to send verification email to ${user.email}:`,
      emailErr,
    );
    throw new Error("Failed to send verification email. Please try again.");
  }

  return otp;
}

// Professional Welcome Email Template
async function sendWelcomeEmail(user) {
  const domain = process.env.DOMAIN || "https://rootshield.in";

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to RootShield | Your Cybersecurity Journey Begins</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      
      body {
        font-family: 'Inter', Arial, sans-serif;
        line-height: 1.6;
        color: #374151;
        margin: 0;
        padding: 0;
        background-color: #f9fafb;
      }
      
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        border: 1px solid #e5e7eb;
      }
      
      .header {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        padding: 50px 20px;
        text-align: center;
        color: white;
      }
      
      .logo {
        font-size: 42px;
        font-weight: 800;
        margin-bottom: 10px;
        letter-spacing: -1px;
      }
      
      .logo-gradient {
        background: linear-gradient(90deg, #34d399 0%, #10b981 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      .success-icon {
        font-size: 48px;
        margin-bottom: 20px;
      }
      
      .content {
        padding: 40px;
      }
      
      .greeting {
        font-size: 24px;
        font-weight: 700;
        color: #111827;
        margin-bottom: 25px;
      }
      
      .message {
        color: #4b5563;
        margin-bottom: 35px;
        font-size: 16px;
        line-height: 1.8;
      }
      
      .cta-button {
        display: inline-block;
        background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
        color: white;
        padding: 18px 45px;
        text-decoration: none;
        border-radius: 14px;
        font-weight: 600;
        font-size: 17px;
        text-align: center;
        margin: 30px 0;
        box-shadow: 0 6px 20px rgba(37, 99, 235, 0.25);
        transition: all 0.3s ease;
      }
      
      .features-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin: 40px 0;
      }
      
      .feature-card {
        background: #f8fafc;
        border-radius: 12px;
        padding: 25px;
        border: 1px solid #e2e8f0;
      }
      
      .feature-icon {
        font-size: 32px;
        margin-bottom: 15px;
        color: #3b82f6;
      }
      
      .feature-title {
        font-weight: 600;
        color: #1e40af;
        margin-bottom: 10px;
      }
      
      .security-card {
        background-color: #f0f9ff;
        border-radius: 12px;
        padding: 24px;
        margin: 30px 0;
        border: 1px solid #bae6fd;
      }
      
      .footer {
        background-color: #f9fafb;
        padding: 30px 40px;
        text-align: center;
        border-top: 1px solid #e5e7eb;
        color: #6b7280;
        font-size: 13px;
      }
      
      .contact-link {
        color: #2563eb;
        text-decoration: none;
        font-weight: 500;
      }
      
      @media (max-width: 600px) {
        .content, .footer {
          padding: 30px 20px;
        }
        
        .header {
          padding: 40px 20px;
        }
        
        .features-grid {
          grid-template-columns: 1fr;
        }
        
        .cta-button {
          display: block;
          width: 100%;
          box-sizing: border-box;
        }
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <div class="success-icon">🎉</div>
        <div class="logo">
          <span class="logo-gradient">RootShield</span>
        </div>
        <div style="font-size: 16px; opacity: 0.9; letter-spacing: 1.5px;">Account Successfully Verified</div>
      </div>
      
      <div class="content">
        <div class="greeting">
          Welcome to RootShield, ${user.name || user.username || "Security Professional"}!
        </div>
        
        <div class="message">
          <p>Congratulations! Your RootShield account has been successfully verified and activated.</p>
          <p>You are now part of India's premier cybersecurity and web development education community. Get ready to enhance your skills with industry-recognized Courcess and certifications.</p>
        </div>
        
        <div style="text-align: center;">
          <a href="${domain}/dashboard" class="cta-button">
            🚀 Access Your Dashboard
          </a>
        </div>
        
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">🔐</div>
            <div class="feature-title">Cybersecurity Mastery</div>
            <div>Learn ethical hacking, network security, and penetration testing from industry experts.</div>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">💻</div>
            <div class="feature-title">Web Development</div>
            <div>Master full-stack development with modern frameworks and best practices.</div>
          </div>
        </div>
        
        <div class="security-card">
          <strong>🔒 Account Security Tips:</strong>
          <ul style="margin-top: 10px; padding-left: 20px;">
            <li>Use a strong, unique password</li>
            <li>Enable two-factor authentication when available</li>
            <li>Never share your login credentials</li>
            <li>Regularly review account activity</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 40px;">
          <p style="color: #4b5563; font-size: 15px;">
            Need assistance? Our support team is here to help.
          </p>
          <p style="margin-top: 10px;">
            📧 <a href="mailto:info@rootshield.in" class="contact-link">info@rootshield.in</a> | 
            🌐 <a href="${domain}" class="contact-link">Visit RootShield</a>
          </p>
        </div>
      </div>
      
      <div class="footer">
        <p>
          <strong>RootShield Education Platform</strong><br>
          Udyam Registered • Delhi, India
        </p>
        <div style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
          <p>
            This is an automated welcome email. Please do not reply directly.<br>
            Protecting your educational journey is our commitment.
          </p>
          <p style="margin-top: 15px;">
            © ${new Date().getFullYear()} RootShield. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  try {
    await apiInstance.sendTransacEmail({
      sender: { email: "info@rootshield.in", name: "RootShield Welcome Team" },
      to: [{ email: user.email, name: user.name || user.username }],
      subject: "🎉 Welcome to RootShield! Your Account is Now Active",
      htmlContent: htmlContent,
    });

    console.log(`✅ Welcome email sent to: ${user.email}`);
  } catch (emailErr) {
    console.error(
      `❌ Failed to send welcome email to ${user.email}:`,
      emailErr,
    );
  }
}

// CONTROLLER FUNCTIONS

module.exports.renderSignupForm = async (req, res) => {
  try {
    res.render("users/signup.ejs");
  } catch (err) {
    console.error("❌ Error loading signup form:", err);
    req.flash("primary", "Unable to load registration page. Please try again.");
    res.redirect("/");
  }
};

module.exports.signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const username = email.split("@")[0];

    // Create new user instance
    const newUser = new User({ name, email, username });

    // Register user (with passport-local-mongoose)
    const registeredUser = await User.register(newUser, password);

    req.flash("success", "OTP sent to your email. Please verify your email.");
    res.redirect(`/verify-email?email=${email}`);
  } catch (err) {
    console.error("Signup error:", err.message);
    req.flash("error", err.message);
    res.redirect("/signup");
  }
};

module.exports.renderLoginForm = (req, res) => {
  try {
    if (res.locals.currUser) {
      req.flash("info", "You are already logged in.");
      return res.redirect("/");
    }
    res.render("users/login.ejs");
  } catch (err) {
    console.error("❌ Error loading login form:", err);
    req.flash("error", "Unable to load login page. Please try again.");
    res.redirect("/");
  }
};

module.exports.login = async (req, res) => {
  req.flash("success", "Welcome back to Root-Shield!");
  const redirectUrl = res.locals.redirectUrl || "/";
  res.redirect(redirectUrl);
};
module.exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash("success", "You have been logged out successfully!");
    res.redirect("/");
  });
};

// OTP VERIFICATION FUNCTIONS
module.exports.renderVerifyEmailForm = async (req, res) => {
  const { email } = req.query;
  if (!email) return res.redirect("/login");
  const user = await User.findOne({ email: email });
  await sendVerificationOTP(user);
  res.render("emailer/otp.ejs", { user });
};

module.exports.verifyEmail = async (req, res) => {
  try {
    const { otp } = req.body;
    const { id } = req.params;

    if (!otp || otp.length !== 6) {
      req.flash("warning", "Please enter a valid 6-digit OTP.");
      return res.redirect(`/verify-email?email=${req.body.email || ""}`);
    }

    const user = await User.findById(id);

    if (!user) {
      req.flash(
        "error",
        "Invalid verification request. Please try signing up again.",
      );
      return res.redirect("/signup");
    }

    if (user.isVerified) {
      req.flash("info", "Your email is already verified. Please log in.");
      return res.redirect("/login");
    }

    if (!user.otp || !user.otpExpires) {
      req.flash(
        "warning",
        "No active OTP found. Please request a new verification code.",
      );
      return res.redirect(`/verify-email?email=${user.email}`);
    }

    if (user.otp !== otp) {
      req.flash("warning", "Invalid OTP. Please check the code and try again.");
      return res.redirect(`/verify-email?email=${user.email}`);
    }

    if (user.otpExpires < Date.now()) {
      req.flash(
        "warning",
        "OTP has expired. Please request a new verification code.",
      );
      return res.redirect(`/verify-email?email=${user.email}`);
    }

    // Mark email as verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user);

    // Auto-login the user
    req.login(user, (err) => {
      if (err) {
        console.error("❌ Auto-login error after verification:", err);
        req.flash(
          "success",
          "Email verified successfully! Please log in to continue.",
        );
        return res.redirect("/login");
      }
      req.flash(
        "success",
        "Email verified successfully! Welcome to RootShield.",
      );
      res.redirect("/");
    });
  } catch (err) {
    console.error("❌ Email verification error:", err);
    req.flash(
      "error",
      "We encountered an issue verifying your email. Please try again.",
    );
    res.redirect(`/verify-email?email=${req.body.email || ""}`);
  }
};

module.exports.resendOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      req.flash("error", "User account not found.");
      return res.redirect("/signup");
    }

    if (user.isvalid) {
      req.flash("info", "Your email is already verified. Please log in.");
      return res.redirect("/login");
    }

    // Rate limiting: Check if OTP was recently sent
    if (user.otpExpires && user.otpExpires > Date.now() - 60000) {
      req.flash(
        "primary",
        "Please wait at least 1 minute before requesting a new OTP.",
      );
      return res.redirect(`/verify-email?email=${user.email}`);
    }

    await sendVerificationOTP(user);

    req.flash(
      "success",
      "A new verification code has been sent to your email. Please check your inbox.",
    );
    res.redirect(`/verify-email?email=${user.email}`);
  } catch (err) {
    console.error("❌ OTP resend error:", err);
    req.flash("error", "Unable to send verification code. Please try again.");
    res.redirect(`/verify-email?email=${req.query.email || ""}`);
  }
};

module.exports.profile = async (req, res) => {
  try {
    const id = req.user._id; // Assuming req.user is set by auth middleware

    // Find user
    const user = await User.findById(id);

    // Find courses where user is enrolled - CORRECTED
    const enrolledCourses = await Cources.find({
      "students.user": id,
    })
      .populate("teacher", "name email")
      .sort({ "students.enrolledAt": -1 })
      .limit(6);

    // If no courses found, use dummy data
    let displayCourses = enrolledCourses;

    // Dummy taught courses for teachers
    const taughtCourses =
      user.role === "teacher"
        ? [
            {
              _id: "64a1b2c3d4e5f67890123456",
              title: "Advanced Cybersecurity",
              shortDescription:
                "Master advanced security concepts and techniques",
              image: {
                url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=300&fit=crop",
              },
              students: [{}, {}, {}],
              isActive: true,
              courceType: "CYBERSECURITY",
            },
          ]
        : [];

    // Dummy recent activity
    const recentActivity = [
      {
        _id: "1",
        action: "enrollment",
        description: "Enrolled in 'Ethical Hacking Fundamentals' course",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ];

    // Dummy certificates
    const certificates = [
      {
        _id: "cert001",
        course: {
          title: "Introduction to Cybersecurity",
        },
        certificateId: "CERT-2024-001",
        issuedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
    ];

    // Calculate stats
    const totalEnrolled = displayCourses.length;
    const totalPaid = displayCourses.reduce((sum, course) => {
      const studentInfo = course.students?.find(
        (s) =>
          s.user?._id?.toString() === id.toString() ||
          s.user?.toString() === id.toString(),
      );
      return sum + (studentInfo?.paidPrice || course.price || 0);
    }, 0);

    // Render the template with ALL required variables
    res.render("users/profile.ejs", {
      user,
      enrolledCourses: displayCourses, // Make sure this is passed
      taughtCourses,
      totalEnrolled,
      totalPaid,
      recentActivity,
      certificates,
      moment: require("moment"),
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Something went wrong");
    res.redirect("/");
  }
};

// controllers/userController.js

module.exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // Safely read body
    const { name, mobile, email } = req.body || {};

    if (!name && !mobile && !email) {
      return res.status(400).json({
        success: false,
        message: "No data provided",
      });
    }

    // ✅ Email duplicate check
    if (email) {
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId },
      });

      if (existingUser) {
        return res.json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    // ✅ Mobile duplicate check
    if (mobile) {
      const existingUser = await User.findOne({
        mobile,
        _id: { $ne: userId },
      });

      if (existingUser) {
        return res.json({
          success: false,
          message: "Mobile number already in use",
        });
      }
    }

    // ✅ Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name,
        mobile,
        email: email?.toLowerCase(),
        updatedAt: new Date(),
      },
      { new: true },
    );

    // ✅ Log activity
    // await Activity.create({
    //   user: userId,
    //   action: "profile_update",
    //   description: "Updated profile information",
    //   details: { fields: ["name", "email", "mobile"] },
    // });

    // ✅ Send JSON success
    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
      stack: err.stack, // remove later in production
    });
  }
};

module.exports.changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (newPassword !== confirmPassword) {
      req.flash("error", "New passwords do not match");
      return res.redirect("/profile#security");
    }

    if (newPassword.length < 6) {
      req.flash("warning", "Password must be at least 6 characters long");
      return res.redirect("/profile#security");
    }

    const user = await User.findById(userId);

    // Verify current password (assuming you have password field in user schema)
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      req.flash("error", "Current password is incorrect");
      return res.redirect("/profile#security");
    }

    // Update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Log activity
    await Activity.create({
      user: userId,
      action: "password_change",
      description: "Changed account password",
    });

    req.flash("success", "Password changed successfully");
    res.redirect("/profile#security");
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to change password");
    res.redirect("/profile#security");
  }
};

module.exports.enrollmentHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const enrollments = await Cources.aggregate([
      { $match: { "students.user": mongoose.Types.ObjectId(userId) } },
      { $unwind: "$students" },
      { $match: { "students.user": mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "users",
          localField: "teacher",
          foreignField: "_id",
          as: "teacher",
        },
      },
      { $unwind: "$teacher" },
      {
        $project: {
          CourcesId: "$_id",
          CourcesTitle: "$title",
          CourcesImage: "$image.url",
          CourcesType: "$courceType",
          teacherName: "$teacher.name",
          enrolledAt: "$students.enrolledAt",
          paidPrice: "$students.paidPrice",
          description: "$students.description",
          completionPercentage: 0, // You can calculate this based on progress
          lastAccessed: new Date(), // You should track this separately
        },
      },
      { $sort: { enrolledAt: -1 } },
    ]);

    res.json({ success: true, enrollments });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load enrollment history" });
  }
};

// module.exports.downloadCertificate = async (req, res) => {
//   try {
//     const { certificateId } = req.params;
//     const userId = req.user._id;

//     const certificate = await Certificate.findOne({
//       _id: certificateId,
//       user: userId,
//     }).populate("Cources", "title duration");

//     if (!certificate) {
//       req.flash("error", "Certificate not found");
//       return res.redirect("/profile");
//     }

//     // Generate PDF certificate
//     // You can use libraries like pdfkit or puppeteer here
//     res.json({ success: true, certificate });
//   } catch (err) {
//     console.log(err);
//     res
//       .status(500)
//       .json({ success: false, message: "Failed to download certificate" });
//   }
// };

module.exports.myCourses = async (req, res) => {
  try {
    const userId = req.user._id;
    const enrolledCourses = await Cources.find({
      "students.user": userId,
    }).populate("teacher", "name email");
    res.render("users/myCources.ejs", { enrolledCourses });
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to load your courses");
    res.redirect("/profile");
  }
};

// controllers/certificateController.js

module.exports.myCertificates = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = req.user;

    // For regular users - get their certificates
    const certificates = await Certificate.find({
      student: userId,
      isActive: true,
    })
      .populate("course", "title")
      .populate("teacher", "name")
      .sort("-issueDate")
      .lean();

    // For admin - get all users for dropdown
    let allUsers = [];
    let allCourses = [];

    if (user.role === "admin") {
      allUsers = await User.find({ role: "user" }).select("name email").lean();
      allCourses = await Cources.find({ isActive: true })
        .select("title")
        .lean();
    }

    res.render("users/myCertificates", {
      certificates,
      allUsers,
      allCourses,
      user,
      totalCertificates: certificates.length,
    });
  } catch (err) {
    console.error("Error in myCertificates:", err);
    req.flash("error", "Failed to load your certificates");
    res.redirect("/profile");
  }
};

// Admin: Issue certificate to student
// Update the issueCertificate function to handle new fields
module.exports.issueCertificate = async (req, res) => {
  try {
    const {
      studentId,
      courseId,
      certificateType,
      grade,
      issueDate,
      notes,
      position,
      department,
      duration,
      projectName,
      companyName, // Add this - it's missing from your destructuring
    } = req.body;

    // Validate required fields
    if (!studentId || !certificateType) {
      req.flash("error", "Please select student and certificate type");
      return res.redirect("/certificates");
    }

    // Validate based on certificate type
    if (certificateType === "OFFERLETTER") {
      if (!companyName || !position) {
        req.flash(
          "error",
          "Please fill company name and position for offer letter",
        );
        return res.redirect("/certificates");
      }
    }

    if (certificateType === "INTERNSHIP") {
      if (!companyName || !position) {
        req.flash(
          "error",
          "Please fill company name and position for internship",
        );
        return res.redirect("/certificates");
      }
    }

    // Validate course certificates
    if (
      [
        "WEB DEV",
        "CYBERSECURITY",
        "MACHINE LEARNING",
        "DATA SCIENCE",
        "ARTIFICIAL INTELLIGENCE",
      ].includes(certificateType)
    ) {
      if (!courseId) {
        req.flash("error", "Please select a course");
        return res.redirect("/certificates");
      }
    }

    // Validate performance/hackathon
    if (certificateType === "PERFORMANCE" || certificateType === "HACKATHON") {
      if (!projectName) {
        req.flash(
          "error",
          `Please enter ${certificateType === "PERFORMANCE" ? "award category" : "event name"}`,
        );
        return res.redirect("/certificates");
      }
    }

    // Get teacher (current admin)
    const teacher = req.user._id;

    // Check if student exists
    const student = await User.findById(studentId);
    if (!student) {
      req.flash("error", "Student not found");
      return res.redirect("/certificates");
    }

    // For course certificates, verify course exists
    if (courseId) {
      const course = await Cources.findById(courseId);
      if (!course) {
        req.flash("error", "Course not found");
        return res.redirect("/certificates");
      }
    }

    // Prepare certificate data based on type
    const certificateData = {
      teacher,
      student: studentId,
      certificateType,
      issueDate: issueDate || new Date(),
      note: notes,
    };

    // Add type-specific fields
    if (
      [
        "WEB DEV",
        "CYBERSECURITY",
        "MACHINE LEARNING",
        "DATA SCIENCE",
        "ARTIFICIAL INTELLIGENCE",
      ].includes(certificateType)
    ) {
      certificateData.course = courseId;
      certificateData.grade = grade || "COMPLETED";
    } else if (certificateType === "INTERNSHIP") {
      // No `course` field for internship certificates
      certificateData.position = position;
      certificateData.duration = duration;
      certificateData.note =
        `Internship at ${companyName}. ${notes || ""}`.trim();
    } else if (certificateType === "OFFERLETTER") {
      // No `course` field for offer letters
      certificateData.position = position;
      certificateData.department = department;
      certificateData.note =
        `Offer letter from ${companyName}. ${notes || ""}`.trim();
    } else if (certificateType === "PERFORMANCE") {
      // No `course` field for performance certificates
      certificateData.projectName = projectName;
      certificateData.grade = grade || "EXCELLENT";
    } else if (certificateType === "HACKATHON") {
      // No `course` field for hackathon certificates
      certificateData.projectName = projectName;
      certificateData.grade = grade || "PARTICIPATION";
    } else {
      // OTHER type: only set `course` when provided
      if (courseId) certificateData.course = courseId;
      certificateData.grade = grade || "COMPLETED";
    }

    const certificate = new Certificate(certificateData);
    await certificate.save();

    req.flash("success", `Certificate issued successfully to ${student.name}`);
    res.redirect("/certificates");
  } catch (err) {
    console.error("Error issuing certificate:", err);
    req.flash("error", "Failed to issue certificate: " + err.message);
    res.redirect("/certificates");
  }
};
// Download certificate as image
module.exports.downloadCertificateImage = async (req, res) => {
  try {
    const { id } = req.params;
    const certificate = await Certificate.findById(id)
      .populate("student", "name")
      .populate("course", "title")
      .populate("teacher", "name");

    if (!certificate) {
      req.flash("error", "Certificate not found");
      return res.redirect("/certificates");
    }

    // Increment download count
    certificate.downloadCount += 1;
    await certificate.save();

    // Generate and send SVG
    const svg = generateCertificateSVG(certificate);

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${certificate.certificateType.toLowerCase().replace(" ", "-")}-certificate-${certificate.certificateId}.svg"`,
    );
    res.send(svg);
  } catch (err) {
    console.error("Error downloading certificate:", err);
    req.flash("error", "Failed to download certificate");
    res.redirect("/certificates");
  }
};

// Download certificate as PDF
module.exports.downloadCertificatePDF = async (req, res) => {
  try {
    const { id } = req.params;
    const certificate = await Certificate.findById(id)
      .populate("student", "name")
      .populate("course", "title")
      .populate("teacher", "name");

    if (!certificate) {
      req.flash("error", "Certificate not found");
      return res.redirect("/certificates");
    }

    // Increment download count
    certificate.downloadCount += 1;
    await certificate.save();

    // For now, redirect to SVG download (you can implement PDF later)
    res.redirect(`/certificate/${id}/download/image`);
  } catch (err) {
    console.error("Error downloading certificate:", err);
    req.flash("error", "Failed to download certificate");
    res.redirect("/certificates");
  }
};

// Helper function to generate certificate SVG with RootShield branding
// Helper function to generate professional certificate SVG with embedded logo
function generateCertificateSVG(cert) {
  const studentName = cert.student?.name || "Student";
  const courseName = cert.course?.title || "Course Completion";
  const teacherName = cert.teacher?.name || "Instructor";
  const date = new Date(cert.issueDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Certificate types with professional color schemes
  const colors = {
    // Course Certificates - Professional Blues
    "WEB DEV": {
      primary: "#2563EB", // Royal Blue
      secondary: "#7C3AED", // Purple
      accent: "#10B981", // Emerald
      border: "#1E3A8A", // Dark Blue
      text: "#1F2937", // Dark Gray
    },
    CYBERSECURITY: {
      primary: "#DC2626", // Red
      secondary: "#1E3A8A", // Dark Blue
      accent: "#F59E0B", // Orange
      border: "#991B1B", // Dark Red
      text: "#1F2937",
    },
    "MACHINE LEARNING": {
      primary: "#7C3AED", // Purple
      secondary: "#DB2777", // Pink
      accent: "#10B981", // Emerald
      border: "#5B21B6", // Dark Purple
      text: "#1F2937",
    },
    "DATA SCIENCE": {
      primary: "#F59E0B", // Orange
      secondary: "#059669", // Green
      accent: "#3B82F6", // Blue
      border: "#B45309", // Dark Orange
      text: "#1F2937",
    },
    "ARTIFICIAL INTELLIGENCE": {
      primary: "#6D28D9", // Purple
      secondary: "#9333EA", // Light Purple
      accent: "#F472B6", // Pink
      border: "#4C1D95", // Deep Purple
      text: "#1F2937",
    },

    // Professional Certificates - Green/Emerald Theme
    INTERNSHIP: {
      primary: "#065F46", // Dark Green
      secondary: "#047857", // Green
      accent: "#FBBF24", // Yellow
      border: "#064E3B", // Deep Green
      text: "#1F2937",
    },
    OFFERLETTER: {
      primary: "#1E40AF", // Dark Blue
      secondary: "#2563EB", // Blue
      accent: "#F59E0B", // Orange
      border: "#1E3A8A", // Navy
      text: "#1F2937",
    },
    PERFORMANCE: {
      primary: "#92400E", // Brown
      secondary: "#B45309", // Orange-Brown
      accent: "#FCD34D", // Light Yellow
      border: "#78350F", // Dark Brown
      text: "#1F2937",
    },
    HACKATHON: {
      primary: "#6B21A8", // Purple
      secondary: "#7E22CE", // Violet
      accent: "#F59E0B", // Orange
      border: "#4C1D95", // Deep Purple
      text: "#1F2937",
    },

    // Default
    OTHER: {
      primary: "#2563EB",
      secondary: "#7C3AED",
      accent: "#10B981",
      border: "#1E3A8A",
      text: "#1F2937",
    },
  };

  const typeColors = colors[cert.certificateType] || colors.OTHER;

  // Determine certificate content based on type
  let certificateTitle = "CERTIFICATE";
  let subtitle = "OF COMPLETION";
  let mainText = "for successfully completing";
  let additionalDetails = "";

  if (cert.certificateType === "INTERNSHIP") {
    certificateTitle = "INTERNSHIP";
    subtitle = "COMPLETION CERTIFICATE";
    mainText = "for successfully completing the internship program as";
    additionalDetails = cert.position ? ` ${cert.position}` : "";
  } else if (cert.certificateType === "OFFERLETTER") {
    certificateTitle = "OFFER LETTER";
    subtitle = "OF APPOINTMENT";
    mainText = "is hereby appointed to the position of";
    additionalDetails = cert.position ? ` ${cert.position}` : "";
  } else if (cert.certificateType === "PERFORMANCE") {
    certificateTitle = "PERFORMANCE";
    subtitle = "ACHIEVEMENT AWARD";
    mainText = "is recognized for outstanding performance in";
  } else if (cert.certificateType === "HACKATHON") {
    certificateTitle = "HACKATHON";
    subtitle = "PARTICIPATION CERTIFICATE";
    mainText = "for active participation in";
  }

  // Convert logo to base64 (you can replace with your actual logo)
  // For production, you might want to serve the logo from your static files
  const logoSvg = `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="40" r="38" stroke="${typeColors.primary}" stroke-width="4" fill="white"/>
    <text x="40" y="52" text-anchor="middle" font-family="Arial Black" font-size="24" fill="${typeColors.primary}">R</text>
    <text x="40" y="68" text-anchor="middle" font-family="Arial" font-size="10" fill="#6B7280">SHIELD</text>
  </svg>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="800" viewBox="0 0 1200 800" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <!-- Definitions for patterns and gradients -->
  <defs>
    <!-- Professional gradient background -->
    <linearGradient id="bgGradient" x1="0" y1="0" x2="1200" y2="800" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F9FAFB"/>
      <stop offset="1" stop-color="#F3F4F6"/>
    </linearGradient>
    
    <!-- Border gradient -->
    <linearGradient id="borderGradient" x1="0" y1="0" x2="1200" y2="800" gradientUnits="userSpaceOnUse">
      <stop stop-color="${typeColors.primary}"/>
      <stop offset="0.5" stop-color="${typeColors.secondary}"/>
      <stop offset="1" stop-color="${typeColors.accent}"/>
    </linearGradient>
    
    <!-- Gold gradient for accents -->
    <linearGradient id="goldGradient" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFD700"/>
      <stop offset="0.5" stop-color="#FBBF24"/>
      <stop offset="1" stop-color="#F59E0B"/>
    </linearGradient>
    
    <!-- Subtle pattern -->
    <pattern id="pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
      <path d="M 0 0 L 100 0 100 100 0 100 Z" fill="none" stroke="${typeColors.primary}" stroke-width="0.3" opacity="0.1"/>
      <circle cx="50" cy="50" r="10" fill="${typeColors.primary}" opacity="0.05"/>
    </pattern>
    
    <!-- Drop shadow filter -->
    <filter id="shadow" x="-20" y="-20" width="1240" height="840">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.1"/>
    </filter>
    
    <!-- Emboss effect -->
    <filter id="emboss">
      <feConvolveMatrix order="3" kernelMatrix="1 0 0 0 0.5 0 0 0 1"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="800" fill="url(#bgGradient)"/>
  
  <!-- Decorative pattern overlay -->
  <rect width="1200" height="800" fill="url(#pattern)"/>
  
  <!-- Outer border with gold accents -->
  <rect x="30" y="30" width="1140" height="740" rx="40" stroke="url(#borderGradient)" stroke-width="3" fill="none"/>
  
  <!-- Inner decorative border -->
  <rect x="50" y="50" width="1100" height="700" rx="30" fill="white" filter="url(#shadow)"/>
  
  <!-- Corner decorations -->
  <path d="M70 70 L120 70 L120 120" stroke="${typeColors.primary}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M1130 70 L1080 70 L1080 120" stroke="${typeColors.primary}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M70 730 L120 730 L120 680" stroke="${typeColors.primary}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M1130 730 L1080 730 L1080 680" stroke="${typeColors.primary}" stroke-width="3" fill="none" stroke-linecap="round"/>
  
  <!-- Top decorative bar with gradient -->
  <rect x="80" y="80" width="1040" height="8" fill="url(#goldGradient)" opacity="0.5" rx="4"/>
  
  <!-- Logo Section -->
  <g transform="translate(140, 140)">
    <!-- Logo circle -->
    <circle cx="40" cy="40" r="38" fill="white" stroke="${typeColors.primary}" stroke-width="2"/>
    
    <!-- RootShield text logo -->
    <!-- RootShield text logo -->
    <image
    href="https://rootshield.in/images/logo.png"
    x="15"
    y="15"
    width="50"
    height="50"
    preserveAspectRatio="xMidYMid meet"
/>
    
    <!-- Small decorative elements -->
    <circle cx="20" cy="20" r="3" fill="${typeColors.primary}" opacity="0.3"/>
    <circle cx="60" cy="20" r="3" fill="${typeColors.secondary}" opacity="0.3"/>
    <circle cx="20" cy="60" r="3" fill="${typeColors.accent}" opacity="0.3"/>
    <circle cx="60" cy="60" r="3" fill="${typeColors.primary}" opacity="0.3"/>
  </g>
  
  <!-- Certificate type badge -->
  <g transform="translate(900, 120)">
    <rect x="0" y="0" width="220" height="40" rx="20" fill="${typeColors.primary}" opacity="0.1"/>
    <text x="110" y="25" text-anchor="middle" font-family="Arial" font-size="14" fill="${typeColors.primary}" font-weight="bold">
      ${cert.certificateType.replace("_", " ")}
    </text>
  </g>
  
  <!-- Main Title with gold accent -->
  <text x="600" y="250" text-anchor="middle" font-family="Times New Roman, serif" font-size="58" font-weight="bold" fill="${typeColors.primary}">
    ${certificateTitle}
  </text>
  
  <text x="600" y="310" text-anchor="middle" font-family="Times New Roman, serif" font-size="30" fill="#6B7280" font-style="italic">
    ${subtitle}
  </text>
  
  <!-- Decorative line -->
  <line x1="400" y1="340" x2="800" y2="340" stroke="url(#goldGradient)" stroke-width="2" opacity="0.5"/>
  
  <!-- Presented to -->
  <text x="600" y="400" text-anchor="middle" font-family="Arial" font-size="16" fill="#9CA3AF" letter-spacing="2">
    THIS CERTIFICATE IS PROUDLY PRESENTED TO
  </text>
  
  <!-- Student Name with gold underline -->
  <text x="600" y="480" text-anchor="middle" font-family="Times New Roman, serif" font-size="52" font-weight="bold" fill="${typeColors.text}">
    ${studentName}
  </text>
  <line x1="350" y1="500" x2="850" y2="500" stroke="url(#goldGradient)" stroke-width="3"/>
  
  <!-- Main text -->
  <text x="600" y="550" text-anchor="middle" font-family="Arial" font-size="18" fill="#6B7280">
    ${mainText}
  </text>
  
  <!-- Course/Program Name with styling -->
  <text x="600" y="610" text-anchor="middle" font-family="Times New Roman, serif" font-size="36" font-weight="bold" fill="${typeColors.secondary}">
    ${courseName}${additionalDetails}
  </text>
  
  <!-- Additional details line (if any) -->
  ${cert.duration ? `<text x="600" y="650" text-anchor="middle" font-family="Arial" font-size="16" fill="#6B7280">Duration: ${cert.duration}</text>` : ""}
  
  <!-- Details line with grade and date -->
  <text x="600" y="${cert.duration ? 680 : 650}" text-anchor="middle" font-family="Arial" font-size="14" fill="#9CA3AF">
    ${cert.grade ? `Grade: ${cert.grade} • ` : ""}Issued: ${date}
  </text>
  
  <!-- Signatures section with seals -->
  <g transform="translate(200, 680)">
    <line x1="0" y1="0" x2="150" y2="0" stroke="${typeColors.primary}" stroke-width="2"/>
    <text x="75" y="25" text-anchor="middle" font-family="Arial" font-size="14" fill="#4B5563" font-weight="bold">
      ${teacherName}
    </text>
    <text x="75" y="45" text-anchor="middle" font-family="Arial" font-size="12" fill="#9CA3AF">
      Authorized Signatory
    </text>
    
    <!-- Decorative seal -->
    <circle cx="200" cy="-10" r="15" fill="none" stroke="${typeColors.primary}" stroke-width="1" opacity="0.3"/>
    <circle cx="200" cy="-10" r="10" fill="none" stroke="${typeColors.secondary}" stroke-width="1" opacity="0.3"/>
  </g>
  
  <g transform="translate(850, 680)">
    <line x1="0" y1="0" x2="150" y2="0" stroke="${typeColors.primary}" stroke-width="2"/>
    <text x="75" y="25" text-anchor="middle" font-family="Arial" font-size="14" fill="#4B5563" font-weight="bold">
      RootShield
    </text>
    <text x="75" y="45" text-anchor="middle" font-family="Arial" font-size="12" fill="#9CA3AF">
      Founder
    </text>
    
    <!-- Decorative seal -->
    <circle cx="-50" cy="-10" r="15" fill="none" stroke="${typeColors.primary}" stroke-width="1" opacity="0.3"/>
    <circle cx="-50" cy="-10" r="10" fill="none" stroke="${typeColors.secondary}" stroke-width="1" opacity="0.3"/>
  </g>
  
  <!-- Certificate ID and Verification (bottom) -->
  <text x="150" y="740" font-family="Arial" font-size="9" fill="#121314">
    Certificate ID: ${cert.certificateId}
  </text>
  <text x="1080" y="740" text-anchor="end" font-family="Arial" font-size="9" fill="#18181a">
    verify at: https://rootshield.in/verify/${cert.verificationHash || cert.certificateId}
  </text>
  
  <!-- Company info with gold border -->
  
  <text x="600" y="740" text-anchor="middle" font-family="Arial" font-size="11" fill="#4B5563">
    www.rootshield.in • info@rootshield.in
  </text>
  
  
</svg>`;
}
// module.exports = {
//   myCertificates: module.exports.myCertificates,
//   issueCertificate: module.exports.issueCertificate,
//   downloadCertificateImage: module.exports.downloadCertificateImage,
//   downloadCertificatePDF: module.exports.downloadCertificatePDF,
// };
