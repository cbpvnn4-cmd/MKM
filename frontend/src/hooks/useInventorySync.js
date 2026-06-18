import { useState, useEffect } from 'react';

// Hook for real-time inventory synchronization
export const useInventorySync = () => {
  const [inventoryUpdates, setInventoryUpdates] = useState(new Map());
  const [isUpdating, setIsUpdating] = useState(false);

  // Function to broadcast inventory updates
  const broadcastInventoryUpdate = (productCode, warehouseId, change) => {
    const key = `${productCode}_${warehouseId}`;

    setInventoryUpdates(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(key) || { currentStock: 0, pendingChanges: 0 };

      newMap.set(key, {
        ...current,
        pendingChanges: current.pendingChanges + change,
        lastUpdate: new Date().toISOString(),
        productCode,
        warehouseId
      });

      return newMap;
    });

    // Broadcast to other components using custom event
    const event = new CustomEvent('inventoryUpdate', {
      detail: { productCode, warehouseId, change, timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  };

  // Function to apply pending changes
  const applyPendingChanges = async () => {
    setIsUpdating(true);

    try {
      // In a real application, this would sync with the backend
      const updates = Array.from(inventoryUpdates.entries());

      for (const [key, data] of updates) {
        if (data.pendingChanges !== 0) {
          console.log(`📊 تطبيق تحديث المخزون: ${data.productCode} - ${data.pendingChanges}`);

          // Simulate API call to update current stock
          // await updateProductStock(data.productCode, data.warehouseId, data.pendingChanges);
        }
      }

      // Clear pending changes
      setInventoryUpdates(new Map());

    } catch (error) {
      console.error('Failed to apply inventory changes:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Auto-apply changes after a delay
  useEffect(() => {
    if (inventoryUpdates.size > 0) {
      const timer = setTimeout(applyPendingChanges, 2000); // Apply after 2 seconds
      return () => clearTimeout(timer);
    }
  }, [inventoryUpdates]);

  return {
    inventoryUpdates,
    isUpdating,
    broadcastInventoryUpdate,
    applyPendingChanges
  };
};

// Hook to listen for inventory updates
export const useInventoryListener = (productCode, warehouseId) => {
  const [stock, setStock] = useState({ current: 0, pending: 0, updating: false });

  useEffect(() => {
    const handleInventoryUpdate = (event) => {
      const { productCode: updatedProduct, warehouseId: updatedWarehouse, change } = event.detail;

      if (productCode === updatedProduct && warehouseId === updatedWarehouse) {
        setStock(prev => ({
          ...prev,
          pending: prev.pending + change,
          updating: true
        }));

        // Clear updating flag after a short delay
        setTimeout(() => {
          setStock(prev => ({
            current: prev.current + prev.pending,
            pending: 0,
            updating: false
          }));
        }, 1500);
      }
    };

    window.addEventListener('inventoryUpdate', handleInventoryUpdate);

    return () => {
      window.removeEventListener('inventoryUpdate', handleInventoryUpdate);
    };
  }, [productCode, warehouseId]);

  return stock;
};