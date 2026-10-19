import {sql} from "drizzle-orm";
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), name: text("name").notNull(),
  email: text("email").notNull().unique(), studentId: text("student_id").notNull().unique(),
  phone: text("phone").notNull(), room: integer("room").notNull(),
  // Preserve the old numeric room column; new locations are entered as text.
  roomLabel: text("room_label"), hostel: text("hostel"), wing: text("wing"), phase: text("phase"),
  passwordHash: text("password_hash").notNull(), salt: text("salt").notNull(),
  upiQrId: text("upi_qr_id"),
  showPhone: integer("show_phone").notNull().default(0),
  isOpen: integer("is_open").notNull().default(1),
  shopSleeping: integer("shop_sleeping").notNull().default(0),
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
  moderationStatus: text("moderation_status").notNull().default("approved"),
  productKey: text("product_key").notNull(), name: text("name").notNull(),
  size: text("size").notNull(), category: text("category").notNull(),
  mrp: integer("mrp"), photoId: text("photo_id"),
  container: text("container"), volumeMl: integer("volume_ml"),
  priceAfter: integer("price_after"), priceUntil: integer("price_until"), usualPrice: integer("usual_price"), offerText: text("offer_text"),
  price: integer("price").notNull(), available: integer("available").notNull().default(1),
  updatedAt: integer("updated_at").notNull(),
}, (t) => [index("listings_seller").on(t.sellerId), uniqueIndex("listing_product_seller").on(t.sellerId, t.productKey)]);
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(), count: integer("count").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
// Open archive metadata stays separate from students, stock and selling prices.
export const packetPhotos = sqliteTable("packet_photos", {
  reviewStatus: text("review_status").notNull().default("approved"),
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
  moderationStatus:text("moderation_status").notNull().default("approved"),
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

export const marketMedia=sqliteTable("market_media",{
 id:text("id").primaryKey(),ownerId:text("owner_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
 kind:text("kind").notNull(),objectKey:text("object_key").notNull(),contentType:text("content_type").notNull(),
 status:text("status").notNull().default("pending"),createdAt:integer("created_at").notNull(),
});
export const imageStorage=sqliteTable("image_storage",{
 id:text("id").primaryKey(),objectKey:text("object_key").notNull(),byteSize:integer("byte_size").notNull(),createdAt:integer("created_at").notNull(),
});
export const sellerBooks=sqliteTable("seller_books",{
 sellerId:text("seller_id").primaryKey().references(()=>users.id,{onDelete:"cascade"}),revision:integer("revision").notNull().default(0),
});
export const sellerLedger=sqliteTable("seller_ledger",{
 id:text("id").primaryKey(),sellerId:text("seller_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
 productKey:text("product_key").notNull(),name:text("name").notNull(),kind:text("kind").notNull(),quantity:integer("quantity").notNull(),unitPrice:integer("unit_price").notNull(),entryDate:text("entry_date").notNull(),notes:text("notes").notNull().default(""),createdAt:integer("created_at").notNull(),
},t=>[index("seller_ledger_owner_date").on(t.sellerId,t.entryDate)]);
export const pawnListings=sqliteTable("pawn_listings",{
 id:text("id").primaryKey(),sellerId:text("seller_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
 title:text("title").notNull(),description:text("description").notNull(),category:text("category").notNull(),
 condition:text("condition").notNull(),price:integer("price").notNull(),photoId:text("photo_id"),
 status:text("status").notNull().default("pending"),available:integer("available").notNull().default(1),
 createdAt:integer("created_at").notNull(),updatedAt:integer("updated_at").notNull(),
},t=>[index("pawn_status_created").on(t.status,t.createdAt),index("pawn_seller").on(t.sellerId)]);

export const campusHostels=sqliteTable("campus_hostels",{id:text("id").primaryKey(),name:text("name").notNull(),short:text("short").notNull(),initials:text("initials").notNull(),createdAt:integer("created_at").notNull()},t=>[uniqueIndex("campus_hostels_name_unique").on(sql`lower(${t.name})`)]);
