const User = require("../models/user");
const Servise = require("../models/services");
const Course = require("../models/cources");
const Blog = require("../models/blog");
const { all } = require("axios");

module.exports.homePage = async (req, res, next) => {
  if (!req.user) {
    const totalUsers = (await User.find()).length;
    const totalInstructors = (await User.find({ role: "admin" })).length;
    const totalCources = (await Course.find()).length;
    const cources = await Course.find().populate("teacher").limit(6);
    const popularCourse = await Course.findOne({ isPopular: true }).populate(
      "teacher",
    );

    const blogs = await Blog.find()
      .populate("author")
      .sort({ createdAt: -1 })
      .limit(6);

    res.render("rootshield/home.ejs", {
      totalUsers,
      showsplash: true,
      totalInstructors,
      totalCources,
      cources,
      popularCourse,
      blogs,
    });
  } else {
    next();
  }
};

module.exports.index = async (req, res) => {
  try {
    const totalUsers = (await User.find()).length;
    const totalInstructors = (await User.find({ role: "admin" })).length;
    const totalCources = (await Course.find()).length;
    const cources = await Course.find({ addInHomePage: true })
      .populate("teacher")
      .limit(6);
    const popularCourse = await Course.findOne({ isPopular: true }).populate(
      "teacher",
    );
    const blogs = await Blog.find()
      .populate("author")
      .sort({ createdAt: -1 })
      .limit(6);

    res.render("rootshield/home.ejs", {
      totalUsers,
      totalInstructors,
      totalCources,
      cources,
      popularCourse,
      blogs,
    });
  } catch (error) {
    console.log(error);
    req.flash("error", "Something went wrong!");
    res.redirect("/login");
  }
};

module.exports.profile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const links = await Link.find({ user: req.user._id });

    const totalLinks = links.length;
    const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);

    res.render("users/profile.ejs", {
      User: user,
      totalLinks,
      totalClicks,
      links,
    });
  } catch (err) {
    req.flash("error", "Unable to load profile");
    res.redirect("/");
  }
};

module.exports.dashBoard = (req, res) => {
  res.render("TinyLink/healthz.ejs");
};

module.exports.about = (req, res) => {
  res.render("others/about.ejs");
};
module.exports.privacy = (req, res) => {
  res.render("others/privacy.ejs");
};
module.exports.terms = (req, res) => {
  res.render("others/terms.ejs");
};
module.exports.contact = (req, res) => {
  res.render("others/contact.ejs");
};

//courses
module.exports.allCourses = async (req, res) => {
  try {
    // Query params
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const search = req.query.search || "";

    // Build search filter
    const searchFilter = search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { shortDescription: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Count total courses
    const totalCourses = await Course.countDocuments(searchFilter);

    // Fetch paginated courses
    const cources = await Course.find(searchFilter)
      .populate("teacher", "name")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.render("rootshield/courses.ejs", {
      cources,
      currentPage: page,
      totalPages: Math.ceil(totalCourses / limit),
      search,
    });
  } catch (error) {
    console.error(error);
    req.flash("error", "Something went wrong!");
    res.redirect("/login");
  }
};

module.exports.renderNewCourseForm = (req, res) => {
  res.render("rootshield/newcourse.ejs", { course: {} });
};

module.exports.createNewCourse = async (req, res) => {
  try {
    const {
      title,
      shortDescription,
      description,
      price,
      actualPrice,
      courceType,
      duration,
      lounchedDate,
      addInHomePage,
    } = req.body;

    const course = new Course({
      teacher: req.user._id, // assuming admin/teacher is logged in
      title,
      shortDescription,
      discription: description,
      price,
      actualPrice,
      courceType,
      duration,
      lounchedDate: lounchedDate ? new Date(lounchedDate) : undefined,
      addInHomePage: addInHomePage === "on",
    });

    // Optional: handle image if using file upload
    if (req.file) {
      course.image = {
        url: req.file.path, // or req.file.filename if using multer
        filename: req.file.filename,
      };
    }

    await course.save();
    req.flash("success", "Course created successfully!");
    res.redirect("/courses"); // adjust redirect as needed
  } catch (error) {
    console.log(error);
    req.flash("error", "Something went wrong!");
    res.redirect("/courses/new");
  }
};

// Render Edit Course Form
module.exports.renderEditCourseForm = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      req.flash("error", "Course not found");
      return res.redirect("/courses");
    }
    res.render("rootshield/editcourse.ejs", { course });
  } catch (error) {
    console.log(error);
    req.flash("error", "Something went wrong!");
    res.redirect("/courses");
  }
};

