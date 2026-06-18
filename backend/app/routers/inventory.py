from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from decimal import Decimal

from app.database.database import get_db
from app.models.purchases import Supplier as SupplierModel, PurchaseOrder as PurchaseOrderModel, APInvoice as APInvoiceModel
from app.models.inventory import Warehouse as WarehouseModel, StockMovement as StockMovementModel
from app.models.products import Product as ProductModel
from app.models.sales import SalesOrderItem as SalesOrderItemModel
from app.schemas.inventory import Supplier, SupplierCreate, SupplierUpdate, PurchaseOrder, PurchaseOrderCreate, PurchaseOrderUpdate, APInvoice, APInvoiceCreate, APInvoiceUpdate, Warehouse, WarehouseCreate, WarehouseUpdate, StockMovement, StockMovementCreate, StockMovementUpdate

router = APIRouter()


def calculate_product_stock(db: Session, product_id: int) -> float:
    """Return current stock based on stock movement records."""
    stock_in = db.query(func.coalesce(func.sum(StockMovementModel.quantity), 0)).filter(
        StockMovementModel.product_id == product_id,
        StockMovementModel.movement_type == 'IN'
    ).scalar() or 0

    stock_out = db.query(func.coalesce(func.sum(StockMovementModel.quantity), 0)).filter(
        StockMovementModel.product_id == product_id,
        StockMovementModel.movement_type == 'OUT'
    ).scalar() or 0

    adjustments = db.query(func.coalesce(func.sum(StockMovementModel.quantity), 0)).filter(
        StockMovementModel.product_id == product_id,
        StockMovementModel.movement_type == 'ADJUST'
    ).scalar() or 0

    return float(stock_in - stock_out + adjustments)

# Supplier endpoints
@router.get("/suppliers", response_model=List[Supplier])
def read_suppliers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    suppliers = db.query(SupplierModel).offset(skip).limit(limit).all()
    return suppliers


@router.post("/suppliers", response_model=Supplier)
def create_supplier(supplier: SupplierCreate, db: Session = Depends(get_db)):
    db_supplier = SupplierModel(**supplier.dict())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@router.get("/suppliers/{supplier_id}", response_model=Supplier)
def read_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(SupplierModel).filter(SupplierModel.id == supplier_id).first()
    if supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.put("/suppliers/{supplier_id}", response_model=Supplier)
def update_supplier(supplier_id: int, supplier: SupplierUpdate, db: Session = Depends(get_db)):
    db_supplier = db.query(SupplierModel).filter(SupplierModel.id == supplier_id).first()
    if db_supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    for key, value in supplier.dict().items():
        setattr(db_supplier, key, value)
    
    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@router.delete("/suppliers/{supplier_id}", response_model=Supplier)
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    db_supplier = db.query(SupplierModel).filter(SupplierModel.id == supplier_id).first()
    if db_supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    db.delete(db_supplier)
    db.commit()
    return db_supplier


# ============================================
# Purchase Order endpoints moved to purchases.py
# ============================================


# AP Invoice endpoints
@router.get("/ap-invoices", response_model=List[APInvoice])
def read_ap_invoices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    ap_invoices = db.query(APInvoiceModel).offset(skip).limit(limit).all()
    return ap_invoices


@router.post("/ap-invoices", response_model=APInvoice)
def create_ap_invoice(ap_invoice: APInvoiceCreate, db: Session = Depends(get_db)):
    db_ap_invoice = APInvoiceModel(**ap_invoice.dict())
    db.add(db_ap_invoice)
    db.commit()
    db.refresh(db_ap_invoice)
    return db_ap_invoice


@router.get("/ap-invoices/{invoice_id}", response_model=APInvoice)
def read_ap_invoice(invoice_id: int, db: Session = Depends(get_db)):
    ap_invoice = db.query(APInvoiceModel).filter(APInvoiceModel.id == invoice_id).first()
    if ap_invoice is None:
        raise HTTPException(status_code=404, detail="AP invoice not found")
    return ap_invoice


@router.put("/ap-invoices/{invoice_id}", response_model=APInvoice)
def update_ap_invoice(invoice_id: int, ap_invoice: APInvoiceUpdate, db: Session = Depends(get_db)):
    db_ap_invoice = db.query(APInvoiceModel).filter(APInvoiceModel.id == invoice_id).first()
    if db_ap_invoice is None:
        raise HTTPException(status_code=404, detail="AP invoice not found")
    
    for key, value in ap_invoice.dict().items():
        setattr(db_ap_invoice, key, value)
    
    db.commit()
    db.refresh(db_ap_invoice)
    return db_ap_invoice


