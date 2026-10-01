import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "NIMELSSA ABSU Election Portal",
      resendConfigured: Boolean(process.env.RESEND_API_KEY),
    });
  });

  // Resend Transactional Email Dispatch Endpoint for Voter ID Delivery
  app.post("/api/send-voter-id", async (req, res) => {
    try {
      const { recipientEmail, recipientName, matricNumber, voterIdCode, level } = req.body;

      if (!recipientEmail || !voterIdCode) {
        return res.status(400).json({
          success: false,
          error: "Recipient email and Voter ID Code are required.",
        });
      }

      const apiKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

      // If Resend API key is not configured, return simulated success for sandbox testing
      if (!apiKey) {
        console.log(`[Resend Simulated] Sent Voter ID ${voterIdCode} to ${recipientEmail} (${recipientName})`);
        return res.json({
          success: true,
          mode: "simulated",
          message: "Email logged to outbox. Configure RESEND_API_KEY for live inbox delivery.",
          deliveryId: `sim-${Date.now()}`,
        });
      }

      // Live delivery via Resend SDK
      const resend = new Resend(apiKey);
      const emailResponse = await resend.emails.send({
        from: `NIMELSSA ABSU Electoral Commission <${fromEmail}>`,
        to: [recipientEmail],
        subject: `OFFICIAL NIMELSSA ABSU VOTER ID: ${voterIdCode}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; border-bottom: 2px solid #047857; padding-bottom: 16px; margin-bottom: 24px;">
              <h1 style="color: #064e3b; margin: 0; font-size: 20px; font-weight: bold;">NIMELSSA — ABIA STATE UNIVERSITY</h1>
              <p style="color: #047857; margin: 4px 0 0 0; font-size: 13px; font-weight: 600;">Department of Medical Laboratory Science</p>
              <p style="color: #64748b; margin: 2px 0 0 0; font-size: 11px;">Independent Electoral Committee (NIMELSSA-IEC)</p>
            </div>

            <p style="font-size: 14px; color: #1e293b; line-height: 1.6;">
              Dear <strong>${recipientName || "Colleague"}</strong> (${matricNumber || "Student"}${level ? `, ${level}` : ""}),
            </p>

            <p style="font-size: 14px; color: #1e293b; line-height: 1.6;">
              Your voter accreditation for the <strong>NIMELSSA ABSU Executive Election</strong> has been confirmed on the official Departmental Register.
            </p>

            <div style="background-color: #f0fdf4; border: 2px dashed #059669; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
              <span style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #047857;">Your Confidential Voter ID Code</span>
              <div style="font-size: 32px; font-family: monospace; font-weight: 800; letter-spacing: 4px; color: #064e3b; margin: 10px 0;">
                ${voterIdCode}
              </div>
              <span style="font-size: 11px; color: #059669; font-weight: 600;">Single-Use &bull; Non-Transferable &bull; Cryptographically Verified</span>
            </div>

            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px; margin-bottom: 24px;">
              <h3 style="color: #991b1b; font-size: 13px; margin: 0 0 6px 0; font-weight: bold;">CRITICAL VOTING INSTRUCTIONS:</h3>
              <ul style="color: #7f1d1d; font-size: 12px; margin: 0; padding-left: 18px; line-height: 1.6;">
                <li>Do <strong>NOT</strong> share or forward this code to any contestant, campaign agent, or peer.</li>
                <li>When the voting booth opens, navigate to <strong>Step 3: Live Voting</strong>.</li>
                <li>Enter this exact code to unlock your secret ballot.</li>
                <li>Once submitted, your vote is irreversible and your Voter ID is automatically invalidated.</li>
              </ul>
            </div>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
              Abia State University, Uturu &bull; Faculty of Health Sciences<br />
              This is an automated electoral system notification. Do not reply to this email.
            </div>
          </div>
        `,
      });

      console.log(`[Resend Live] Dispatched email to ${recipientEmail}, id: ${emailResponse.data?.id}`);
      return res.json({
        success: true,
        mode: "live",
        deliveryId: emailResponse.data?.id,
      });
    } catch (err: any) {
      console.error("[Resend Error]", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to dispatch email via Resend.",
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] NIMELSSA ABSU Election Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
