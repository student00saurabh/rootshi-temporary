if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const crypto = require("crypto");
const passport = require("passport");
const brevo = require("@getbrevo/brevo");

const GoogleStrategy = require("passport-google-oauth20").Strategy;
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const homeRouter = require("./routes/home.js");
const userRouter = require("./routes/user.js");
const resetRout = require("./routes/authRoutes.js");
const user = require("./models/user.js");
const adminRouter = require("./routes/admin.js");

const dbUrl = process.env.ATLUSDB_URL;

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dbUrl);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const store = MongoStore.create({
  mongoUrl: dbUrl,
  // crypto: {
  //   secret: process.env.SECRET,
  // },
  touchAfter: 24 * 3600,
});

store.on("error", (err) => {
  console.log("error in mongo session store", err);
});

const sessionOptions = {
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    expire: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    //httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(
  new LocalStrategy({ usernameField: "email" }, User.authenticate()),
);

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY,
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.DOMAIN + "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let email = profile.emails[0].value;
        let name = profile.displayName;

        // Check existing user
        let existingUser = await User.findOne({ email });

        if (existingUser) {
          return done(null, existingUser);
        }

        const username = email.split("@")[0];
        // Create new user
        let newUser = new User({
          name,
          email,
          googleId: profile.id,
          isvalid: true,
          username,
        });

        await newUser.save();

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; background:#ffffff; border-radius:12px; padding:0; overflow:hidden; border:1px solid #e6e6e6;">
    
            <!-- Header Section -->
              <div style="background:#1A2B4C; padding:20px; text-align:center;">
                  <img src="https://thecubicals.online/images/logo.png" style="height:55px; margin-bottom:10px;">
                  <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:600;">
                    Welcome to TheCubicals
                  </h1>
              </div>

              <!-- Main Content -->
              <div style="padding:25px 30px; background:#f7f9fc;">
                <h2 style="color:#1A2B4C; margin-top:0; font-size:20px;">
                  Hello ${newUser.name || newUser.username || "User"},
                </h2>

                <p style="color:#333; line-height:1.6; font-size:15px;">
                  Thank you for joining <strong>TheCubicals</strong>! We’re thrilled to have you as a part of our growing community of learners, creators, and thinkers.
                </p>

                <p style="color:#333; line-height:1.6; font-size:15px; margin-bottom:10px;">
                  With your new account, you can now explore:
                </p>

                <ul style="font-size:15px; color:#444; line-height:1.7; padding-left:18px;">
                  <li>Write and publish your own blogs</li>
                  <li>Comment, discuss, and share your thoughts</li>
                  <li>Access useful educational tools & resources</li>
                  <li>Explore trending and informative topics</li>
                </ul>

                <!-- CTA Button -->
                <div style="text-align:center; margin:25px 0;">
                  <a href="https://thecubicals.online" 
                    style="background:#A23E48; color:#ffffff; padding:12px 28px; text-decoration:none; border-radius:6px; font-size:16px; display:inline-block;">
                    Visit TheCubicals
                  </a>
                </div>

                <p style="color:#444; font-size:15px; line-height:1.6;">
                  If you ever need help or have questions, feel free to reach out:
                </p>

                <p>
                  <a href="https://thecubicals.online/thecubicals/contact" style="color:#A23E48; font-weight:600; font-size:15px;">
                    Contact Support
                  </a>
                </p>

              </div>

              <!-- Footer -->
              <div style="background:#f1f1f1; padding:15px 20px; text-align:center;">
                <p style="color:#777; font-size:12px; margin:0;">
                  This is an automated email. Please do not reply.
                </p>
                <p style="color:#aaa; font-size:11px; margin-top:6px;">
                  © ${new Date().getFullYear()} TheCubicals. All rights reserved.
                </p>
              </div>

            </div>
         `;

        try {
          await apiInstance.sendTransacEmail({
            sender: { email: "thecubicals123@gmail.com", name: "TheCubicals" },
            to: [{ email: newUser.email }],
            subject: "Welcome to TheCubicals!",
            htmlContent: htmlContent,
          });

          console.log("✅ Welcome email sent to:", newUser.email);
        } catch (emailErr) {
          console.error("❌ Failed to send welcome email:", emailErr);
        }

        return done(null, newUser);
      } catch (err) {
        return done(err, null);
      }
    },
  ),
);

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user || null;
  res.locals.currentPath = req.path;
  next();
});

app.get("/", async (req, res, next) => {
  if (!req.user) {
    res.render("rootshield/home.ejs", { user: null });
  } else {
    next();
  }
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (req, res) => {
    req.flash("success", "Logged in using Google!");
    res.redirect("/");
  },
);

app.use("/", userRouter);
app.use("/", homeRouter);
app.use("/", resetRout);
app.use("/admin", adminRouter);

app.all(/.*/, (req, res, next) => {
  next(new ExpressError(404, "Page not found!"));
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err); // agar response already sent ho, dobara send mat karo
  }
  let { statusCode = 500, message = "Something went wrong!" } = err;
  res.status(statusCode).render("error.ejs", { message, statusCode });
});

app.listen(3000, () => {
  console.log(`Zoopito is working at ${3000}`);
});
