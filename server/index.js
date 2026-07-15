const express = require('express');
const cors = require('cors');
const pool = require('./db');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Simple in-memory session store (for demo - use Redis in production)
const sessions = new Map();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Base URL for the frontend (change this in production)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Semaphore SMS API configuration
const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY || '';
const SEMAPHORE_SENDER_NAME = process.env.SEMAPHORE_SENDER_NAME || 'CLINIC';

// Function to send SMS via Semaphore
const sendSMS = async (phoneNumber, message) => {
  if (!SEMAPHORE_API_KEY) {
    console.log('SMS not sent - SEMAPHORE_API_KEY not configured');
    return false;
  }

  try {
    // Format phone number for Philippines (remove leading 0, add 63)
    let formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '63' + formattedNumber.substring(1);
    } else if (!formattedNumber.startsWith('63')) {
      formattedNumber = '63' + formattedNumber;
    }

    const response = await fetch('https://api.semaphore.co/api/v4/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: SEMAPHORE_API_KEY,
        number: formattedNumber,
        message: message,
        sendername: SEMAPHORE_SENDER_NAME
      })
    });

    const data = await response.json();
    console.log('SMS sent to:', formattedNumber, data);
    return true;
  } catch (error) {
    console.error('SMS error:', error);
    return false;
  }
};

// Function to send confirmation email
const sendConfirmationEmail = async (appointment) => {
  const cancelUrl = `${FRONTEND_URL}?page=my-appointment&token=${appointment.cancel_token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: appointment.email,
    subject: 'Appointment Confirmation - HealthCare Clinic',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1c1917; padding: 20px; text-align: center;">
          <h1 style="color: #E4FE7B; margin: 0;">HealthCare Clinic</h1>
        </div>
        <div style="padding: 30px; background: #f5f5f5;">
          <h2 style="color: #1c1917;">Appointment Confirmed!</h2>
          <p>Dear <strong>${appointment.full_name}</strong>,</p>
          <p>Your appointment has been successfully booked. Here are your details:</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Service:</strong> ${appointment.service_type}</p>
            <p><strong>Date:</strong> ${appointment.preferred_date}</p>
            <p><strong>Time:</strong> ${appointment.preferred_time}</p>
            <p><strong>Reference ID:</strong> #${appointment.id}</p>
          </div>

          <p style="color: #666;">Please arrive 10 minutes before your scheduled time.</p>

          <div style="margin: 25px 0; text-align: center;">
            <a href="${cancelUrl}" style="display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Cancel Appointment
            </a>
            <p style="color: #888; font-size: 12px; margin-top: 10px;">
              Or manage your appointment at: <a href="${cancelUrl}" style="color: #1c1917;">${FRONTEND_URL}?page=my-appointment</a>
            </p>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #888; font-size: 12px;">
              HealthCare Clinic<br>
              Cantecson, Gairan, Bogo City, Cebu<br>
              Phone: +63 912 345 6789
            </p>
          </div>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Confirmation email sent to:', appointment.email);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Create a new appointment
app.post('/api/appointments', async (req, res) => {
  try {
    const {
      fullName,
      phoneNumber,
      email,
      serviceType,
      preferredDate,
      preferredTime,
      notes
    } = req.body;

    // Validate required fields
    if (!fullName || !phoneNumber || !email || !serviceType || !preferredDate || !preferredTime) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields'
      });
    }

    // Check for overlapping appointments (same date and time)
    const overlapCheck = await pool.query(
      `SELECT * FROM appointments
       WHERE preferred_date = $1
       AND preferred_time = $2
       AND status != 'cancelled'`,
      [preferredDate, preferredTime]
    );

    if (overlapCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Sorry, the time slot ${preferredTime} on ${preferredDate} is already booked. Please choose a different time.`
      });
    }

    // Generate a unique cancel token
    const cancelToken = Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);

    // Insert into database
    const query = `
      INSERT INTO appointments (full_name, phone_number, email, service_type, preferred_date, preferred_time, notes, cancel_token)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [fullName, phoneNumber, email, serviceType, preferredDate, preferredTime, notes || '', cancelToken];
    const result = await pool.query(query, values);

    // Send confirmation email and SMS (don't wait for it, don't fail if it fails)
    const appointment = result.rows[0];
    sendConfirmationEmail(appointment).catch(err => console.error('Email error:', err));

    // Send SMS confirmation
    const smsMessage = `Hi ${appointment.full_name}, your appointment at HealthCare Clinic is confirmed for ${appointment.preferred_date} at ${appointment.preferred_time}. Ref#${appointment.id}`;
    sendSMS(appointment.phone_number, smsMessage).catch(err => console.error('SMS error:', err));

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully! A confirmation email has been sent.',
      appointment: appointment
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to book appointment. Please try again.'
    });
  }
});

