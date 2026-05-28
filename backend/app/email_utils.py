import os
import smtplib
import threading
from email.mime.text import MIMEText

SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")


def send_email(to: str, subject: str, html: str) -> bool:
    if not SMTP_USER or not SMTP_PASS:
        print("SMTP_USER or SMTP_PASS not set — skipping email")
        return False

    try:
        msg = MIMEText(html, "html")
        msg["Subject"] = subject
        msg["From"] = SMTP_USER
        msg["To"] = to

        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, [to], msg.as_string())
        return True
    except Exception as e:
        print(f"Email send failed: {e}")
        return False


def send_email_async(to: str, subject: str, html: str) -> None:
    threading.Thread(target=send_email, args=(to, subject, html), daemon=True).start()


def send_otp_email(to: str, code: str, purpose: str) -> bool:
    if purpose == "signup":
        subject = "Verify your AI Travel Planner account"
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
            <div style="text-align:center;margin-bottom:24px;">
                <div style="display:inline-block;width:48px;height:48px;background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:12px;line-height:48px;font-size:24px;color:#fff;">&#9992;</div>
            </div>
            <h2 style="text-align:center;color:#0f172a;margin-bottom:8px;">Verify your email</h2>
            <p style="text-align:center;color:#64748b;font-size:14px;margin-bottom:24px;">Use the code below to complete your signup</p>
            <div style="text-align:center;padding:20px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">
                <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#4f46e5;">{code}</div>
                <p style="color:#94a3b8;font-size:12px;margin-top:12px;">This code expires in 10 minutes</p>
            </div>
            <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px;">If you didn't request this, please ignore this email.</p>
        </div>
        """
    else:
        subject = "Reset your AI Travel Planner password"
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
            <div style="text-align:center;margin-bottom:24px;">
                <div style="display:inline-block;width:48px;height:48px;background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:12px;line-height:48px;font-size:24px;color:#fff;">&#9992;</div>
            </div>
            <h2 style="text-align:center;color:#0f172a;margin-bottom:8px;">Reset your password</h2>
            <p style="text-align:center;color:#64748b;font-size:14px;margin-bottom:24px;">Use the code below to reset your password</p>
            <div style="text-align:center;padding:20px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">
                <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#4f46e5;">{code}</div>
                <p style="color:#94a3b8;font-size:12px;margin-top:12px;">This code expires in 10 minutes</p>
            </div>
            <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px;">If you didn't request this, please ignore this email.</p>
        </div>
        """

    send_email_async(to, subject, html)
    return True


def send_welcome_email(to: str) -> None:
    subject = "Welcome to AI Travel Planner!"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;width:48px;height:48px;background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:12px;line-height:48px;font-size:24px;color:#fff;">&#9992;</div>
        </div>
        <h2 style="text-align:center;color:#0f172a;margin-bottom:8px;">Welcome to AI Travel Planner!</h2>
        <p style="text-align:center;color:#64748b;font-size:14px;margin-bottom:24px;">Your account has been verified successfully.</p>
        <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:20px;">
            <p style="color:#0f172a;font-size:14px;line-height:1.6;">You can now plan your dream trips using AI. Simply describe your destination, dates, and interests, and we'll generate a complete day-by-day itinerary with maps and photos.</p>
        </div>
        <div style="text-align:center;margin-top:24px;">
            <a href="https://ai-travel-planner-8x4z.onrender.com" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Start Planning</a>
        </div>
        <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px;">Happy travels!</p>
    </div>
    """
    send_email_async(to, subject, html)
