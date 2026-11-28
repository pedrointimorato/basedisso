-- MOR-42: /s (sátiras) passou a /l (literatura da comunidade).
-- Comentários guardados com a página antiga passam para a chave canônica, como /adm → /b/adm.
UPDATE comments SET page = '/l' WHERE page = '/s';
UPDATE comments SET page = '/l/biblia-amarela' WHERE page = '/s/biblia-amarela';
