/** Health packages: bundled test codes with a bundle discount. */
const PACKAGES = [
  { id: 'pkg-executive', name: 'Executive Health Check', discountPercent: 12, testCodes: ['CBC', 'LIPID', 'LFT', 'FBS', 'HBA1C'] },
  { id: 'pkg-diabetic', name: 'Diabetic Profile', discountPercent: 12, testCodes: ['FBS', 'HBA1C', 'LIPID'] },
];

function findPackage(id) {
  return PACKAGES.find((p) => p.id === id) || null;
}

/** Price lines + totals for a set of tests at one center. Missing tests are reported, not guessed. */
function buildQuote(center, tests, { discountPercent = 0 } = {}) {
  const lines = [];
  const missing = [];
  for (const t of tests) {
    const price = center.priceFor(t.code);
    if (price === null) missing.push(t.code);
    else lines.push({ testId: t._id, code: t.code, name: t.name, price });
  }
  const subtotal = lines.reduce((s, l) => s + l.price, 0);
  const discount = Math.round((subtotal * discountPercent) / 100);
  const afterDiscount = subtotal - discount;
  const freeCollection = afterDiscount >= center.freeCollectionAbove;
  const collectionFee = center.homeCollection && !freeCollection ? center.collectionFee : 0;
  return {
    lines,
    missing,
    subtotal,
    discount,
    collectionFee,
    freeCollection: center.homeCollection && freeCollection,
    total: afterDiscount + collectionFee,
    offersAll: missing.length === 0,
  };
}

module.exports = { PACKAGES, findPackage, buildQuote };