@router.delete("/ap-invoices/{invoice_id}", response_model=APInvoice)
def delete_ap_invoice(invoice_id: int, db: Session = Depends(get_db)):
    db_ap_invoice = db.query(APInvoiceModel).filter(APInvoiceModel.id == invoice_id).first()
    if db_ap_invoice is None:
        raise HTTPException(status_code=404, detail="AP invoice not found")
    
    db.delete(db_ap_invoice)
    db.commit()
    return db_ap_invoice


# Warehouse endpoints
@router.get("/warehouses", response_model=List[Warehouse])
def read_warehouses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    warehouses = db.query(WarehouseModel).offset(skip).limit(limit).all()
    return warehouses


@router.post("/warehouses", response_model=Warehouse)
def create_warehouse(warehouse: WarehouseCreate, db: Session = Depends(get_db)):
    db_warehouse = WarehouseModel(**warehouse.dict())
    db.add(db_warehouse)
    db.commit()
    db.refresh(db_warehouse)
    return db_warehouse


@router.get("/warehouses/{warehouse_id}", response_model=Warehouse)
def read_warehouse(warehouse_id: int, db: Session = Depends(get_db)):
    warehouse = db.query(WarehouseModel).filter(WarehouseModel.id == warehouse_id).first()
    if warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return warehouse


@router.put("/warehouses/{warehouse_id}", response_model=Warehouse)
def update_warehouse(warehouse_id: int, warehouse: WarehouseUpdate, db: Session = Depends(get_db)):
    db_warehouse = db.query(WarehouseModel).filter(WarehouseModel.id == warehouse_id).first()
    if db_warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    for key, value in warehouse.dict().items():
        setattr(db_warehouse, key, value)
    
    db.commit()
    db.refresh(db_warehouse)
    return db_warehouse


@router.delete("/warehouses/{warehouse_id}", response_model=Warehouse)
def delete_warehouse(warehouse_id: int, db: Session = Depends(get_db)):
    db_warehouse = db.query(WarehouseModel).filter(WarehouseModel.id == warehouse_id).first()
    if db_warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    db.delete(db_warehouse)
    db.commit()
    return db_warehouse


