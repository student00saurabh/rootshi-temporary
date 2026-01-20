const brevo = require("@getbrevo/brevo");

module.exports.sendWelcomeEmail = async (user) => {
  const apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(
    brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY,
  );

  const htmlContent = `
    <div style="font-family:Arial; max-width:600px; margin:auto; padding:24px;">
      <h1 style="color:#1e3a8a;">Welcome to Root Shield 🛡️</h1>

      <p>Hello <strong>${user.name || "User"}</strong>,</p>

      <p>
        Your account has been successfully verified and you are now part of
        <strong>Root Shield</strong>.
      </p>

      <p>
        You can now access dashboards, security tools, and platform resources.
      </p>

      <p>
        Stay secure,<br>
        <strong>Team Root Shield</strong>
      </p>

      <hr>
      <p style="font-size:12px;color:#777;">
        This is an automated email. Please do not reply.
      </p>
    </div>
  `;

  await apiInstance.sendTransacEmail({
    sender: {
      email: "info@rootshield.in",
      name: "Root Shield",
    },
    to: [{ email: user.email }],
    subject: "Welcome to Root Shield",
    htmlContent,
  });
};
