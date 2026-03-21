-- Adiciona snapshot denormalizado do comentário pai nos replies
-- Isso garante que o contexto do pai seja sempre exibível, mesmo que o pai
-- esteja fora do batch carregado, filtrado, ou deletado da Meta.

ALTER TABLE social_comments
  ADD COLUMN IF NOT EXISTS parent_text text,
  ADD COLUMN IF NOT EXISTS parent_author text;

-- Backfill: popula parent_text e parent_author para replies existentes
-- via self-join usando parent_meta_id = comment_id_meta (mesma plataforma e projeto)
UPDATE social_comments AS reply
SET
  parent_text   = parent.text,
  parent_author = parent.author_username
FROM social_comments AS parent
WHERE reply.parent_meta_id IS NOT NULL
  AND reply.parent_meta_id = parent.comment_id_meta
  AND reply.project_id     = parent.project_id
  AND reply.platform       = parent.platform
  AND reply.parent_text    IS NULL;
