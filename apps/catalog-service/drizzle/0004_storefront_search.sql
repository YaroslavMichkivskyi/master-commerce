ALTER TABLE "product" ADD COLUMN "search" "tsvector" DEFAULT ''::tsvector NOT NULL;--> statement-breakpoint
CREATE INDEX "product_search_live" ON "product" USING gin ("search") WHERE deleted_at IS NULL AND published;--> statement-breakpoint
CREATE INDEX "product_storefront_category" ON "product" USING btree ("category_id") WHERE deleted_at IS NULL AND published;--> statement-breakpoint
CREATE INDEX "product_storefront_brand" ON "product" USING btree ("brand_id") WHERE deleted_at IS NULL AND published;--> statement-breakpoint
-- Custom (TASK-6 research R-4, ADR 0023): the search document of a product, kept by the
-- database from the product, its brand and its category, whoever writes them.
CREATE FUNCTION catalog_search_document(name text, brand text, category text, description text)
RETURNS tsvector
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog, public
AS $$
  SELECT setweight(to_tsvector('english'::regconfig, coalesce(name, '')), 'A')
      || setweight(to_tsvector('english'::regconfig, coalesce(brand, '')), 'B')
      || setweight(to_tsvector('english'::regconfig, coalesce(category, '')), 'C')
      || setweight(to_tsvector('english'::regconfig, coalesce(description, '')), 'D')
$$;--> statement-breakpoint
CREATE FUNCTION product_search_refresh() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.search := catalog_search_document(
    NEW.name,
    (SELECT b.name FROM brand b WHERE b.id = NEW.brand_id),
    (SELECT c.name FROM category c WHERE c.id = NEW.category_id),
    NEW.description);
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER product_search_refresh
BEFORE INSERT OR UPDATE OF name, description, brand_id, category_id ON product
FOR EACH ROW EXECUTE FUNCTION product_search_refresh();--> statement-breakpoint
-- A rename of a brand or a category rewrites the documents of its products; the UPDATE
-- touches only `search`, so the product trigger above does not fire again.
CREATE FUNCTION brand_search_refresh() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE product p
  SET search = catalog_search_document(p.name, NEW.name, c.name, p.description)
  FROM category c
  WHERE p.brand_id = NEW.id AND c.id = p.category_id;
  RETURN NULL;
END
$$;--> statement-breakpoint
CREATE TRIGGER brand_search_refresh
AFTER UPDATE OF name ON brand
FOR EACH ROW WHEN (OLD.name IS DISTINCT FROM NEW.name)
EXECUTE FUNCTION brand_search_refresh();--> statement-breakpoint
CREATE FUNCTION category_search_refresh() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE product p
  SET search = catalog_search_document(p.name, b.name, NEW.name, p.description)
  FROM brand b
  WHERE p.category_id = NEW.id AND b.id = p.brand_id;
  RETURN NULL;
END
$$;--> statement-breakpoint
CREATE TRIGGER category_search_refresh
AFTER UPDATE OF name ON category
FOR EACH ROW WHEN (OLD.name IS DISTINCT FROM NEW.name)
EXECUTE FUNCTION category_search_refresh();--> statement-breakpoint
-- Products written before this migration.
UPDATE product p
SET search = catalog_search_document(p.name, b.name, c.name, p.description)
FROM brand b, category c
WHERE b.id = p.brand_id AND c.id = p.category_id;
