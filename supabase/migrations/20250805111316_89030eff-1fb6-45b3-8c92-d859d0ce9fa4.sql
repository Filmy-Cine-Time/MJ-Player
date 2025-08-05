-- Add default categories
INSERT INTO public.categories (name, description) VALUES 
('Love Songs', 'Romantic and love-themed songs'),
('Party Songs', 'High-energy party and dance tracks')
ON CONFLICT (name) DO NOTHING;