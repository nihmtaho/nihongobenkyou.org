-- ============================================================
-- Migration: 20260426000003_word_count_trigger
-- Maintains custom_decks.word_count via trigger on custom_vocabulary
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_deck_word_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.custom_decks
    SET word_count = word_count + 1,
        updated_at = now()
    WHERE id = NEW.deck_id;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.custom_decks
    SET word_count = GREATEST(word_count - 1, 0),
        updated_at = now()
    WHERE id = OLD.deck_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_deck_word_count ON public.custom_vocabulary;

CREATE TRIGGER trg_deck_word_count
AFTER INSERT OR DELETE ON public.custom_vocabulary
FOR EACH ROW EXECUTE FUNCTION public.update_deck_word_count();
