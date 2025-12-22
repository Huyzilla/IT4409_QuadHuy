export const VERIFY_EMAIL_TEMPLATE = `
  <div style="margin:0;padding:0;background:#f3f4f6;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Your verification code is {{code}}.
    </div>

    <div style="padding:28px 12px;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="padding:18px 20px;background:#111827;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;letter-spacing:0.2px;">
            {{appName}}
          </div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#d1d5db;margin-top:4px;">
            Email verification
          </div>
        </div>

        <div style="padding:22px 20px 10px 20px;font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.6;">
          <p style="margin:0 0 12px 0;font-size:14px;">Hi{{#if recipient}}, {{recipient}}{{/if}},</p>

          <p style="margin:0 0 14px 0;font-size:14px;">
            Use the verification code below to complete your registration.
          </p>

          <div style="margin:18px 0 16px 0;text-align:center;">
            <div style="display:inline-block;background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:14px 18px;">
              <div style="font-size:26px;font-weight:800;letter-spacing:8px;color:#111827;">
                {{code}}
              </div>
            </div>
          </div>

          {{#if verifyLink}}
          <div style="text-align:center;margin-bottom:16px;">
             <div style="font-size:12px;color:#9ca3af;margin-bottom:12px;font-weight:500;">OR</div>
             <a href="{{verifyLink}}" style="display:inline-block;background:#111827;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">Verify your email instantly</a>
          </div>
          {{/if}}

          <div style="background:#f3f4f6;border-radius:12px;padding:12px 14px;margin:0 0 12px 0;">
            <div style="font-size:12px;color:#374151;">
              This code expires in <b>{{ttlMinutes}}</b> minutes.
            </div>
            <div style="font-size:12px;color:#6b7280;margin-top:6px;">
              Do not share this code with anyone.
            </div>
          </div>

          <p style="margin:0 0 8px 0;font-size:12px;color:#6b7280;">
            If you didn’t request this, you can safely ignore this email.
          </p>
        </div>

        <div style="padding:14px 20px;background:#ffffff;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;">
          <div style="font-size:11px;color:#6b7280;">
            Sent by {{appName}} • This is an automated message
          </div>
        </div>
      </div>
    </div>
    <div style="opacity: 0; max-height: 0; width: 0; overflow: hidden; font-size: 1px; color: transparent;">
      Message ID: {{randomId}}
    </div>
  </div>
`;
