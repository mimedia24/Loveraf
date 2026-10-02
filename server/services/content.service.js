const { badRequest, notFound } = require("../utils/errors");

const keys = new Set([
  "categories",
  "home-banners",
  "home-promotion",
  "terms-policies",
  "about",
  "faq",
]);
const text = (value, max = 5000) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;
function assertKey(key) {
  if (!keys.has(key)) throw notFound("Content section not found.");
}
function validateContent(key, data) {
  assertKey(key);
  let valid = false;
  if (key === "categories")
    valid =
      Array.isArray(data) &&
      data.length <= 50 &&
      new Set(data.map((item) => item?.id)).size === data.length &&
      data.every(
        (item) =>
          item &&
          text(item.id, 100) &&
          text(item.name, 100) &&
          (!item.art ||
            [
              "headphones",
              "hoodie",
              "watch",
              "chair",
              "dress",
              "phone",
              "shoe",
              "beauty",
              "grocery",
            ].includes(item.art)) &&
          (!item.color || /^#[0-9a-f]{6}$/i.test(item.color)),
      );
  if (key === "home-banners")
    valid =
      Array.isArray(data) &&
      data.length <= 8 &&
      data.every(
        (item) =>
          item &&
          text(item.id, 100) &&
          text(item.kicker, 100) &&
          text(item.title, 300) &&
          text(item.sub, 500) &&
          [
            "headphones",
            "hoodie",
            "watch",
            "chair",
            "dress",
            "phone",
            "shoe",
            "beauty",
            "grocery",
          ].includes(item.art) &&
          /^#[0-9a-f]{6}$/i.test(item.color),
      );
  if (key === "home-promotion")
    valid =
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      text(data.kicker, 100) &&
      text(data.title, 300) &&
      text(data.sub, 500) &&
      (!data.endsAt || Number.isFinite(new Date(data.endsAt).getTime()));
  if (["terms-policies", "about"].includes(key))
    valid =
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      (!data.title || text(data.title, 300)) &&
      Array.isArray(data.sections) &&
      data.sections.length <= 100 &&
      data.sections.every(
        (item) =>
          item && (!item.heading || text(item.heading, 300)) && text(item.body),
      );
  if (key === "faq")
    valid =
      Array.isArray(data) &&
      data.length <= 100 &&
      data.every(
        (item) =>
          item &&
          text(item.question, 500) &&
          text(item.answer) &&
          (!item.category || text(item.category, 100)),
      );
  if (!valid) throw badRequest(`Content for ${key} has an invalid structure.`);
  return data;
}
module.exports = { assertKey, validateContent };
