import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { handle, SetupError } from "@/lib/server/cache";
import { buildPackages, type MailInput } from "@/lib/server/packages-parse";
import { PACKAGES } from "@/lib/config";
import type { PackagesData } from "@/lib/packages-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function fetchPackages(): Promise<PackagesData> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) {
    throw new SetupError(
      "Add GMAIL_USER and GMAIL_APP_PASSWORD to .env.local to find packages in your shipping emails.",
      "Create an app password at myaccount.google.com/apppasswords (needs 2-Step Verification). Read-only use; mail is never changed.",
    );
  }
  // Tracking data is private: on a deployed site, refuse unless the password gate is on.
  if (process.env.VERCEL && !process.env.DASHBOARD_PASSWORD) {
    throw new SetupError("Package tracking is off on this deployment because DASHBOARD_PASSWORD isn't set.", "Set DASHBOARD_PASSWORD in Vercel → Settings → Environment Variables, then redeploy.");
  }

  const client = new ImapFlow({ host: "imap.gmail.com", port: 993, secure: true, auth: { user, pass }, logger: false, socketTimeout: 20_000 });
  try {
    await client.connect();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/auth|credentials|invalid/i.test(msg) || (e as { authenticationFailed?: boolean }).authenticationFailed) {
      throw new SetupError("Gmail rejected the login.", "Check GMAIL_USER and GMAIL_APP_PASSWORD (use an app password, not your Google password), then restart the dev server.");
    }
    throw new Error(`Gmail connection failed: ${msg}`);
  }

  const mails: MailInput[] = [];
  try {
    const lock = await client.getMailboxLock("[Gmail]/All Mail", { readOnly: true });
    try {
      const uids = (await client.search({ gmraw: `newer_than:${PACKAGES.lookbackDays}d (${PACKAGES.gmailQuery})` }, { uid: true })) || [];
      const recent = uids.slice(-PACKAGES.maxEmails);
      if (recent.length) {
        for await (const msg of client.fetch(recent, { source: true, threadId: true, internalDate: true }, { uid: true })) {
          if (!msg.source) continue;
          const p = await simpleParser(msg.source, { skipImageLinks: true, skipTextToHtml: true });
          const html = typeof p.html === "string" ? p.html : "";
          const text = p.text || html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
          const tid = msg.threadId ? BigInt(msg.threadId).toString(16) : undefined;
          mails.push({
            from: p.from?.text ?? "",
            subject: p.subject ?? "",
            text: text.replace(/\s+/g, " "),
            html,
            date: (p.date ?? (msg.internalDate ? new Date(msg.internalDate) : new Date())).getTime(),
            emailUrl: tid ? `https://mail.google.com/mail/u/0/#all/${tid}` : undefined,
          });
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
  return { packages: buildPackages(mails, Date.now()), scannedEmails: mails.length, lookbackDays: PACKAGES.lookbackDays };
}

export async function GET(req: Request) {
  const res = await handle(
    req,
    "packages",
    15 * 60_000,
    "Gmail shipping emails",
    fetchPackages,
    "Status comes from the newest shipping email, not a live carrier scan. Times shown are email times. Open the carrier link for the latest scan.",
    2 * 60_000,
  );
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
