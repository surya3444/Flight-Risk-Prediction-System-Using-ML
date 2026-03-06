const { Resend } = require('resend');

// Initialize Resend with your API key from the .env file
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (email, subject, text) => {
  try {
    const { data, error } = await resend.emails.send({
      // Resend provides this testing domain out of the box so you don't need to buy a custom domain yet
      from: 'FlightRisk AI <onboarding@resend.dev>', 
      to: email,
      subject: subject,
      text: text,
    });

    if (error) {
      console.error("Resend API Error:", error);
      throw new Error(error.message);
    }
    
    console.log("Email sent successfully via HTTP API to:", email);
  } catch (error) {
    console.error("Email sending failed:", error.message);
    throw new Error("Email could not be sent");
  }
};

module.exports = sendEmail;