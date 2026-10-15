-- Seed the asset types named in the brief. Idempotent: re-running changes nothing.
insert into public.asset_types (code, name, sort_order)
values
  ('PC',      'คอมพิวเตอร์ตั้งโต๊ะ (PC)', 10),
  ('MT',      'จอภาพ (MT)',               20),
  ('CT',      'คอมพิวเตอร์พกพา (CT)',     30),
  ('PRINTER', 'เครื่องพิมพ์ (Printer)',   40),
  ('UPS',     'เครื่องสำรองไฟ (UPS)',     50),
  ('OTHER',   'อื่น ๆ (Other)',           999)
on conflict (code) do nothing;
