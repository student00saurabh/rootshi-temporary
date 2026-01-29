const User = require("../models/user");
const Servise = require("../models/services");
const Course = require("../models/cources");

module.exports.homePage = async (req, res, next) => {
  if (!req.user) {
    const totalUsers = (await User.find()).length;
    const totalInstructors = (await User.find({ role: "admin" })).length;
    const totalCources = (await Course.find()).length;
    const cources = await Course.find().populate("teacher").limit(6);
    const popularCourse = await Course.findOne({ isPopular: true }).populate(
      "teacher",
    );

    res.render("rootshield/home.ejs", {
      totalUsers,
      totalInstructors,
      totalCources,
      cources,
      popularCourse,
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
    res.render("rootshield/home.ejs", {
      totalUsers,
      totalInstructors,
      totalCources,
      cources,
      popularCourse,
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