// Handle Edit Course Submission
module.exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const courseData = req.body;

    // If new image uploaded
    if (req.file) {
      courseData.image = {
        url: req.file.path, // or req.file.location if using cloudinary
        filename: req.file.filename,
      };
    }

    // Handle checkboxes
    courseData.isActive = req.body.isActive === "on";
    courseData.isPopular = req.body.isPopular === "on";
    courseData.addInHomePage = req.body.addInHomePage === "on";

    await Course.findByIdAndUpdate(id, courseData, { new: true });

    req.flash("success", "Course updated successfully");
    res.redirect("/courses");
  } catch (error) {
    console.log(error);
    req.flash("error", "Could not update course");
    res.redirect("/courses");
  }
};

// Toggle Popular
module.exports.togglePopular = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      req.flash("error", "Course not found");
      return res.redirect("/courses");
    }

    course.isPopular = !course.isPopular;
    await course.save();

    req.flash(
      "success",
      `Course "${course.title}" is now ${course.isPopular ? "Popular" : "Not Popular"}`,
    );
    res.redirect("/courses");
  } catch (error) {
    console.log(error);
    req.flash("error", "Could not update course popularity");
    res.redirect("/courses");
  }
};

// Delete Course
module.exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      req.flash("error", "Course not found");
      return res.redirect("/courses");
    }

    req.flash("success", `Course "${course.title}" deleted successfully`);
    res.redirect("/courses");
  } catch (error) {
    console.log(error);
    req.flash("error", "Could not delete course");
    res.redirect("/courses");
  }
};

// Toggle Active (PATCH)
module.exports.toggleActive = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);

    if (!course) {
      req.flash("error", "Course not found");
      return res.redirect("/courses");
    }

    // Flip the isActive boolean
    course.isActive = !course.isActive;
    await course.save();

    req.flash(
      "success",
      `Course "${course.title}" has been ${course.isActive ? "activated" : "deactivated"}`,
    );
    res.redirect("/courses");
  } catch (error) {
    console.log(error);
    req.flash("error", "Could not update course status");
    res.redirect("/courses");
  }
};

module.exports.enrollCourseForm = async (req, res) => {
  try {
    const courses = await Course.find();
    res.render("rootshield/enroll.ejs", { courses });
  } catch (error) {
    console.log(error);
    req.flash("error", "Please try again");
    res.redirect("/");
  }
};

module.exports.enrollInNewCource = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { description, paidPrice } = req.body;

    // User must be logged in
    if (!req.user) {
      req.flash("error", "Please login to enroll in a course");
      return res.redirect("/login");
    }

    // Find user
    const user = await User.findById(req.user._id);
    if (!user) {
      req.flash("error", "User not found. Please login again.");
      return res.redirect("/login");
    }

    // Check if user is blocked
    if (user.isBlocked) {
      req.flash(
        "error",
        "Your account has been blocked. Please contact support.",
      );
      return res.redirect("/contact");
    }

    // Find course
    const course = await Course.findById(courseId);
    if (!course) {
      req.flash("error", "Course not found");
      return res.redirect("/enroll");
    }

    // Check if course is active
    if (!course.isActive) {
      req.flash("error", "This course is currently unavailable");
      return res.redirect("/enroll");
    }

    // Check already enrolled
    const alreadyEnrolled = course.students.some(
      (student) => student.user.toString() === user._id.toString(),
    );

    if (alreadyEnrolled) {
      req.flash("error", "You are already enrolled in this course");
      return res.redirect("/enroll");
    }

    // Add student to course
    course.students.push({
      user: user._id,
      paidPrice: paidPrice ? Number(paidPrice) : 0,
      description: description || "",
      enrolledAt: new Date(),
      isSeen: false,
    });

    await course.save();

    req.flash("success", `Successfully enrolled in "${course.title}"`);
    return res.redirect("/courses");
  } catch (error) {
    console.error("Enrollment error:", error);
    req.flash("error", "Enrollment failed. Please try again.");
    return res.redirect("/enroll");
  }
};