// Get available time slots for a specific date
app.get('/api/available-slots', async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    // Check if date is blocked (holiday/closed)
    const blockedCheck = await pool.query(
      'SELECT * FROM blocked_dates WHERE blocked_date = $1',
      [date]
    );

    if (blockedCheck.rows.length > 0) {
      return res.json({
        success: true,
        date,
        availableSlots: [],
        bookedSlots: [],
        blocked: true,
        blockReason: blockedCheck.rows[0].reason
      });
    }

    // All possible time slots
    const allSlots = [
      '9:00 AM', '10:00 AM', '11:00 AM',
      '2:00 PM', '3:00 PM', '4:00 PM'
    ];

    // Get booked slots for the date
    const bookedResult = await pool.query(
      `SELECT preferred_time FROM appointments
       WHERE preferred_date = $1
       AND status != 'cancelled'`,
      [date]
    );

    const bookedSlots = bookedResult.rows.map(row => row.preferred_time);
    const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));

    res.json({
      success: true,
      date,
      availableSlots,
      bookedSlots,
      blocked: false
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available slots'
    });
  }
});

// Get all appointments (for admin purposes)
app.get('/api/appointments', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM appointments ORDER BY created_at DESC'
    );
    res.json({
      success: true,
      appointments: result.rows
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments'
    });
  }
});

// Get a single appointment by ID
app.get('/api/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM appointments WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      appointment: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment'
    });
  }
});

// Update appointment status
app.patch('/api/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      'UPDATE appointments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      appointment: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment'
    });
  }
});

// ==================== ADMIN AUTHENTICATION ====================

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check against environment variables (simple approach)
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'admin123';

    if (username === adminUser && password === adminPass) {
      // Generate simple session token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessions.set(token, { username, loginTime: new Date() });

      res.json({
        success: true,
        message: 'Login successful',
        token
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Verify admin token
app.get('/api/admin/verify', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token && sessions.has(token)) {
    res.json({ success: true, valid: true });
  } else {
    res.status(401).json({ success: false, valid: false });
  }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    sessions.delete(token);
  }

  res.json({ success: true, message: 'Logged out successfully' });
});

// ==================== PATIENT SELF-SERVICE ====================

// Look up appointment by email and reference ID
app.post('/api/patient/lookup', async (req, res) => {
  try {
    const { email, referenceId } = req.body;

    if (!email || !referenceId) {
      return res.status(400).json({
        success: false,
        message: 'Email and Reference ID are required'
      });
    }

    const result = await pool.query(
      `SELECT id, full_name, phone_number, email, service_type, preferred_date, preferred_time, notes, status, cancel_token, created_at
       FROM appointments
       WHERE LOWER(email) = LOWER($1) AND id = $2`,
      [email, referenceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found. Please check your email and reference ID.'
      });
    }

    res.json({
      success: true,
      appointment: result.rows[0]
    });
  } catch (error) {
    console.error('Lookup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to look up appointment'
    });
  }
});

// Get appointment by cancel token (for email link)
app.get('/api/patient/appointment/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      `SELECT id, full_name, phone_number, email, service_type, preferred_date, preferred_time, notes, status, cancel_token, created_at
       FROM appointments
       WHERE cancel_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or link has expired'
      });
    }

    res.json({
      success: true,
      appointment: result.rows[0]
    });
  } catch (error) {
    console.error('Token lookup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment'
    });
  }
});

