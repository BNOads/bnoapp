-- Adicionar foreign key entre creatives.activated_by e auth.users
ALTER TABLE creatives 
ADD CONSTRAINT fk_creatives_activated_by 
FOREIGN KEY (activated_by) REFERENCES auth.users(id);