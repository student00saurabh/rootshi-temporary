const User = require("../models/user");
const crypto = require("crypto");
const Contact = require("../models/contact");
const Subscriber = require("../models/subscriber");

module.exports.index = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    // 🔐 Security: only active admins should reach here
    // (Assuming middleware already checks role)

    const [salesTeam, totalCount] = await Promise.all([
      SalesTeam.find()
        .populate("user", "name email mobile") // minimal safe fields
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      SalesTeam.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.render("admin/salesteam/index", {
      currentUser: req.user,
      salesTeam,
      currentPage: page,
      totalPages,
      totalCount,
      limit,
    });
  } catch (error) {
    console.error("SalesTeam Index Error:", error);
    req.flash("error", "Unable to load sales team data");
    res.redirect("/admin");
  }
};

// Update your controller
module.exports.contactSubmissions = async (req, res) => {
  try {
    const { filter } = req.query;
    let query = {};

    // Apply filters
    if (filter === "unread") {
      query.isSeen = false;
    } else if (filter === "read") {
      query.isSeen = true;
    }

    const contacts = await Contact.find(query)
      .populate("user")
      .sort({ msgDate: -1 }); // Newest first

    res.render("admin/contact.ejs", {
      contacts,
      filter: filter || "all",
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to load contact submissions");
    res.redirect("/admin");
  }
};

// Add these new controller functions
module.exports.toggleSeen = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findById(id);

    if (!contact) {
      req.flash("error", "Contact not found");
      return res.redirect("/admin/contacts");
    }

    contact.isSeen = !contact.isSeen;
    await contact.save();

    req.flash("success", `Marked as ${contact.isSeen ? "read" : "unread"}`);
    res.redirect("/admin/contacts");
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to update contact status");
    res.redirect("/admin/contacts");
  }
};

module.exports.getContactDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findById(id).populate("user");

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json(contact);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch contact details" });
  }
};

module.exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    await Contact.findByIdAndDelete(id);

    req.flash("success", "Contact message deleted successfully");
    res.redirect("/admin/contacts");
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to delete contact message");
    res.redirect("/admin/contacts");
  }
};

module.exports.subscribers = async (req, res) => {
  try {
    const { filter, search } = req.query;

    let query = {};

    // Apply status filter
    if (filter === "active") {
      query.isActive = true;
    } else if (filter === "inactive") {
      query.isActive = false;
    }

    // Apply search filter
    if (search) {
      query.email = { $regex: search, $options: "i" };
    }

    const subscribers = await Subscriber.find(query).sort({ subscribedAt: -1 });

    res.render("admin/subscribers.ejs", {
      subscribers,
      filter: filter || "all",
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to load subscribers");
    res.redirect("/admin");
  }
};

module.exports.createSubscriber = async (req, res) => {
  try {
    const { email, isActive = true } = req.body;

    // Check if subscriber already exists
    const existingSubscriber = await Subscriber.findOne({
      email: email.toLowerCase(),
    });
    if (existingSubscriber) {
      return res.status(400).json({
        message: "Subscriber with this email already exists",
      });
    }

    const subscriber = new Subscriber({
      email: email.toLowerCase(),
      isActive,
      subscribedAt: new Date(),
    });

    await subscriber.save();

    res.status(201).json({
      success: true,
      message: "Subscriber added successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Failed to add subscriber",
    });
  }
};

module.exports.toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const subscriber = await Subscriber.findById(id);

    if (!subscriber) {
      req.flash("error", "Subscriber not found");
      return res.redirect("/admin/subscribers");
    }

    subscriber.isActive = !subscriber.isActive;
    await subscriber.save();

    req.flash(
      "success",
      `Subscriber ${subscriber.isActive ? "activated" : "deactivated"} successfully`,
    );
    res.redirect("/admin/subscribers");
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to update subscriber status");
    res.redirect("/admin/subscribers");
  }
};

module.exports.deleteSubscriber = async (req, res) => {
  try {
    const { id } = req.params;
    await Subscriber.findByIdAndDelete(id);

    req.flash("success", "Subscriber deleted successfully");
    res.redirect("/admin/subscribers");
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to delete subscriber");
    res.redirect("/admin/subscribers");
  }
};

module.exports.bulkAction = async (req, res) => {
  try {
    const { action, subscriberIds } = req.body;

    if (!action || !subscriberIds || subscriberIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request" });
    }

    switch (action) {
      case "activate":
        await Subscriber.updateMany(
          { _id: { $in: subscriberIds } },
          { $set: { isActive: true } },
        );
        break;

      case "deactivate":
        await Subscriber.updateMany(
          { _id: { $in: subscriberIds } },
          { $set: { isActive: false } },
        );
        break;

      case "delete":
        await Subscriber.deleteMany({ _id: { $in: subscriberIds } });
        break;

      default:
        return res
          .status(400)
          .json({ success: false, message: "Invalid action" });
    }

    res.json({ success: true, message: "Bulk action completed successfully" });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to perform bulk action" });
  }
};

module.exports.exportSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ subscribedAt: -1 });

    let csvContent = "Email,Status,Subscribed Date,Subscribed Time\n";

    subscribers.forEach((subscriber) => {
      const date = new Date(subscriber.subscribedAt);
      const formattedDate = date.toLocaleDateString();
      const formattedTime = date.toLocaleTimeString();
      const status = subscriber.isActive ? "Active" : "Inactive";

      csvContent += `"${subscriber.email}","${status}","${formattedDate}","${formattedTime}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=subscribers-${new Date().toISOString().split("T")[0]}.csv`,
    );
    res.send(csvContent);
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to export subscribers");
    res.redirect("/admin/subscribers");
  }
};
