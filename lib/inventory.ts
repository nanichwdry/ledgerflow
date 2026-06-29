import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/**
 * Pure weighted-average cost math — no Prisma involved, so it's directly
 * unit-testable. Rolls a new purchase quantity/cost into the running average.
 */
export function computeWeightedAverageCost(
  existingQuantity: number,
  existingAverageCostCents: number,
  purchaseQuantity: number,
  purchaseUnitCostCents: number
) {
  const newQuantity = existingQuantity + purchaseQuantity;
  const newAverageCostCents =
    newQuantity > 0
      ? Math.round(
          (existingQuantity * existingAverageCostCents + purchaseQuantity * purchaseUnitCostCents) /
            newQuantity
        )
      : existingAverageCostCents;
  return { newQuantity, newAverageCostCents };
}

/** Pure COGS math — quantity sold at the item's current average cost. */
export function computeCogs(saleQuantity: number, averageCostCents: number) {
  return Math.round(saleQuantity * averageCostCents);
}

/** A purchase (bill line) increases stock and rolls the unit cost into a weighted average. */
export async function applyInventoryPurchase(
  tx: Tx,
  itemId: string,
  quantity: number,
  unitCostCents: number
) {
  const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
  const { newQuantity, newAverageCostCents } = computeWeightedAverageCost(
    item.quantityOnHand,
    item.averageCostCents,
    quantity,
    unitCostCents
  );

  await tx.inventoryItem.update({
    where: { id: itemId },
    data: { quantityOnHand: newQuantity, averageCostCents: newAverageCostCents },
  });
}

/**
 * A sale (invoice line) draws down stock at the item's current average cost and
 * returns the COGS amount to post. Average cost itself doesn't change on a sale.
 */
export async function applyInventorySale(tx: Tx, itemId: string, quantity: number) {
  const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
  const cogsCents = computeCogs(quantity, item.averageCostCents);

  await tx.inventoryItem.update({
    where: { id: itemId },
    data: { quantityOnHand: item.quantityOnHand - quantity },
  });

  return { cogsCents, accountId: item.cogsAccountId, inventoryAccountId: item.inventoryAccountId };
}
