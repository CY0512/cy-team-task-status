# Study Tracker Website

This rebuild serves one website for both Hong Yi and Delson using Supabase Free for study records and photos. It no longer requires Google credentials or a paid server.

## Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste and run [supabase.sql](./supabase.sql).
3. Open **Project Settings > API** and copy the Project URL and `anon` public key into the first two lines of [public/app.js](./public/app.js).
4. Open [index.html](./public/index.html) locally, or publish the `public` folder using GitHub Pages, Netlify, or Vercel.

Supabase's browser URL and `anon` key are designed to be public. Never put a service-role key in the website. Use the child links `?child=Hong%20Yi` and `?child=Delson`.

## User flow

The website does not require Google login. It starts with a child selection screen, then opens that child's dashboard and subject selection. After starting a subject, the timer shows beside the weekly table. Finishing the timer opens the form for the learning text and compressed photo upload.

The included SQL uses public access because this is a private family tracker with no login screen. Anyone who obtains the published link could technically add or delete records. For stronger privacy, add Supabase Auth and replace the public policies before sharing the site widely.

Photos are compressed in the browser before upload: they are resized to a maximum of 1280 pixels on the longest side and saved as JPEG at 70% quality. This keeps normal study photos reasonably clear while reducing storage usage.
