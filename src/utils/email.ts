
import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({
  to,
  subject,
  html,
}: EmailOptions) => {
  const emailUser = process.env.EMAIL_FROM;
  const emailPassword = process.env.EMAIL_APP_PASSWORD;

  if (!emailUser || !emailPassword) {
    throw new Error(
      'EMAIL_FROM or EMAIL_APP_PASSWORD is missing in environment variables.'
    );
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword.replace(/\s/g, ''),
    },
  });

  // Verify Gmail SMTP connection before sending
  await transporter.verify();

  const result = await transporter.sendMail({
    from: {
      name: 'ExcelArdor Recruitment Team',
      address: emailUser,
    },
    to,
    subject,
    html,
  });

  console.log('Email accepted by SMTP server:', {
    messageId: result.messageId,
    accepted: result.accepted,
    rejected: result.rejected,
  });

  return result;
};
