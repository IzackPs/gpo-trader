-- Seed: itens populares GPO (valores em Legendary Chests - numeraire)
-- Expandir conforme wiki/comunidade. volatility = 0 (atualizado pelo cron de preço).

INSERT INTO public.items (name, category, market_value_leg_chests, volatility) VALUES
-- FRUITS (devil fruits)
('Dough (Mochi)', 'FRUIT', 45.0, 0),
('Venom (Doku)', 'FRUIT', 38.0, 0),
('Dragon', 'FRUIT', 35.0, 0),
('Leopard', 'FRUIT', 28.0, 0),
('Phoenix', 'FRUIT', 22.0, 0),
('Rumble (Goro)', 'FRUIT', 18.0, 0),
('Light (Pika)', 'FRUIT', 15.0, 0),
('Magma (Magu)', 'FRUIT', 14.0, 0),
('Ice (Hie)', 'FRUIT', 12.0, 0),
('Flame (Mera)', 'FRUIT', 11.0, 0),
('Quake (Gura)', 'FRUIT', 10.0, 0),
('Dark (Yami)', 'FRUIT', 9.0, 0),
('Buddha', 'FRUIT', 8.0, 0),
('String (Ito)', 'FRUIT', 5.0, 0),
('Rumble (Goro) v2', 'FRUIT', 20.0, 0),
('Gravity', 'FRUIT', 4.0, 0),
('Paw (Niko)', 'FRUIT', 3.5, 0),
('Door', 'FRUIT', 2.0, 0),
('Barrier', 'FRUIT', 1.5, 0),
('Spin', 'FRUIT', 1.0, 0),
('Chop', 'FRUIT', 0.5, 0),
('Spring', 'FRUIT', 0.4, 0),
('Smoke', 'FRUIT', 0.3, 0),
-- WEAPONS
('Yoru', 'WEAPON', 25.0, 0),
('Shusui', 'WEAPON', 12.0, 0),
('Wado Ichimonji', 'WEAPON', 8.0, 0),
('Pole (2nd Form)', 'WEAPON', 6.0, 0),
('Trident', 'WEAPON', 5.0, 0),
('Bisento', 'WEAPON', 4.0, 0),
('Pole (1st Form)', 'WEAPON', 2.0, 0),
('Pipe', 'WEAPON', 0.5, 0),
-- SCROLLS
('Haki Scroll', 'SCROLL', 3.0, 0),
('Rokushiki Scroll', 'SCROLL', 2.5, 0),
('Soru Scroll', 'SCROLL', 1.0, 0),
('Geppo Scroll', 'SCROLL', 0.8, 0),
-- ACCESSORY
('Cursed Dual Katana', 'ACCESSORY', 15.0, 0),
('Gravity Blade', 'ACCESSORY', 10.0, 0),
('Obsidian Cape', 'ACCESSORY', 4.0, 0),
('Pirate Hat', 'ACCESSORY', 1.0, 0);

-- Rodar uma vez após a migration. Para re-seed: DELETE FROM public.items; depois rode este arquivo de novo.
