-- UUID version 7 (RFC 9562): a 48-bit Unix time in milliseconds, then random bits, so
-- ids grow with creation time and new rows land at the end of the indexes (FR-035,
-- research R-1). The default of every new table's id; replaced by the built-in
-- uuidv7() when the database moves to PostgreSQL 18.
-- Take a random v4 UUID, put the time in its first 6 bytes, and turn version 4 (0100)
-- into 7 (0111) by setting bits 52 and 53; the variant bits of v4 are already right.
CREATE OR REPLACE FUNCTION uuid_v7() RETURNS uuid
LANGUAGE sql VOLATILE PARALLEL SAFE AS $$
  SELECT encode(
    set_bit(
      set_bit(
        overlay(uuid_send(gen_random_uuid())
                PLACING substring(int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3)
                FROM 1 FOR 6),
        52, 1),
      53, 1),
    'hex')::uuid
$$;
