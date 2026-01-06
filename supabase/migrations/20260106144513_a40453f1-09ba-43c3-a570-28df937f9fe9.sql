-- Atualizar o nivel_acesso do João Marques na tabela profiles para corresponder ao colaboradores
UPDATE profiles 
SET nivel_acesso = 'admin' 
WHERE user_id = '08dd8de6-3fef-4561-9fed-c0656eeef9b4';