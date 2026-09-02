export async function sendOtpEmail(toEmail: string, otp: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@yourdomain.com";
  const senderName = process.env.BREVO_SENDER_NAME || "Project Loop";

  if (!apiKey) {
    console.error("Missing BREVO_API_KEY environment variable.");
    return false;
  }

  const url = "https://api.brevo.com/v3/smtp/email";

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: [
      {
        email: toEmail,
      },
    ],
    subject: "Your Password Reset OTP - Project Loop",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Use the OTP below to proceed.</p>
        <div style="background-color: #f4f4f4; padding: 16px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 8px;">
          ${otp}
        </div>
        <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Brevo Email API Error:", response.status, errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return false;
  }
}
