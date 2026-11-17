CREATE TABLE "brand" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "brand_name_length" CHECK (char_length(name) BETWEEN 1 AND 100),
	CONSTRAINT "brand_name_trimmed" CHECK (name = btrim(name)),
	CONSTRAINT "brand_slug_format" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 100),
	CONSTRAINT "brand_version_positive" CHECK (version > 0),
	CONSTRAINT "brand_deleted_by_needs_deleted_at" CHECK (deleted_at IS NOT NULL OR deleted_by IS NULL)
);
--> statement-breakpoint
CREATE TABLE "category_attribute" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"category_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"required" boolean NOT NULL,
	"allowed_values" text[],
	"unit" text,
	"min_value" numeric,
	"max_value" numeric,
	"whole_numbers" boolean DEFAULT false NOT NULL,
	"max_length" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "category_attribute_code_format" CHECK (code ~ '^[a-z][a-z0-9_]*$' AND char_length(code) <= 50),
	CONSTRAINT "category_attribute_type" CHECK (type IN ('select', 'multi_select', 'number', 'boolean', 'text')),
	CONSTRAINT "category_attribute_values_for_lists" CHECK ((type IN ('select', 'multi_select')) = (allowed_values IS NOT NULL AND cardinality(allowed_values) > 0)),
	CONSTRAINT "category_attribute_number_limits" CHECK (type = 'number' OR (unit IS NULL AND min_value IS NULL AND max_value IS NULL AND NOT whole_numbers)),
	CONSTRAINT "category_attribute_range" CHECK (min_value IS NULL OR max_value IS NULL OR min_value <= max_value),
	CONSTRAINT "category_attribute_unit_length" CHECK (unit IS NULL OR char_length(unit) BETWEEN 1 AND 20),
	CONSTRAINT "category_attribute_text_length" CHECK ((type = 'text') = (max_length IS NOT NULL) AND (max_length IS NULL OR max_length BETWEEN 1 AND 500)),
	CONSTRAINT "category_attribute_name_length" CHECK (char_length(name) BETWEEN 1 AND 100),
	CONSTRAINT "category_attribute_name_trimmed" CHECK (name = btrim(name)),
	CONSTRAINT "category_attribute_version_positive" CHECK (version > 0),
	CONSTRAINT "category_attribute_deleted_by_needs_deleted_at" CHECK (deleted_at IS NOT NULL OR deleted_by IS NULL)
);
--> statement-breakpoint
CREATE TABLE "former_slug" (
	"kind" text NOT NULL,
	"slug" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"retired_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "former_slug_pk" PRIMARY KEY("kind","slug"),
	CONSTRAINT "former_slug_kind" CHECK (kind IN ('brand', 'category', 'product')),
	CONSTRAINT "former_slug_slug_format" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 100)
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sku" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"brand_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"price_cents" integer NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "product_sku_format" CHECK (sku ~ '^[A-Z0-9][A-Z0-9-]*$' AND char_length(sku) <= 40),
	CONSTRAINT "product_price_positive" CHECK (price_cents > 0),
	CONSTRAINT "product_stock_not_negative" CHECK (stock >= 0),
	CONSTRAINT "product_specs_object" CHECK (jsonb_typeof(specs) = 'object'),
	CONSTRAINT "product_description_length" CHECK (char_length(description) <= 10000),
	CONSTRAINT "product_name_length" CHECK (char_length(name) BETWEEN 1 AND 200),
	CONSTRAINT "product_name_trimmed" CHECK (name = btrim(name)),
	CONSTRAINT "product_slug_format" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 100),
	CONSTRAINT "product_version_positive" CHECK (version > 0),
	CONSTRAINT "product_deleted_by_needs_deleted_at" CHECK (deleted_at IS NOT NULL OR deleted_by IS NULL)
);
--> statement-breakpoint
ALTER TABLE "category" DROP CONSTRAINT "category_slug_unique";--> statement-breakpoint
ALTER TABLE "category" ALTER COLUMN "id" SET DEFAULT uuid_v7();--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
-- Rows from TASK-2 were last changed when they were created, not by this migration.
UPDATE "category" SET "updated_at" = "created_at";--> statement-breakpoint
ALTER TABLE "category_attribute" ADD CONSTRAINT "category_attribute_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brand_slug_live" ON "brand" USING btree (slug) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "category_attribute_code_live" ON "category_attribute" USING btree ("category_id","code") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "former_slug_entity" ON "former_slug" USING btree ("kind","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_slug_live" ON "product" USING btree ("slug") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "product_sku_live" ON "product" USING btree ("sku") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "product_category_live" ON "product" USING btree ("category_id","id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "product_brand_live" ON "product" USING btree ("brand_id","id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "product_published_live" ON "product" USING btree ("published","id") WHERE deleted_at IS NULL;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "category_slug_live" ON "category" USING btree ("slug") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "category_parent_live" ON "category" USING btree ("parent_id") WHERE deleted_at IS NULL;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_not_own_parent" CHECK (parent_id <> id);--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_name_length" CHECK (char_length(name) BETWEEN 1 AND 100);--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_name_trimmed" CHECK (name = btrim(name));--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_slug_format" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 100);--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_version_positive" CHECK (version > 0);--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_deleted_by_needs_deleted_at" CHECK (deleted_at IS NOT NULL OR deleted_by IS NULL);