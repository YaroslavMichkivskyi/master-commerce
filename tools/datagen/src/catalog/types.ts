// The shape of the fixed catalog description (plan D-6): what the catalog stores about
// each category and attribute, and how the generator draws values for products.

export type AttributeType = 'select' | 'multi_select' | 'number' | 'boolean' | 'text';
export type SpecValue = string | number | boolean | readonly string[];

export interface AttributeDef {
  code: string;
  name: string;
  type: AttributeType;
  required: boolean;
  /** `select` / `multi_select`: the allowed values. */
  values?: readonly string[];
  /** `number`: unit and range as the catalog stores them. */
  unit?: string;
  min?: number;
  max?: number;
  whole?: boolean;
  /** `text`: the longest value. */
  maxLength?: number;
  /** How a product gets its value; the defaults follow the type. */
  draw?: {
    /** Values to choose from (numbers or texts); by default the allowed values or the range. */
    choices?: readonly (string | number)[];
    /** Higher-tier products take values further along `choices` (more memory, faster). */
    byTier?: boolean;
    /** `boolean`: the probability of `true`. */
    p?: number;
    /** `multi_select`: how many values, at least and at most. */
    count?: readonly [number, number];
    /** `number` without choices: the step between values. */
    step?: number;
  };
  /** An optional attribute is given to this share of products (default 0.8). */
  present?: number;
}

/** A product model of a leaf: its tier in [0, 1], the brands that make it, fixed specs. */
export interface ModelDef {
  name: string;
  tier: number;
  brands?: readonly string[];
  specs?: Readonly<Record<string, SpecValue>>;
  /** Choices for this model only, so values stay consistent (DDR4 speeds, SATA speeds). */
  choices?: Choices;
}

export type Choices = Readonly<Record<string, readonly (string | number)[]>>;

export interface LeafDef {
  /** The share of products in this leaf, relative to the other leaves. */
  weight: number;
  /** Price range in euro cents, from the lowest to the highest tier. */
  price: readonly [number, number];
  /** Brand slugs, most common first: the Zipf ranks (plan D-3). */
  brands: readonly string[];
  models: readonly ModelDef[];
  /** Spec codes whose values end the product name ("12GB", "1TB"). */
  nameSpecs?: readonly string[];
  /** Choices of inherited attributes for this leaf (capacities of SSDs vs hard drives). */
  choices?: Choices;
  /** A sentence about the product kind, opening the description. */
  blurb: string;
}

export interface CategoryDef {
  slug: string;
  name: string;
  attributes: readonly AttributeDef[];
  children?: readonly CategoryDef[];
  leaf?: LeafDef;
}

export interface BrandDef {
  slug: string;
  name: string;
  /** Three letters that open its SKUs. */
  code: string;
  /** Product lines per leaf slug ("ROG Strix", "TUF Gaming"); none → the model alone. */
  lines?: Readonly<Record<string, readonly string[]>>;
}
