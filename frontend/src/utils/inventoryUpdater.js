import { createStockMovement, getProducts, getWarehouses } from '../services/api';

export const updateInventoryFromPurchaseOrder = async (purchaseOrder) => {
  try {
    const [products, warehouses] = await Promise.all([
      getProducts().catch(() => []),
      getWarehouses().catch(() => [])
    ]);

    const resolveProductId = (item) => {
      if (item.product_id) return item.product_id;
      if (item.productId) return item.productId;
      const code = item.productCode || item.code || null;
      const name = item.product || item.productName || null;
      let found = null;
      if (code) found = products.find(p => (p.sku || '').toLowerCase() === String(code).toLowerCase());
      if (!found && name) found = products.find(p => (p.name || '').toLowerCase() === String(name).toLowerCase());
      return found ? found.id : null;
    };

    const resolveWarehouseId = (hint) => {
      if (!hint) return null;
      if (hint.warehouse_id) return hint.warehouse_id;
      if (hint.warehouseId) return hint.warehouseId;
      const name = hint.warehouse || hint.warehouse_name;
      if (name && Array.isArray(warehouses)) {
        const w = warehouses.find(x => (x.name || '').toLowerCase() === String(name).toLowerCase());
        return w ? w.id : null;
      }
      return null;
    };

    const movement_date = purchaseOrder.deliveryDate || purchaseOrder.received_date || new Date().toISOString().slice(0, 10);
    const reference_no = purchaseOrder.po_no || purchaseOrder.poNumber || (purchaseOrder.id ? `PO-${purchaseOrder.id}` : 'PO');
    const defaultWarehouseId = resolveWarehouseId(purchaseOrder) || (warehouses[0]?.id || null);

    const prepared = [];

    if (Array.isArray(purchaseOrder.items)) {
      for (const item of purchaseOrder.items) {
        const product_id = resolveProductId(item);
        const warehouse_id = resolveWarehouseId(item) || defaultWarehouseId;
        const quantity = parseFloat(item.quantity ?? item.qty ?? 0) || 0;
        const unit_cost = parseFloat(item.unitPrice ?? item.unit_cost_usd ?? 0) || 0;
        if (!product_id || !warehouse_id || quantity <= 0) continue;
        prepared.push({ product_id, warehouse_id, movement_type: 'IN', quantity, unit_cost, reference_no, movement_date, notes: purchaseOrder.notes || null });
      }
    }

    if (Array.isArray(purchaseOrder.elevators)) {
      for (const el of purchaseOrder.elevators) {
        const product_id = resolveProductId({ productCode: el.elevator_code, product: el.elevator_code });
        const warehouse_id = defaultWarehouseId;
        if (!product_id || !warehouse_id) continue;
        const unit_cost = parseFloat(el.total_cost_usd ?? el.unit_price_usd ?? 0) || 0;
        prepared.push({ product_id, warehouse_id, movement_type: 'IN', quantity: 1, unit_cost, reference_no: `${reference_no}-ELEVATOR-${el.elevator_code}`, movement_date, notes: 'Elevator receipt' });
      }
    }

    const results = [];
    const errors = [];
    for (const mv of prepared) {
      try {
        const created = await createStockMovement(mv);
        results.push({ success: true, id: created.id, movement: created });
      } catch (e) {
        errors.push({ movement: mv, error: e.message });
        results.push({ success: false, error: e.message, movement: mv });
      }
    }
    const successCount = results.filter(r => r.success).length;
    return { success: successCount > 0, updatesCount: successCount, totalAttempts: prepared.length, failedCount: results.length - successCount, stockMovements: results, errors };
  } catch (error) {
    throw new Error('Inventory update failed: ' + error.message);
  }
};

export const validateInventoryUpdateRelaxed = (purchaseOrder) => {
  const validationErrors = [];
  const hasItems = Array.isArray(purchaseOrder.items) && purchaseOrder.items.length > 0;
  const hasElevators = Array.isArray(purchaseOrder.elevators) && purchaseOrder.elevators.length > 0;
  if (!hasItems && !hasElevators) {
    validationErrors.push('لا توجد أصناف أو مصاعد للاستلام');
  }
  return { isValid: validationErrors.length === 0, errors: validationErrors };
};