// Patient cancels their own appointment
app.post('/api/patient/cancel', async (req, res) => {
  try {
    const { cancelToken, reason } = req.body;

    if (!cancelToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cancellation request'
      });
    }

    // Get the appointment
    const appointment = await pool.query(
      'SELECT * FROM appointments WHERE cancel_token = $1',
      [cancelToken]
    );

    if (appointment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const apt = appointment.rows[0];

    // Check if already cancelled
    if (apt.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This appointment has already been cancelled'
      });
    }

    // Check if appointment is in the past
    const appointmentDate = new Date(apt.preferred_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel past appointments'
      });
    }

    // Cancel the appointment
    await pool.query(
      `UPDATE appointments
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP, cancellation_reason = $1
       WHERE cancel_token = $2`,
      [reason || 'Cancelled by patient', cancelToken]
    );

    // Send cancellation confirmation email
    sendCancellationEmail(apt).catch(err => console.error('Cancellation email error:', err));

    res.json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment'
    });
  }
});

// Function to send cancellation confirmation email
const sendCancellationEmail = async (appointment) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: appointment.email,
    subject: 'Appointment Cancelled - HealthCare Clinic',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1c1917; padding: 20px; text-align: center;">
          <h1 style="color: #E4FE7B; margin: 0;">HealthCare Clinic</h1>
        </div>
        <div style="padding: 30px; background: #f5f5f5;">
          <h2 style="color: #dc2626;">Appointment Cancelled</h2>
          <p>Dear <strong>${appointment.full_name}</strong>,</p>
          <p>Your appointment has been successfully cancelled. Here were the details:</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; opacity: 0.7;">
            <p style="text-decoration: line-through;"><strong>Service:</strong> ${appointment.service_type}</p>
            <p style="text-decoration: line-through;"><strong>Date:</strong> ${appointment.preferred_date}</p>
            <p style="text-decoration: line-through;"><strong>Time:</strong> ${appointment.preferred_time}</p>
            <p><strong>Reference ID:</strong> #${appointment.id}</p>
          </div>

          <p style="color: #666;">If you didn't request this cancellation or need to book a new appointment, please visit our website or contact us.</p>

          <div style="margin: 25px 0; text-align: center;">
            <a href="${FRONTEND_URL}" style="display: inline-block; padding: 12px 24px; background: #E4FE7B; color: #1c1917; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Book New Appointment
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #888; font-size: 12px;">
              HealthCare Clinic<br>
              Cantecson, Gairan, Bogo City, Cebu<br>
              Phone: +63 912 345 6789
            </p>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log('Cancellation email sent to:', appointment.email);
};

// ==================== SEARCH & FILTER ====================