module.exports.enrollCourse = async (req, res) => {
  const redirectUrl = res.locals.redirectUrl || "/";
  try {
    const { courseId, paidPrice, name, email, mobile, description } = req.body;

    if (!courseId || !name || !email || !mobile) {
      req.flash("error", "Please fill all required fields");
      return res.redirect(redirectUrl);
    }

    const user = req.user;

    // 🔹 Update user mobile if not exists
    if (!user.mobile) {
      user.mobile = mobile;
      await user.save();
    }

    // 🔹 Find course
    const course = await Course.findById(courseId);

    if (!course) {
      req.flash("error", "Course not found");
      return res.redirect(redirectUrl);
    }

    // 🔹 Check already enrolled
    const alreadyEnrolled = course.students.some(
      (s) => s.user.toString() === user._id.toString(),
    );

    if (alreadyEnrolled) {
      req.flash("info", "You are already enrolled in this course");
      return res.redirect(redirectUrl);
    }

    // 🔹 Push student data
    course.students.push({
      user: user._id,
      paidPrice: Number(paidPrice),
      description: description || "",
      enrolledAt: new Date(),
      isSeen: false,
    });

    await course.save();

    req.flash("success", "Enrollment successful 🎉");
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error(error);
    req.flash("error", "Something went wrong. Please try again");
    return res.redirect(redirectUrl);
  }
};

// view cource
// const course = await Course.findById(req.params.id);

// const dynamicMeta = {
//   title: course.title + " | RootShield Courses",
//   description: course.shortDescription,
//   keywords: course.keywords.join(", "),
//   image: course.thumbnail,
// };

// res.render("courseView", {
//   course,
//   meta: dynamicMeta,
// });

module.exports.viewCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("teacher", "name email mobile profileImage")
      .populate("students.user", "name email")
      .lean(); // Use lean() for better performance

    if (!course) {
      req.flash("error", "Course not found");
      return res.redirect("/courses");
    }

    // Get related courses (same category, excluding current course)
    const relatedCourses = await Course.find({
      courceType: course.courceType,
      _id: { $ne: course._id },
      isActive: true,
    })
      .limit(4)
      .select("title image price shortDescription courceType")
      .populate("teacher", "name")
      .lean();

    // Check if current user is enrolled (if user is logged in)
    let isEnrolled = false;
    let userEnrollment = null;

    if (req.user) {
      const enrollment = course.students?.find(
        (student) => student.user?._id?.toString() === req.user._id.toString(),
      );
      if (enrollment) {
        isEnrolled = true;
        userEnrollment = enrollment;
      }
    }

    // Calculate course statistics
    const totalStudents = course.students?.length || 0;
    const totalRevenue =
      course.students?.reduce(
        (sum, student) => sum + (student.paidPrice || 0),
        0,
      ) || 0;

    const dynamicMeta = {
      title: course.title + " | RootShield Courses",
      description: course.shortDescription,
      // keywords: course.keywords,
      image: course.image.url,
    };

    res.render("rootshield/viewCourse.ejs", {
      meta: dynamicMeta,
      course,
      relatedCourses,
      isEnrolled,
      userEnrollment,
      totalStudents,
      totalRevenue,
      currentUser: req.user,
      pageTitle: course.title,
    });
  } catch (err) {
    console.error("Error viewing course:", err);
    req.flash("error", "Failed to load course details");
    res.redirect("/courses");
  }
};
