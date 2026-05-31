import smtplib
import os
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
load_dotenv(_env_path)

SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")


def send_email(to: str, subject: str, html: str):
    if not SMTP_USER or not SMTP_PASS:
        return
    msg = MIMEMultipart("alternative")
    msg["From"] = SMTP_USER
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html, "html"))

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587, timeout=10)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        print(f"[EMAIL] Sent to {to}: {subject}")
    except Exception as e:
        print(f"[EMAIL ERROR] to {to}: {e}")


def send_email_async(to: str, subject: str, html: str):
    threading.Thread(target=send_email, args=(to, subject, html), daemon=True).start()


def send_welcome_email(to: str, name: str):
    html = f"""\
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden">
        <tr><td style="background:#10b981;padding:32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:28px">Welcome to AI Travel Planner!</h1>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="font-size:16px;color:#333">Hi {name},</p>
          <p style="font-size:16px;color:#333;line-height:1.6">
            Thanks for signing up! You can now plan amazing trips powered by AI.
            Create custom itineraries, discover hidden gems, and manage your travel budget — all in one place.
          </p>
          <div style="text-align:center;margin:28px 0">
            <a href="https://ai-travel-planner-8x4z.onrender.com" style="background:#10b981;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block">
              Start Planning
            </a>
          </div>
          <p style="font-size:14px;color:#888;margin-top:24px">
            Happy travels,<br/>The AI Travel Planner Team
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    send_email_async(to, "Welcome to AI Travel Planner!", html)


def send_share_trip_email(to: str, share_link: str, trip_title: str, sender_name: str):
    html = f"""\
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden">
        <tr><td style="background:#10b981;padding:32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:28px">{sender_name} shared a trip with you!</h1>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="font-size:16px;color:#333">Hi there,</p>
          <p style="font-size:16px;color:#333;line-height:1.6">
            <strong>{sender_name}</strong> has shared their trip <strong>"{trip_title}"</strong> with you.
            Click the button below to view the full itinerary.
          </p>
          <div style="text-align:center;margin:28px 0">
            <a href="{share_link}" style="background:#10b981;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block">
              View Trip
            </a>
          </div>
          <p style="font-size:14px;color:#888;margin-top:24px">
            Powered by AI Travel Planner
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    send_email_async(to, f"{sender_name} shared a trip with you!", html)
