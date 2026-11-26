# WardenHost source protection

This deployment is designed so **content changes happen only through the admin panel** —
not by editing files.

## What is enforced

- All admin pages and actions call `requireAdmin()` / role checks on the server.
- Customers cannot access admin routes or change roles, payment status or other users' data.
- Legal pages, credit and copyright text are owner-locked: the UI is read-only and the
  settings action ignores crafted submissions for those keys.
- `middleware.ts` returns 404 for direct requests to source/config paths such as
  `/app`, `/lib`, `/prisma`, `/.env`, `/package.json`, etc.
- Security headers block framing, MIME sniffing and unwanted permissions.
- `npm run secure:lock` makes source/config files read-only and sets the immutable
  (`chattr +i`) flag where supported. Only `public/uploads` and the database remain writable.
- License activation is server-wide and permanent; the site cannot be unlocked by editing
  a browser cookie.

## What is NOT possible to guarantee

No website can be made impossible to modify by someone who has **root/SSH/filesystem
access** to the server. An AI agent with shell access can run `npm run secure:unlock`.
Real protection at that level requires infrastructure controls: restricted SSH keys,
separate deploy users, no shared root credentials, filesystem/container isolation,
backups and monitoring.

## How to make legitimate changes

```bash
npm run secure:unlock
# make code changes, then:
npm run build
pm2 restart all
npm run secure:lock
```

Normal day-to-day changes — company name, hero text, plans, prices, features, coupons,
categories, gateway credentials, SMTP, announcements — are all done in the admin panel
without unlocking files.
