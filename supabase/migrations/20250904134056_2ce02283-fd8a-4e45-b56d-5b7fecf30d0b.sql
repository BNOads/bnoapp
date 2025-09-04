-- Remover tarefas relacionadas ao cliente "Loja Fashion Style" primeiro
DELETE FROM tarefas WHERE cliente_id = '311a42c1-dc75-4ccf-8771-0d6574408754';

-- Agora remover o cliente "Loja Fashion Style"
DELETE FROM clientes WHERE id = '311a42c1-dc75-4ccf-8771-0d6574408754';