# Stock Movement endpoints
@router.get("/stock-movements", response_model=List[StockMovement])
def read_stock_movements(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    stock_movements = db.query(StockMovementModel).offset(skip).limit(limit).all()
    return stock_movements


@router.get("/stock-movements/{movement_id}", response_model=StockMovement)
def read_stock_movement(movement_id: int, db: Session = Depends(get_db)):
    db_stock_movement = db.query(StockMovementModel).filter(StockMovementModel.id == movement_id).first()
    if db_stock_movement is None:
        raise HTTPException(status_code=404, detail="Stock movement not found")
    return db_stock_movement


@router.post("/stock-movements", response_model=StockMovement)
def create_stock_movement(stock_movement: StockMovementCreate, db: Session = Depends(get_db)):
    # Verify that product exists
    if stock_movement.product_id:
        product = db.query(ProductModel).filter(ProductModel.id == stock_movement.product_id).first()
        if product is None:
            raise HTTPException(status_code=404, detail="Product not found")
    
    db_stock_movement = StockMovementModel(**stock_movement.dict())
    db.add(db_stock_movement)
    db.commit()
    db.refresh(db_stock_movement)
    return db_stock_movement


@router.put("/stock-movements/{movement_id}", response_model=StockMovement)
def update_stock_movement(movement_id: int, stock_movement: StockMovementUpdate, db: Session = Depends(get_db)):
    db_stock_movement = db.query(StockMovementModel).filter(StockMovementModel.id == movement_id).first()
    if db_stock_movement is None:
        raise HTTPException(status_code=404, detail="Stock movement not found")
    
    # Verify that product exists
    if stock_movement.product_id:
        product = db.query(ProductModel).filter(ProductModel.id == stock_movement.product_id).first()
        if product is None:
            raise HTTPException(status_code=404, detail="Product not found")
    
    for key, value in stock_movement.dict().items():
        setattr(db_stock_movement, key, value)
    
    db.commit()
    db.refresh(db_stock_movement)
    return db_stock_movement


@router.delete("/stock-movements/{movement_id}", response_model=StockMovement)
def delete_stock_movement(movement_id: int, db: Session = Depends(get_db)):
    db_stock_movement = db.query(StockMovementModel).filter(StockMovementModel.id == movement_id).first()
    if db_stock_movement is None:
        raise HTTPException(status_code=404, detail="Stock movement not found")

    db.delete(db_stock_movement)
    db.commit()
    return db_stock_movement


# Elevator Components Analytics
@router.get("/products/{product_id}/components-summary")
def get_product_components_summary(product_id: int, db: Session = Depends(get_db)):
    """
    Get components summary for an elevator product.
    Returns sold components and remaining stock.
    """
    # Get product
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Calculate total sold components from sales_order_items
    sold_components = db.query(
        func.coalesce(func.sum(SalesOrderItemModel.sections), 0).label('total_sections'),
        func.coalesce(func.sum(SalesOrderItemModel.ropes), 0).label('total_ropes'),
        func.coalesce(func.sum(SalesOrderItemModel.cable_meters), 0).label('total_cable_meters'),
        func.coalesce(func.sum(SalesOrderItemModel.cabins), 0).label('total_cabins'),
        func.coalesce(func.sum(SalesOrderItemModel.doors), 0).label('total_doors')
    ).filter(SalesOrderItemModel.product_id == product_id).first()

    return {
        "product_id": product.id,
        "product_name": product.name,
        "product_sku": product.sku,
        "current_stock": calculate_product_stock(db, product_id),
        "category": product.category,
        "sold_components": {
            "sections": int(sold_components.total_sections) if sold_components.total_sections else 0,
            "ropes": int(sold_components.total_ropes) if sold_components.total_ropes else 0,
            "cable_meters": float(sold_components.total_cable_meters) if sold_components.total_cable_meters else 0.0,
            "cabins": int(sold_components.total_cabins) if sold_components.total_cabins else 0,
            "doors": int(sold_components.total_doors) if sold_components.total_doors else 0
        }
    }


@router.get("/elevator-components-report")
def get_elevator_components_report(db: Session = Depends(get_db)):
    """
    Get a full report of all elevator products with their components.
    """
    # Get all elevator products
    elevator_products = db.query(ProductModel).filter(
        ProductModel.category.ilike('%elevator%')
    ).all()

    report = []

    for product in elevator_products:
        # Calculate sold components
        sold_components = db.query(
            func.coalesce(func.sum(SalesOrderItemModel.sections), 0).label('total_sections'),
            func.coalesce(func.sum(SalesOrderItemModel.ropes), 0).label('total_ropes'),
            func.coalesce(func.sum(SalesOrderItemModel.cable_meters), 0).label('total_cable_meters'),
            func.coalesce(func.sum(SalesOrderItemModel.cabins), 0).label('total_cabins'),
            func.coalesce(func.sum(SalesOrderItemModel.doors), 0).label('total_doors')
        ).filter(SalesOrderItemModel.product_id == product.id).first()

        report.append({
            "product_id": product.id,
            "product_name": product.name,
            "product_sku": product.sku,
            "current_stock": calculate_product_stock(db, product.id),
            "price_usd": float(product.price_usd) if product.price_usd else 0.0,
            "sold_components": {
                "sections": int(sold_components.total_sections) if sold_components.total_sections else 0,
                "ropes": int(sold_components.total_ropes) if sold_components.total_ropes else 0,
                "cable_meters": float(sold_components.total_cable_meters) if sold_components.total_cable_meters else 0.0,
                "cabins": int(sold_components.total_cabins) if sold_components.total_cabins else 0,
                "doors": int(sold_components.total_doors) if sold_components.total_doors else 0
            }
        })

    return {
        "total_elevators": len(report),
        "elevators": report
    }


@router.get("/sales-order-items-with-components")
def get_sales_order_items_with_components(
    skip: int = 0,
    limit: int = 100,
    product_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get sales order items with their component details.
    Useful for inventory movements display.
    """
    query = db.query(SalesOrderItemModel).join(ProductModel)

    if product_id:
        query = query.filter(SalesOrderItemModel.product_id == product_id)

    items = query.offset(skip).limit(limit).all()

    result = []
    for item in items:
        product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()

        result.append({
            "id": item.id,
            "sales_order_id": item.sales_order_id,
            "product_id": item.product_id,
            "product_name": product.name if product else "Unknown",
            "product_sku": product.sku if product else "N/A",
            "qty": float(item.qty) if item.qty else 0,
            "unit_price_usd": float(item.unit_price_usd) if item.unit_price_usd else 0.0,
            "line_total_usd": float(item.line_total_usd) if item.line_total_usd else 0.0,
            "components": {
                "sections": item.sections or 0,
                "ropes": item.ropes or 0,
                "cable_meters": float(item.cable_meters) if item.cable_meters else 0.0,
                "cabins": item.cabins or 0,
                "doors": item.doors or 0
            },
            "created_at": str(item.created_at) if item.created_at else None
        })

    return {
        "total": len(result),
        "items": result
    }
