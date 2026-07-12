/**
 * Plain hand-built HTML strings, not a component library — email clients need
 * inline styles and table-based layout regardless, so a templating engine
 * buys nothing here. Brand colors match app/globals.css (navy #0d1b34,
 * blue #1b56d6).
 */
import { formatMoney, formatDate } from "@/lib/utils/format";

function wrapper(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr><td style="background:#0d1b34;padding:20px 28px;">
            <span style="color:#ffffff;font-size:15px;font-weight:600;">The Hygiene Squad</span>
          </td></tr>
          <tr><td style="padding:28px;">
            <h1 style="margin:0 0 16px;font-size:18px;color:#0d1b34;">${title}</h1>
            ${bodyHtml}
          </td></tr>
          <tr><td style="padding:16px 28px;border-top:1px solid #eef0f3;">
            <span style="color:#8a92a3;font-size:11px;">Sent by THS OS &middot; The Hygiene Squad, Harare</span>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#1b56d6;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;">${label}</a>`;
}

export function quotationEmail(params: { number: string; customerName: string; totalUsd: number; validUntil: string | null; portalUrl: string }) {
  const { number, customerName, totalUsd, validUntil, portalUrl } = params;
  return {
    subject: `Quotation ${number} from The Hygiene Squad`,
    html: wrapper(
      `Quotation ${number}`,
      `<p style="color:#3a4256;font-size:14px;line-height:1.5;">Hi ${customerName},</p>
       <p style="color:#3a4256;font-size:14px;line-height:1.5;">Please find your quotation summary below.</p>
       <table role="presentation" width="100%" style="margin-top:12px;font-size:14px;color:#3a4256;">
         <tr><td style="padding:4px 0;color:#8a92a3;">Total</td><td style="padding:4px 0;text-align:right;font-weight:600;">${formatMoney(totalUsd)}</td></tr>
         ${validUntil ? `<tr><td style="padding:4px 0;color:#8a92a3;">Valid until</td><td style="padding:4px 0;text-align:right;">${formatDate(validUntil)}</td></tr>` : ""}
       </table>
       ${button(portalUrl, "View & respond to quotation")}`,
    ),
  };
}

export function invoiceEmail(params: { number: string; customerName: string; totalUsd: number; dueOn: string | null; portalUrl: string }) {
  const { number, customerName, totalUsd, dueOn, portalUrl } = params;
  return {
    subject: `Invoice ${number} from The Hygiene Squad`,
    html: wrapper(
      `Invoice ${number}`,
      `<p style="color:#3a4256;font-size:14px;line-height:1.5;">Hi ${customerName},</p>
       <p style="color:#3a4256;font-size:14px;line-height:1.5;">A new invoice has been issued to your account.</p>
       <table role="presentation" width="100%" style="margin-top:12px;font-size:14px;color:#3a4256;">
         <tr><td style="padding:4px 0;color:#8a92a3;">Amount due</td><td style="padding:4px 0;text-align:right;font-weight:600;">${formatMoney(totalUsd)}</td></tr>
         ${dueOn ? `<tr><td style="padding:4px 0;color:#8a92a3;">Due date</td><td style="padding:4px 0;text-align:right;">${formatDate(dueOn)}</td></tr>` : ""}
       </table>
       ${button(portalUrl, "View invoice")}`,
    ),
  };
}

export function receiptEmail(params: { receiptNumber: string; customerName: string; amountUsd: number; method: string | null; portalUrl: string }) {
  const { receiptNumber, customerName, amountUsd, method, portalUrl } = params;
  return {
    subject: `Payment received — receipt ${receiptNumber}`,
    html: wrapper(
      `Receipt ${receiptNumber}`,
      `<p style="color:#3a4256;font-size:14px;line-height:1.5;">Hi ${customerName},</p>
       <p style="color:#3a4256;font-size:14px;line-height:1.5;">Thank you — we've received your payment.</p>
       <table role="presentation" width="100%" style="margin-top:12px;font-size:14px;color:#3a4256;">
         <tr><td style="padding:4px 0;color:#8a92a3;">Amount</td><td style="padding:4px 0;text-align:right;font-weight:600;">${formatMoney(amountUsd)}</td></tr>
         ${method ? `<tr><td style="padding:4px 0;color:#8a92a3;">Method</td><td style="padding:4px 0;text-align:right;">${method}</td></tr>` : ""}
       </table>
       ${button(portalUrl, "View account")}`,
    ),
  };
}
