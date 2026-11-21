
import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/utils/supabase/server';
import { sendEmail } from '@/utils/email';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

const BUCKET_NAME = 'resumes';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[char];
  });
}

export async function POST(request: Request) {
  let uploadedFilePath: string | null = null;

  try {
    const formData = await request.formData();

    // 1. Extract and normalize form fields
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const phone = String(formData.get('phone') || '').trim();
    const experience = String(formData.get('experience') || '').trim();
    const company = String(formData.get('company') || '').trim();
    const location = String(formData.get('location') || '').trim();
    const message = String(formData.get('message') || '').trim();
    const position = String(formData.get('position') || '').trim();

    const fileValue = formData.get('file');
    const file =
      fileValue instanceof File && fileValue.size > 0
        ? fileValue
        : null;

    // 2. Full name validation
    if (!name) {
      return NextResponse.json(
        { error: 'Full Name is required.' },
        { status: 400 }
      );
    }

    if (
      name.length < 3 ||
      name.length > 100 ||
      !/^[A-Za-z\s'-]+$/.test(name) ||
      (name.match(/[A-Za-z]/g) || []).length < 2
    ) {
      return NextResponse.json(
        { error: 'Please enter a valid full name.' },
        { status: 400 }
      );
    }

    // 3. Email validation
    const emailRegex =
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

    if (
      !email ||
      email.length > 150 ||
      /\s/.test(email) ||
      !emailRegex.test(email)
    ) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // 4. Phone validation
    if (!/^\d{10}$/.test(phone) || /^0{10}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Phone Number must be exactly 10 valid digits.' },
        { status: 400 }
      );
    }

    // 5. Position validation
    if (!position || position.length > 150) {
      return NextResponse.json(
        { error: 'Please select a valid position.' },
        { status: 400 }
      );
    }

    // 6. Experience validation
    if (!/^\d+(\.\d+)?$/.test(experience)) {
      return NextResponse.json(
        { error: 'Enter valid years of experience.' },
        { status: 400 }
      );
    }

    const expNum = Number(experience);

    if (!Number.isFinite(expNum) || expNum < 0 || expNum > 50) {
      return NextResponse.json(
        { error: 'Years of Experience must be between 0 and 50.' },
        { status: 400 }
      );
    }

    // 7. Current company validation (optional)
    if (
      company &&
      (company.length > 100 ||
        !/^[A-Za-z0-9\s&.,'()-]+$/.test(company))
    ) {
      return NextResponse.json(
        { error: 'Please enter a valid company name.' },
        { status: 400 }
      );
    }

    // 8. Location validation
    if (
      !location ||
      location.length < 2 ||
      location.length > 100 ||
      !/^[A-Za-z\s,-]+$/.test(location) ||
      (location.match(/[A-Za-z]/g) || []).length < 2
    ) {
      return NextResponse.json(
        { error: 'Please enter a valid location.' },
        { status: 400 }
      );
    }

    // 9. Cover letter validation
    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Cover message must not exceed 2,000 characters.' },
        { status: 400 }
      );
    }

    // 10. Resume validation
    if (!file) {
      return NextResponse.json(
        { error: 'Resume upload is required.' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Resume file size exceeds the 5 MB limit.' },
        { status: 400 }
      );
    }

    const rawFileName = file.name || '';
    const isPdf = /\.pdf$/i.test(rawFileName);
    const isDocx = /\.docx$/i.test(rawFileName);

    if (!isPdf && !isDocx) {
      return NextResponse.json(
        { error: 'Only PDF and DOCX resumes are allowed.' },
        { status: 400 }
      );
    }

    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      'application/octet-stream',
    ];

    if (file.type && !allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported resume file type.' },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    if (isPdf) {
      const validPdf =
        fileBuffer.length >= 5 &&
        fileBuffer.subarray(0, 5).toString() === '%PDF-';

      if (!validPdf) {
        return NextResponse.json(
          { error: 'The uploaded file is not a valid PDF.' },
          { status: 400 }
        );
      }
    }

    if (isDocx) {
      const validZip =
        fileBuffer.length >= 4 &&
        fileBuffer[0] === 0x50 &&
        fileBuffer[1] === 0x4b &&
        fileBuffer[2] === 0x03 &&
        fileBuffer[3] === 0x04;

      if (!validZip) {
        return NextResponse.json(
          { error: 'The uploaded file is not a valid DOCX file.' },
          { status: 400 }
        );
      }
    }

    // 11. Prepare application and resume details
    const applicationId = uuidv4();

    const sanitizedFileName = rawFileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/\.{2,}/g, '.');

    const fileName = `${applicationId}/${sanitizedFileName}`;

    const uploadContentType = isPdf
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    const supabase = createServerComponentClient();

    // 12. Upload resume to Supabase Storage
    console.log('Starting resume upload...');

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType: uploadContentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Resume upload error:', uploadError);

      return NextResponse.json(
        { error: `Failed to upload resume: ${uploadError.message}` },
        { status: 500 }
      );
    }

    uploadedFilePath = uploadData.path;

    console.log('Resume uploaded successfully.');

    // 13. Save application in Supabase Database
    console.log('Saving application in excelardor table...');

    const { error: dbError } = await supabase
      .from('excelardor')
      .insert({
        id: applicationId,
        full_name: name,
        email: email,
        phone: phone,
        position: position,
        years_of_experience: expNum,
        current_company: company || null,
        location: location,
        resume_path: uploadedFilePath,
        resume_file_name: rawFileName,
        resume_file_type: uploadContentType,
        cover_letter: message || null,
      });

    if (dbError) {
      console.error('Database insert error:', {
        message: dbError.message,
        code: dbError.code,
        details: dbError.details,
        hint: dbError.hint,
      });

      // Remove uploaded resume if database insert fails
      const { error: cleanupError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([uploadedFilePath]);

      if (cleanupError) {
        console.error('Resume cleanup error:', cleanupError.message);
      }

      uploadedFilePath = null;

      return NextResponse.json(
        { error: 'Failed to save application.' },
        { status: 500 }
      );
    }

    console.log('Application saved successfully.');

    // 14. Prepare safe email values
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safePosition = escapeHtml(position);
    const safeExperience = escapeHtml(experience);
    const safeCompany = escapeHtml(company || 'N/A');
    const safeLocation = escapeHtml(location);
    const safeMessage = escapeHtml(message || 'N/A').replace(/\n/g, '<br/>');

    const baseUrl = (
      process.env.NEXT_PUBLIC_BASE_URL || 'https://excelardor.com'
    ).replace(/\/+$/, '');

    const adminEmail =
      process.env.APPLICATION_NOTIFICATION_EMAIL ||
      'excelardor@gmail.com';

    // 15. Send HR notification email
    let adminEmailSent = false;

    try {
      console.log('Sending HR notification email...');

      await sendEmail({
        to: adminEmail,
        subject: `New Job Application - ${position} - ${name}`,
        html: `
          <h2>New Job Application Received</h2>

          <p><strong>Applicant Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Phone:</strong> ${safePhone}</p>
          <p><strong>Position Applied:</strong> ${safePosition}</p>
          <p><strong>Experience:</strong> ${safeExperience} Years</p>
          <p><strong>Current Company:</strong> ${safeCompany}</p>
          <p><strong>Location:</strong> ${safeLocation}</p>
          <p><strong>Cover Message:</strong><br/>${safeMessage}</p>
          <p><strong>Application ID:</strong> ${applicationId}</p>
          <p><strong>Submission Date:</strong> ${new Date().toLocaleString('en-IN')}</p>

          <hr/>

          <p>
            <a href="${baseUrl}/admin">Open Admin Panel</a>
          </p>

          <p>
            The resume is stored securely in the ExcelArdor Supabase Storage bucket.
          </p>
        `,
      });

      adminEmailSent = true;
      console.log('HR notification email sent.');
    } catch (emailError) {
      console.error('HR notification email failed:', emailError);
    }

    // 16. Send candidate confirmation email
    let candidateEmailSent = false;

    try {
      console.log('Sending candidate confirmation email...');

      await sendEmail({
        to: email,
        subject: 'Application Received - ExcelArdor',
        html: `
          <h2>Application Received Successfully</h2>

          <p>Dear ${safeName},</p>

          <p>
            Thank you for your interest in ExcelArdor.
            We have successfully received your application for
            <strong>${safePosition}</strong>.
          </p>

          <p>
            Our recruitment team will review your application
            and contact you if your profile matches our requirements.
          </p>

          <p><strong>Application ID:</strong> ${applicationId}</p>

          <br/>

          <p>Regards,<br/>ExcelArdor Recruitment Team</p>
        `,
      });

      candidateEmailSent = true;
      console.log('Candidate confirmation email sent.');
    } catch (emailError) {
      console.error('Candidate confirmation email failed:', emailError);
    }

    // 17. Update email delivery status
    const allEmailsSent = adminEmailSent && candidateEmailSent;

    const { error: emailStatusError } = await supabase
      .from('excelardor')
      .update({
        email_sent: allEmailsSent,
        email_sent_at: allEmailsSent ? new Date().toISOString() : null,
      })
      .eq('id', applicationId);

    if (emailStatusError) {
      console.error(
        'Email status update failed:',
        emailStatusError.message
      );
    }

    // 18. Return success
    return NextResponse.json(
      {
        success: true,
        message: 'Your application has been submitted successfully.',
        applicationId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected application submission error:', error);

    // Attempt cleanup if a resume was uploaded but the request failed
    if (uploadedFilePath) {
      try {
        const supabase = createServerComponentClient();

        const { error: cleanupError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([uploadedFilePath]);

        if (cleanupError) {
          console.error('Resume cleanup error:', cleanupError.message);
        }
      } catch (cleanupError) {
        console.error('Resume cleanup attempt failed:', cleanupError);
      }
    }

    return NextResponse.json(
      {
        error: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}
