import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), name: text("name").notNull(),
  email: text("email").notNull().unique(), studentId: text("student_id").notNull().unique(),
  phone: text("phone").notNull(), room: integer("room").notNull(),
  // Preserve the old numeric room column; new locations are entered as text.
  roomLabel: text("room_label"), hostel: text("hostel"), wing: text("wing"), phase: text("phase"),
  passwordHash: text("password_hash").notNull(), salt: text("salt").notNull(),
  showPhone: integer("show_phone").notNull().default(0),
  isOpen: integer("is_open").notNull().default(1),
  role: text("role").notNull().default("seller"),
  mustChangePassword: integer("must_change_password").notNull().default(0),
  confirmedAt: integer("confirmed_at").notNull(), createdAt: integer("created_at").notNull(),
}, (t) => [index("users_confirmed").on(t.confirmedAt), index("users_hostel_confirmed").on(t.hostel, t.confirmedAt)]);
export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
}, (t) => [index("sessions_user").on(t.userId), index("sessions_expiry").on(t.expiresAt)]);
export const listings = sqliteTable("listings", {
  id: text("id").primaryKey(),
  sellerId: text("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productKey: text("product_key").notNull(), name: text("name").notNull(),
  size: text("size").notNull(), category: text("category").notNull(),
  mrp: integer("mrp"), photoId: text("photo_id"),
  container: text("container"), volumeMl: integer("volume_ml"),
  price: integer("price").notNull(), available: integer("available").notNull().default(1),
  updatedAt: integer("updated_at").notNull(),
}, (t) => [index("listings_seller").on(t.sellerId), uniqueIndex("listing_product_seller").on(t.sellerId, t.productKey)]);
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(), count: integer("count").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
// Open archive metadata stays separate from students, stock and selling prices.
export const packetPhotos = sqliteTable("packet_photos", {
  id: text("id").primaryKey(), objectKey: text("object_key").notNull(),
  contentType: text("content_type").notNull(), source: text("source").notNull(),
  sourceUrl: text("source_url"), credit: text("credit").notNull(), license: text("license"),
  matchedName: text("matched_name").notNull(), uploadedBy: text("uploaded_by"),
  productGroup: text("product_group"), category: text("category"),
  createdAt: integer("created_at").notNull(),
});
export const productPhotoDefaults = sqliteTable("product_photo_defaults", {
  productGroup:text("product_group").primaryKey(), name:text("name").notNull(),
  category:text("category").notNull(), photoId:text("photo_id").notNull(),
  selectedBy:text("selected_by").notNull(), updatedAt:integer("updated_at").notNull(),
});
export const productCatalog = sqliteTable("product_catalog", {
  productGroup:text("product_group").primaryKey(),name:text("name").notNull(),
  category:text("category").notNull(),createdAt:integer("created_at").notNull(),
});
export const packetCache = sqliteTable("packet_cache", {
  productKey: text("product_key").primaryKey(), photoId: text("photo_id"),
  status: text("status").notNull(), retryAfter: integer("retry_after").notNull(),
});
export const audit = sqliteTable("audit", {
  id: text("id").primaryKey(), actor: text("actor").notNull(),
  target: text("target").notNull(), action: text("action").notNull(),
  createdAt: integer("created_at").notNull(),
});