// Search appointments with filters
app.get('/api/appointments/search', async (req, res) => {
  try {
    const { query, startDate, endDate, status } = req.query;

    let sql = 'SELECT * FROM appointments WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Search by name, phone, or email
    if (query) {
      sql += ` AND (
        LOWER(full_name) LIKE LOWER($${paramIndex}) OR
        phone_number LIKE $${paramIndex} OR
        LOWER(email) LIKE LOWER($${paramIndex})
      )`;
      params.push(`%${query}%`);
      paramIndex++;
    }

    // Filter by date range
    if (startDate) {
      sql += ` AND preferred_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      sql += ` AND preferred_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // Filter by status
    if (status && status !== 'all') {
      sql += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    sql += ' ORDER BY preferred_date DESC, preferred_time DESC';

    const result = await pool.query(sql, params);

    res.json({
      success: true,
      appointments: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
});

// ==================== RESCHEDULE APPOINTMENT ====================

// Reschedule an appointment
app.put('/api/appointments/:id/reschedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { preferredDate, preferredTime } = req.body;

    if (!preferredDate || !preferredTime) {
      return res.status(400).json({
        success: false,
        message: 'New date and time are required'
      });
    }

    // Check if the new slot is available
    const overlapCheck = await pool.query(
      `SELECT * FROM appointments
       WHERE preferred_date = $1
       AND preferred_time = $2
       AND status != 'cancelled'
       AND id != $3`,
      [preferredDate, preferredTime, id]
    );

    if (overlapCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'The selected time slot is not available'
      });
    }

    // Get the old appointment details for email
    const oldAppointment = await pool.query(
      'SELECT * FROM appointments WHERE id = $1',
      [id]
    );

    if (oldAppointment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Update the appointment
    const result = await pool.query(
      `UPDATE appointments
       SET preferred_date = $1, preferred_time = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [preferredDate, preferredTime, id]
    );

    // Send reschedule confirmation email
    const appointment = result.rows[0];
    sendRescheduleEmail(appointment, oldAppointment.rows[0]).catch(err =>
      console.error('Reschedule email error:', err)
    );

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      appointment
    });
  } catch (error) {
    console.error('Reschedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reschedule appointment'
    });
  }
});

// Function to send reschedule email
const sendRescheduleEmail = async (newAppointment, oldAppointment) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: newAppointment.email,
    subject: 'Appointment Rescheduled - HealthCare Clinic',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1c1917; padding: 20px; text-align: center;">
          <h1 style="color: #E4FE7B; margin: 0;">HealthCare Clinic</h1>
        </div>
        <div style="padding: 30px; background: #f5f5f5;">
          <h2 style="color: #1c1917;">Appointment Rescheduled</h2>
          <p>Dear <strong>${newAppointment.full_name}</strong>,</p>
          <p>Your appointment has been rescheduled. Here are your new details:</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Service:</strong> ${newAppointment.service_type}</p>
            <p><strong>New Date:</strong> ${newAppointment.preferred_date}</p>
            <p><strong>New Time:</strong> ${newAppointment.preferred_time}</p>
            <p style="color: #888; text-decoration: line-through;">
              Previous: ${oldAppointment.preferred_date} at ${oldAppointment.preferred_time}
            </p>
            <p><strong>Reference ID:</strong> #${newAppointment.id}</p>
          </div>

          <p style="color: #666;">Please arrive 10 minutes before your scheduled time.</p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #888; font-size: 12px;">
              HealthCare Clinic<br>
              Cantecson, Gairan, Bogo City, Cebu<br>
              Phone: +63 912 345 6789
            </p>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log('Reschedule email sent to:', newAppointment.email);
};

// ==================== REMINDER EMAILS ====================

// Function to send reminder email
const sendReminderEmail = async (appointment) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: appointment.email,
    subject: 'Appointment Reminder - Tomorrow at HealthCare Clinic',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1c1917; padding: 20px; text-align: center;">
          <h1 style="color: #E4FE7B; margin: 0;">HealthCare Clinic</h1>
        </div>
        <div style="padding: 30px; background: #f5f5f5;">
          <h2 style="color: #1c1917;">Appointment Reminder</h2>
          <p>Dear <strong>${appointment.full_name}</strong>,</p>
          <p>This is a friendly reminder that you have an appointment <strong>tomorrow</strong>.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Service:</strong> ${appointment.service_type}</p>
            <p><strong>Date:</strong> ${appointment.preferred_date}</p>
            <p><strong>Time:</strong> ${appointment.preferred_time}</p>
            <p><strong>Reference ID:</strong> #${appointment.id}</p>
          </div>

          <p style="color: #666;">Please arrive 10 minutes before your scheduled time.</p>
          <p style="color: #666;">If you need to cancel or reschedule, please contact us as soon as possible.</p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #888; font-size: 12px;">
              HealthCare Clinic<br>
              Cantecson, Gairan, Bogo City, Cebu<br>
              Phone: +63 912 345 6789
            </p>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log('Reminder email sent to:', appointment.email);
};

// Check and send reminder emails (runs every hour)
const checkAndSendReminders = async () => {
  try {
    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Find appointments for tomorrow that haven't been reminded
    const result = await pool.query(
      `SELECT * FROM appointments
       WHERE preferred_date = $1
       AND status IN ('pending', 'confirmed')
       AND (reminder_sent IS NULL OR reminder_sent = false)`,
      [tomorrowStr]
    );

    for (const appointment of result.rows) {
      try {
        await sendReminderEmail(appointment);
        // Mark as reminded
        await pool.query(
          'UPDATE appointments SET reminder_sent = true WHERE id = $1',
          [appointment.id]
        );
      } catch (err) {
        console.error(`Failed to send reminder to ${appointment.email}:`, err);
      }
    }

    if (result.rows.length > 0) {
      console.log(`Sent ${result.rows.length} reminder emails`);
    }
  } catch (error) {
    console.error('Reminder check error:', error);
  }
};

// Run reminder check every hour
setInterval(checkAndSendReminders, 60 * 60 * 1000);

// Also run once on server start
setTimeout(checkAndSendReminders, 5000);

// ==================== BLOCKED DATES / HOLIDAYS ====================

// Get all blocked dates
app.get('/api/blocked-dates', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM blocked_dates ORDER BY blocked_date ASC'
    );
    res.json({ success: true, blockedDates: result.rows });
  } catch (error) {
    console.error('Error fetching blocked dates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch blocked dates' });
  }
});

// Add a blocked date
app.post('/api/blocked-dates', async (req, res) => {
  try {
    const { blockedDate, reason } = req.body;

    if (!blockedDate) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    const result = await pool.query(
      'INSERT INTO blocked_dates (blocked_date, reason) VALUES ($1, $2) RETURNING *',
      [blockedDate, reason || 'Holiday/Clinic Closed']
    );

    res.status(201).json({ success: true, blockedDate: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'This date is already blocked' });
    }
    console.error('Error adding blocked date:', error);
    res.status(500).json({ success: false, message: 'Failed to add blocked date' });
  }
});

// Delete a blocked date
app.delete('/api/blocked-dates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM blocked_dates WHERE id = $1', [id]);
    res.json({ success: true, message: 'Blocked date removed' });
  } catch (error) {
    console.error('Error deleting blocked date:', error);
    res.status(500).json({ success: false, message: 'Failed to delete blocked date' });
  }
});

// ==================== DOCTORS MANAGEMENT ====================

// Get all doctors
app.get('/api/doctors', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM doctors ORDER BY name ASC'
    );
    res.json({ success: true, doctors: result.rows });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch doctors' });
  }
});

// Add a doctor
app.post('/api/doctors', async (req, res) => {
  try {
    const { name, specialization, color } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Doctor name is required' });
    }

    const result = await pool.query(
      'INSERT INTO doctors (name, specialization, color) VALUES ($1, $2, $3) RETURNING *',
      [name, specialization || 'General Practice', color || '#3B82F6']
    );

    res.status(201).json({ success: true, doctor: result.rows[0] });
  } catch (error) {
    console.error('Error adding doctor:', error);
    res.status(500).json({ success: false, message: 'Failed to add doctor' });
  }
});

// Update a doctor
app.put('/api/doctors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, specialization, color, active } = req.body;

    const result = await pool.query(
      `UPDATE doctors SET name = COALESCE($1, name), specialization = COALESCE($2, specialization),
       color = COALESCE($3, color), active = COALESCE($4, active), updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [name, specialization, color, active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.json({ success: true, doctor: result.rows[0] });
  } catch (error) {
    console.error('Error updating doctor:', error);
    res.status(500).json({ success: false, message: 'Failed to update doctor' });
  }
});

// Delete a doctor
app.delete('/api/doctors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM doctors WHERE id = $1', [id]);
    res.json({ success: true, message: 'Doctor deleted' });
  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ success: false, message: 'Failed to delete doctor' });
  }
});

