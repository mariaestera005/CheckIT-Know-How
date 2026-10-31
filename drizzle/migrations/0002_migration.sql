alter table public.emails alter column gmail_id set default gen_random_uuid()::text;
comment on column public.emails.gmail_id is 'External message id (mock Outlook/Teams id in the prototype)';
alter table public.emails add column channel text not null default 'outlook';
alter table public.emails add column channel_name text;
alter table public.emails add column body text;
alter table public.emails add column to_address text;

grant insert on public.emails to authenticated;
create policy "Team adds demo messages" on public.emails for insert to authenticated with check (status = 'pending');

insert into public.emails (channel, channel_name, from_address, to_address, subject, body, received_at, status) values
('outlook', 'Inbox', 'Elena Popescu <elena.popescu@contoso-demo.com>', 'product-team@contoso-demo.com',
 'Nimbus CRM 4.2 released today',
 'Hi team,

Nimbus CRM 4.2 went live this morning (2026-10-20). Highlights:
- Added: two-way calendar sync with Outlook.
- Fixed: duplicate contacts created when importing CSV files.
- Changed: the Starter plan now includes 5 seats instead of 3.

Release notes are on the wiki. Thanks everyone!
Elena', '2026-10-20 08:12:00+00', 'pending'),
('outlook', 'Inbox', 'Mihai Ionescu <mihai.ionescu@contoso-demo.com>', 'product-team@contoso-demo.com',
 'Atlas Sensor S3 - end of sale notice',
 'Hello,

Please note the Atlas Sensor S3 hardware is deprecated as of 2026-11-01. It will be replaced by the Atlas Sensor S4. Firmware 3.9 will be the final firmware for the S3 and includes a security patch for the Bluetooth pairing issue.

Regards,
Mihai', '2026-10-21 14:40:00+00', 'pending'),
('outlook', 'Inbox', 'Newsletter <news@industry-weekly-demo.com>', 'product-team@contoso-demo.com',
 'Your weekly industry digest',
 'Top stories this week: market trends, five productivity tips and upcoming conferences. Unsubscribe any time.',
 '2026-10-22 06:00:00+00', 'pending'),
('teams', 'Product Updates', 'Andrei Dumitru', null, null,
 'Heads up: Nimbus CRM mobile app v4.2.1 hotfix shipped 2026-10-23 - fixes the crash on login for Android 15 users.',
 '2026-10-23 10:05:00+00', 'pending'),
('teams', 'Engineering', 'Ioana Stan', null, null,
 'We removed the legacy SOAP API from Nimbus CRM in 4.2. All integrations must use the REST API now. Can someone update the docs?',
 '2026-10-23 16:30:00+00', 'pending'),
('teams', 'General', 'Radu Marin', null, null,
 'Lunch at 1pm today in the big meeting room, pizza is on the house!',
 '2026-10-24 09:15:00+00', 'pending');