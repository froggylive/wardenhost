import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WardenHost — License Panel",
  description: "License management panel for WardenHost installations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="robots" content="noindex,nofollow" />
        <style>{`
          *{box-sizing:border-box}body{margin:0;background:#050505;color:#ededed;font-family:Inter,Arial,sans-serif}
          a{color:inherit}h1,h2,p{margin:0}
          .wrap{max-width:1100px;margin:0 auto;padding:40px 20px}
          .card{background:#0d0d0d;border:1px solid #262626;border-radius:14px;padding:28px}
          .btn{cursor:pointer;border:1px solid #262626;background:#fff;color:#050505;border-radius:8px;padding:10px 16px;font-weight:600;font-size:13px}
          .btn.secondary{background:#141414;color:#ededed}
          .btn.danger{background:#2a0f14;color:#fda4af;border-color:#5c1f2a}
          input{width:100%;background:#141414;border:1px solid #262626;border-radius:8px;padding:10px 12px;color:#fff;font-size:13px;outline:none}
          input:focus{border-color:#666}
          label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#737373;margin-bottom:6px}
          table{width:100%;border-collapse:collapse;font-size:13px}
          th{text-align:left;color:#737373;font-size:11px;text-transform:uppercase;letter-spacing:.08em;padding:12px;border-bottom:1px solid #262626}
          td{padding:12px;border-bottom:1px solid #1a1a1a}
          .muted{color:#737373;font-size:12px;line-height:1.6}
          .row{display:flex;gap:10px;flex-wrap:wrap;align-items:end}
          .badge{display:inline-block;padding:3px 8px;border-radius:99px;font-size:11px;border:1px solid #262626}
          .badge.ok{color:#6ee7b7;border-color:#064e3b;background:#052e24}
          .badge.off{color:#a3a3a3}
          .error{color:#fda4af;font-size:12px;margin-top:10px}
          .header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #262626;padding:0 0 18px;margin-bottom:28px}
          code{font-family:ui-monospace,monospace}
          .copy{cursor:pointer;background:none;border:none;color:#a3a3a3;font-size:11px}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