// ==================== SERVICES WITH DURATION ====================

// Get all services
app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM services WHERE active = true ORDER BY name ASC'
    );
    res.json({ success: true, services: result.rows });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch services' });
  }
});

// Add a service
app.post('/api/services', async (req, res) => {
  try {
    const { name, duration, price, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Service name is required' });
    }

    const result = await pool.query(
      'INSERT INTO services (name, duration, price, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, duration || 30, price || 0, description || '']
    );

    res.status(201).json({ success: true, service: result.rows[0] });
  } catch (error) {
    console.error('Error adding service:', error);
    res.status(500).json({ success: false, message: 'Failed to add service' });
  }
});

// Update a service
app.put('/api/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, duration, price, description, active } = req.body;

    const result = await pool.query(
      `UPDATE services SET name = COALESCE($1, name), duration = COALESCE($2, duration),
       price = COALESCE($3, price), description = COALESCE($4, description),
       active = COALESCE($5, active), updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [name, duration, price, description, active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    res.json({ success: true, service: result.rows[0] });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ success: false, message: 'Failed to update service' });
  }
});

// Delete a service
app.delete('/api/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE services SET active = false WHERE id = $1', [id]);
    res.json({ success: true, message: 'Service deactivated' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ success: false, message: 'Failed to delete service' });
  }
});

// ==================== REPORTS & ANALYTICS ====================

// Get appointment statistics
app.get('/api/reports/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE preferred_date BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE preferred_date >= $1';
      params.push(startDate);
    } else if (endDate) {
      dateFilter = 'WHERE preferred_date <= $1';
      params.push(endDate);
    }

    // Total appointments by status
    const statusStats = await pool.query(
      `SELECT status, COUNT(*) as count FROM appointments ${dateFilter} GROUP BY status`,
      params
    );

    // Appointments by service type
    const serviceStats = await pool.query(
      `SELECT service_type, COUNT(*) as count FROM appointments ${dateFilter} GROUP BY service_type ORDER BY count DESC`,
      params
    );

    // Daily appointment count (last 30 days)
    const dailyStats = await pool.query(
      `SELECT preferred_date as date, COUNT(*) as count
       FROM appointments
       WHERE preferred_date >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY preferred_date
       ORDER BY preferred_date ASC`
    );

    // Peak hours
    const hourlyStats = await pool.query(
      `SELECT preferred_time as time, COUNT(*) as count
       FROM appointments ${dateFilter}
       GROUP BY preferred_time
       ORDER BY count DESC`,
      params
    );

    // Total counts
    const totals = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed
       FROM appointments ${dateFilter}`,
      params
    );

    res.json({
      success: true,
      stats: {
        totals: totals.rows[0],
        byStatus: statusStats.rows,
        byService: serviceStats.rows,
        daily: dailyStats.rows,
        hourly: hourlyStats.rows
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

// ==================== EXPORT TO CSV ====================

// Export appointments to CSV
app.get('/api/export/appointments', async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    let sql = 'SELECT * FROM appointments WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (startDate) {
      sql += ` AND preferred_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      sql += ` AND preferred_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (status && status !== 'all') {
      sql += ` AND status = $${paramIndex}`;
      params.push(status);
    }

    sql += ' ORDER BY preferred_date DESC, preferred_time DESC';

    const result = await pool.query(sql, params);

    // Convert to CSV
    const headers = ['ID', 'Full Name', 'Phone', 'Email', 'Service', 'Date', 'Time', 'Status', 'Notes', 'Created At'];
    const csvRows = [headers.join(',')];

    result.rows.forEach(row => {
      const values = [
        row.id,
        `"${row.full_name}"`,
        row.phone_number,
        row.email,
        `"${row.service_type}"`,
        row.preferred_date,
        row.preferred_time,
        row.status,
        `"${(row.notes || '').replace(/"/g, '""')}"`,
        row.created_at
      ];
      csvRows.push(values.join(','));
    });

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=appointments_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export data' });
  }
});

// ==================== CALENDAR DATA ====================

// Get appointments for calendar view
app.get('/api/calendar', async (req, res) => {
  try {
    const { month, year } = req.query;

    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const appointments = await pool.query(
      `SELECT id, full_name, service_type, preferred_date, preferred_time, status
       FROM appointments
       WHERE preferred_date >= $1 AND preferred_date <= $2
       ORDER BY preferred_date, preferred_time`,
      [startDate, endDate]
    );

    const blockedDates = await pool.query(
      `SELECT blocked_date, reason FROM blocked_dates
       WHERE blocked_date >= $1 AND blocked_date <= $2`,
      [startDate, endDate]
    );

    res.json({
      success: true,
      appointments: appointments.rows,
      blockedDates: blockedDates.rows
    });
  } catch (error) {
    console.error('Calendar error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch calendar data' });
  }
});

// ==================== SEND SMS NOTIFICATION ====================

// Send SMS reminder manually
app.post('/api/send-sms', async (req, res) => {
  try {
    const { appointmentId, message } = req.body;

    const appointment = await pool.query(
      'SELECT * FROM appointments WHERE id = $1',
      [appointmentId]
    );

    if (appointment.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const apt = appointment.rows[0];
    const smsMessage = message || `Hi ${apt.full_name}, reminder: Your appointment at HealthCare Clinic is on ${apt.preferred_date} at ${apt.preferred_time}. Ref#${apt.id}`;

    const sent = await sendSMS(apt.phone_number, smsMessage);

    if (sent) {
      res.json({ success: true, message: 'SMS sent successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send SMS. Check API key configuration.' });
    }
  } catch (error) {
    console.error('SMS send error:', error);
    res.status(500).json({ success: false, message: 'Failed to send SMS' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
