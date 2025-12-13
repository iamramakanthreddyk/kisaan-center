Farmer Stock Management System - Implementation Strategy
After analyzing your Enhanced ERD document against the existing codebase, I've identified several key improvements needed to fully align your database layer with the requirements. Let's address them systematically:

1. Implementation Strategy
Phase 1: Core Model & Schema Updates
Update SQLAlchemy models with missing fields and constraints
Create migration scripts for schema changes
Implement audit logging functionality
Phase 2: Business Logic & Validation
Implement business rules as service layer functions
Add validation logic for complex constraints
Create helper functions for computed properties
Phase 3: Performance Optimization
Add indexes for common query patterns
Implement partitioning strategy (if needed)
Add database-level constraints for data integrity
2. Implementation Code Snippets
SQLAlchemy Model Updates

import enum
from datetime import date, datetime
from sqlalchemy import (
    Column, Integer, ForeignKey, DECIMAL, String, Date, DateTime, 
    Text, Boolean, Enum, CheckConstraint, Index, UniqueConstraint, func
)
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import relationship, validates
from .base import Base

class StockMode(enum.Enum):
    declared = "declared"
    implicit = "implicit"

class StockStatus(enum.Enum):
    active = "active"
    inactive = "inactive"
    archived = "archived"

class FarmerStock(Base):
    __tablename__ = "farmer_stock"
    
    id = Column(Integer, primary_key=True)
    farmer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    shop_id = Column(Integer, ForeignKey("shop.id", ondelete="CASCADE"), nullable=False)
    
    # Stock Quantities
    declared_qty = Column(DECIMAL(10, 3), nullable=True)
    sold_qty = Column(DECIMAL(10, 3), nullable=False, default=0)
    
    # Pricing
    unit_price = Column(DECIMAL(10, 2), nullable=True)
    
    # Stock Management
    mode = Column(Enum(StockMode), nullable=False, default=StockMode.implicit)
    declared_at = Column(DateTime, nullable=True)
    declared_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Carryover Support
    carry_forward = Column(Boolean, default=False)
    carried_from_date = Column(Date, nullable=True)
    
    # Business Fields
    entry_date = Column(Date, nullable=False, default=date.today)
    notes = Column(Text, nullable=True)
    
    # System Fields
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    status = Column(Enum(StockStatus), nullable=False, default=StockStatus.active)
    
    # Relationships
    farmer = relationship("User", foreign_keys=[farmer_id])
    declared_by = relationship("User", foreign_keys=[declared_by_id])
    product = relationship("Product")
    shop = relationship("Shop")
    audit_logs = relationship("FarmerStockAudit", back_populates="farmer_stock")
    transaction_items = relationship("TransactionItem", back_populates="farmer_stock")
    
    # Computed properties
    @hybrid_property
    def balance_qty(self):
        if self.declared_qty is not None:
            return self.declared_qty - self.sold_qty
        return None
    
    @hybrid_property
    def sold_value(self):
        if self.unit_price is not None:
            return self.sold_qty * self.unit_price
        return None
    
    @hybrid_property
    def is_oversold(self):
        if self.mode == StockMode.declared and self.declared_qty is not None:
            return self.sold_qty > self.declared_qty
        return False
    
    @hybrid_property
    def completion_percentage(self):
        if self.declared_qty and self.declared_qty > 0:
            return (self.sold_qty / self.declared_qty) * 100
        return 0
    
    # Validations
    @validates('declared_qty')
    def validate_declared_qty(self, key, declared_qty):
        if declared_qty is not None:
            if declared_qty <= 0:
                raise ValueError("Declared quantity must be positive")
            if self.sold_qty and declared_qty < self.sold_qty:
                raise ValueError("Declared quantity cannot be less than sold quantity")
        return declared_qty
    
    __table_args__ = (
    UniqueConstraint('farmer_id', 'product_id', 'shop_id', 'entry_date', name='uq_farmer_stock_daily_product'),
        CheckConstraint('declared_qty IS NULL OR declared_qty > 0', name='chk_declared_qty_positive'),
        CheckConstraint('sold_qty >= 0', name='chk_sold_qty_non_negative'),
        CheckConstraint('unit_price IS NULL OR unit_price > 0', name='chk_unit_price_positive'),
        CheckConstraint(
            "(mode = 'declared' AND declared_qty IS NOT NULL AND declared_by_id IS NOT NULL) OR mode = 'implicit'",
            name='chk_mode_consistency'
        ),
        CheckConstraint(
            "(carry_forward = true AND carried_from_date IS NOT NULL) OR (carry_forward = false AND carried_from_date IS NULL)",
            name='chk_carry_forward_consistency'
        ),
    Index('idx_farmer_stock_lookup', 'farmer_id', 'product_id', 'entry_date'),
        Index('idx_farmer_stock_shop_date', 'shop_id', 'entry_date'),
        Index('idx_farmer_stock_mode', 'mode', 'entry_date'),
        Index('idx_farmer_stock_shop_date_status', 'shop_id', 'entry_date', 'status'),
    Index('idx_farmer_stock_farmer_date', 'farmer_id', 'entry_date'),
    )

        from datetime import datetime
    from sqlalchemy import (
        Column, Integer, ForeignKey, String, Text, DateTime, JSON, Index
    )
    from sqlalchemy.orm import relationship
    from .base import Base
    
    class FarmerStockAudit(Base):
        __tablename__ = "farmer_stock_audit"
        
        id = Column(Integer, primary_key=True)
        farmer_stock_id = Column(Integer, ForeignKey("farmer_stock.id", ondelete="CASCADE"), nullable=False)
        performed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
        
        # Audit Details
        action_type = Column(String(50), nullable=False)  # declare, sale, update, late_declare, carry_forward, correction, mode_change
        old_values = Column(JSON, nullable=True)
        new_values = Column(JSON, nullable=True)
        
        # Context
        transaction_id = Column(Integer, ForeignKey("transaction.id", ondelete="SET NULL"), nullable=True)
        notes = Column(Text, nullable=True)
        
        # System Fields
        timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
        
        # Relationships
        farmer_stock = relationship("FarmerStock", back_populates="audit_logs")
        performed_by = relationship("User")
        transaction = relationship("Transaction")
        
        __table_args__ = (
            Index('idx_farmer_stock_audit_fsid', 'farmer_stock_id'),
            Index('idx_farmer_stock_audit_action', 'action_type'),
            Index('idx_farmer_stock_audit_created_at', 'timestamp'),
        )





                """Add farmer stock tables
        
        Revision ID: xxxx
        Revises: xxxx
        Create Date: 2023-08-30 10:00:00.000000
        
        """
        from alembic import op
        import sqlalchemy as sa
        from sqlalchemy.dialects import postgresql
        
        # revision identifiers, used by Alembic.
        revision = 'xxxx'
        down_revision = 'xxxx'  # Replace with your previous migration
        branch_labels = None
        depends_on = None
        
        
        def upgrade():
            # Create StockMode enum type
            op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_mode') THEN CREATE TYPE stock_mode AS ENUM ('declared', 'implicit'); END IF; END $$;")
            
            # Create StockStatus enum type
            op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_status') THEN CREATE TYPE stock_status AS ENUM ('active', 'inactive', 'archived'); END IF; END $$;")
            
            # Create farmer_stock table
            op.create_table(
                'farmer_stock',
                sa.Column('id', sa.Integer(), nullable=False),
                sa.Column('farmer_id', sa.Integer(), nullable=False),
                sa.Column('product_id', sa.Integer(), nullable=False),
                sa.Column('shop_id', sa.Integer(), nullable=False),
                sa.Column('declared_qty', sa.DECIMAL(precision=10, scale=3), nullable=True),
                sa.Column('sold_qty', sa.DECIMAL(precision=10, scale=3), nullable=False, server_default='0'),
                sa.Column('unit_price', sa.DECIMAL(precision=10, scale=2), nullable=True),
                sa.Column('mode', sa.Enum('declared', 'implicit', name='stock_mode'), nullable=False, server_default='implicit'),
                sa.Column('declared_at', sa.DateTime(), nullable=True),
                sa.Column('declared_by_id', sa.Integer(), nullable=True),
                sa.Column('carry_forward', sa.Boolean(), nullable=False, server_default='false'),
                sa.Column('carried_from_date', sa.Date(), nullable=True),
                sa.Column('entry_date', sa.Date(), nullable=False),
                sa.Column('notes', sa.Text(), nullable=True),
                sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
                sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
                sa.Column('status', sa.Enum('active', 'inactive', 'archived', name='stock_status'), nullable=False, server_default='active'),
                sa.ForeignKeyConstraint(['farmer_id'], ['users.id'], ondelete='CASCADE'),
                sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='RESTRICT'),
                sa.ForeignKeyConstraint(['shop_id'], ['shop.id'], ondelete='CASCADE'),
                sa.ForeignKeyConstraint(['declared_by_id'], ['users.id'], ondelete='SET NULL'),
                sa.PrimaryKeyConstraint('id'),
                sa.UniqueConstraint('farmer_id', 'product_id', 'shop_id', 'entry_date', name='uq_farmer_stock_daily_product'),
                sa.CheckConstraint('declared_qty IS NULL OR declared_qty > 0', name='chk_declared_qty_positive'),
                sa.CheckConstraint('sold_qty >= 0', name='chk_sold_qty_non_negative'),
                sa.CheckConstraint('unit_price IS NULL OR unit_price > 0', name='chk_unit_price_positive'),
                sa.CheckConstraint(
                    "(mode = 'declared' AND declared_qty IS NOT NULL AND declared_by_id IS NOT NULL) OR mode = 'implicit'",
                    name='chk_mode_consistency'
                ),
                sa.CheckConstraint(
                    "(carry_forward = true AND carried_from_date IS NOT NULL) OR (carry_forward = false AND carried_from_date IS NULL)",
                    name='chk_carry_forward_consistency'
                ),
            )
            
            # Create indexes on farmer_stock
            op.create_index('idx_farmer_stock_lookup', 'farmer_stock', ['farmer_id', 'product_id', 'entry_date'], unique=False)
            op.create_index('idx_farmer_stock_shop_date', 'farmer_stock', ['shop_id', 'entry_date'], unique=False)
            op.create_index('idx_farmer_stock_mode', 'farmer_stock', ['mode', 'entry_date'], unique=False)
            op.create_index('idx_farmer_stock_shop_date_status', 'farmer_stock', ['shop_id', 'entry_date', 'status'], unique=False)
            op.create_index('idx_farmer_stock_farmer_date', 'farmer_stock', ['farmer_id', 'entry_date'], unique=False)
            
            # Create farmer_stock_audit table
            op.create_table(
                'farmer_stock_audit',
                sa.Column('id', sa.Integer(), nullable=False),
                sa.Column('farmer_stock_id', sa.Integer(), nullable=False),
                sa.Column('performed_by_id', sa.Integer(), nullable=True),
                sa.Column('action_type', sa.String(50), nullable=False),
                sa.Column('old_values', postgresql.JSON(astext_type=sa.Text()), nullable=True),
                sa.Column('new_values', postgresql.JSON(astext_type=sa.Text()), nullable=True),
                sa.Column('transaction_id', sa.Integer(), nullable=True),
                sa.Column('notes', sa.Text(), nullable=True),
                sa.Column('timestamp', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
                sa.ForeignKeyConstraint(['farmer_stock_id'], ['farmer_stock.id'], ondelete='CASCADE'),
                sa.ForeignKeyConstraint(['performed_by_id'], ['users.id'], ondelete='SET NULL'),
                sa.ForeignKeyConstraint(['transaction_id'], ['transaction.id'], ondelete='SET NULL'),
                sa.PrimaryKeyConstraint('id')
            )
            
            # Create indexes on farmer_stock_audit
            op.create_index('idx_farmer_stock_audit_fsid', 'farmer_stock_audit', ['farmer_stock_id'], unique=False)
            op.create_index('idx_farmer_stock_audit_action', 'farmer_stock_audit', ['action_type'], unique=False)
            op.create_index('idx_farmer_stock_audit_created_at', 'farmer_stock_audit', ['timestamp'], unique=False)
        
        
        def downgrade():
            # Drop tables
            op.drop_table('farmer_stock_audit')
            op.drop_table('farmer_stock')
            
            # Drop enum types
            op.execute("DROP TYPE IF EXISTS stock_status;")
            op.execute("DROP TYPE IF EXISTS stock_mode;")


init.py

                        # Add these imports to your existing imports
            from .farmer_stock import FarmerStock, StockMode, StockStatus
            from .farmer_stock_audit import FarmerStockAudit
            
            # Add these to your __all__ list
            __all__ = [
                # ... existing exports
                'FarmerStock', 'FarmerStockAudit', 'StockMode', 'StockStatus',
            ]



            Audit Service Helper


                        from datetime import datetime
            import json
            from sqlalchemy.orm import Session
            from ..models import FarmerStock, FarmerStockAudit
            from ..schemas import FarmerStockCreate, FarmerStockUpdate, FarmerStockLateDeclaration, FarmerStockDeduction
            
            class FarmerStockService:
                @staticmethod
                def create_audit_log(
                    db: Session, 
                    stock: FarmerStock, 
                    action_type: str, 
                    old_values: dict = None, 
                    new_values: dict = None, 
                    performed_by_id: int = None,
                    transaction_id: int = None,
                    notes: str = None
                ):
                    """Create an audit log entry for farmer stock changes."""
                    audit_entry = FarmerStockAudit(
                        farmer_stock_id=stock.id,
                        performed_by_id=performed_by_id,
                        action_type=action_type,
                        old_values=old_values,
                        new_values=new_values,
                        transaction_id=transaction_id,
                        notes=notes,
                        timestamp=datetime.utcnow()
                    )
                    db.add(audit_entry)
                    db.flush()  # Flush to get the ID but don't commit yet
                    return audit_entry
            
                @staticmethod
                def declare_stock(db: Session, stock_data: FarmerStockCreate, performed_by_id: int):
                    """Create a new declared stock entry."""
                    # Create stock entry with declared mode
                    stock = FarmerStock(
                        farmer_user_id=stock_data.farmer_user_id,
                        product_id=stock_data.product_id,
                        shop_id=stock_data.shop_id,
                        declared_qty=stock_data.declared_qty,
                        unit_price=stock_data.unit_price,
                        mode="declared",
                        declared_at=datetime.utcnow(),
                        declared_by_id=performed_by_id,
                        entry_date=stock_data.entry_date or datetime.utcnow().date(),
                        notes=stock_data.notes,
                    )
                    db.add(stock)
                    db.flush()
                    
                    # Create audit entry
                    FarmerStockService.create_audit_log(
                        db=db,
                        stock=stock,
                        action_type="declare",
                        new_values={
                            "declared_qty": float(stock.declared_qty) if stock.declared_qty else None,
                            "unit_price": float(stock.unit_price) if stock.unit_price else None,
                            "mode": stock.mode.value
                        },
                        performed_by_id=performed_by_id
                    )
                    
                    db.commit()
                    return stock
                    
                @staticmethod
                def create_implicit_stock(db: Session, farmer_id: int, product_id: int, shop_id: int, entry_date: datetime.date = None):
                    """Create a new implicit stock entry."""
                    entry_date = entry_date or datetime.utcnow().date()
                    
                    # Check if stock already exists
                    existing_stock = db.query(FarmerStock).filter(
                        FarmerStock.farmer_id == farmer_id,
                        FarmerStock.product_id == product_id,
                        FarmerStock.shop_id == shop_id,
                        FarmerStock.entry_date == entry_date,
                        FarmerStock.status == "active"
                    ).first()
                    
                    if existing_stock:
                        return existing_stock
                    
                    # Create implicit stock
                    stock = FarmerStock(
                        farmer_id=farmer_id,
                        product_id=product_id,
                        shop_id=shop_id,
                        mode="implicit",
                        sold_qty=0,
                        entry_date=entry_date,
                    )
                    db.add(stock)
                    db.flush()
                    
                    # Create audit entry
                    FarmerStockService.create_audit_log(
                        db=db,
                        stock=stock,
                        action_type="create_implicit",
                        new_values={"mode": "implicit", "sold_qty": 0},
                        performed_by_id=None
                    )
                    
                    db.commit()
                    return stock
                
                @staticmethod
                def late_declare(db: Session, stock_id: int, declaration_data: FarmerStockLateDeclaration, performed_by_id: int):
                    """Convert implicit stock to declared stock with late declaration."""
                    stock = db.query(FarmerStock).filter(FarmerStock.id == stock_id).first()
                    if not stock:
                        raise ValueError(f"Stock with ID {stock_id} not found")
                        
                    if stock.mode.value == "declared":
                        raise ValueError("Stock is already in declared mode")
                        
                    if declaration_data.declared_qty < stock.sold_qty:
                        raise ValueError("Declared quantity cannot be less than sold quantity")
                    
                    old_values = {
                        "mode": stock.mode.value,
                        "declared_qty": None,
                        "unit_price": float(stock.unit_price) if stock.unit_price else None
                    }
                    
                    # Update stock to declared mode
                    stock.declared_qty = declaration_data.declared_qty
                    stock.unit_price = declaration_data.unit_price
                    stock.mode = "declared"
                    stock.declared_at = datetime.utcnow()
                    stock.declared_by_id = performed_by_id
                    stock.notes = stock.notes + "\n" + declaration_data.notes if stock.notes else declaration_data.notes
                    
                    new_values = {
                        "mode": "declared",
                        "declared_qty": float(stock.declared_qty),
                        "unit_price": float(stock.unit_price) if stock.unit_price else None,
                        "declared_at": stock.declared_at.isoformat(),
                        "declared_by_id": stock.declared_by_id
                    }
                    
                    # Create audit entry
                    FarmerStockService.create_audit_log(
                        db=db,
                        stock=stock,
                        action_type="late_declare",
                        old_values=old_values,
                        new_values=new_values,
                        performed_by_id=performed_by_id,
                        notes=declaration_data.notes
                    )
                    
                    db.commit()
                    return stock
                
                @staticmethod
                def deduct_stock(db: Session, stock_id: int, deduction_data: FarmerStockDeduction, performed_by_id: int, transaction_id: int = None):
                    """Deduct stock for sale."""
                    stock = db.query(FarmerStock).filter(FarmerStock.id == stock_id).first()
                    if not stock:
                        raise ValueError(f"Stock with ID {stock_id} not found")
                        
                    if deduction_data.quantity <= 0:
                        raise ValueError("Deduction quantity must be positive")
                        
                    old_values = {
                        "sold_qty": float(stock.sold_qty),
                    }
                    
                    # Update sold quantity
                    stock.sold_qty = stock.sold_qty + deduction_data.quantity
                    
                    new_values = {
                        "sold_qty": float(stock.sold_qty),
                    }
                    
                    # Check if oversold and add warning
                    notes = deduction_data.notes
                    if stock.mode.value == "declared" and stock.sold_qty > stock.declared_qty:
                        oversold_qty = stock.sold_qty - stock.declared_qty
                        warning = f"WARNING: Stock is now oversold by {oversold_qty} units."
                        notes = warning if not notes else f"{notes}\n{warning}"
                    
                    # Create audit entry
                    FarmerStockService.create_audit_log(
                        db=db,
                        stock=stock,
                        action_type="sale",
                        old_values=old_values,
                        new_values=new_values,
                        performed_by_id=performed_by_id,
                        transaction_id=transaction_id,
                        notes=notes
                    )
                    
                    db.commit()
                    return stock
                

                                # Add to your existing transaction item service
                from ..services.farmer_stock_service import FarmerStockService
                
                # Inside your create_transaction_item method:
                def create_transaction_item(db: Session, item_data: dict, transaction_id: int, performed_by_id: int):
                    # ... existing transaction item creation code ...
                    
                    # Get or create farmer stock
                    farmer_stock = db.query(FarmerStock).filter(
                        FarmerStock.farmer_id == item_data.farmer_id,
                        FarmerStock.product_id == item_data.product_id,
                        FarmerStock.shop_id == item_data.shop_id,
                        FarmerStock.entry_date == datetime.utcnow().date(),
                        FarmerStock.status == "active"
                    ).first()
                    
                    if not farmer_stock:
                        farmer_stock = FarmerStockService.create_implicit_stock(
                            db=db,
                            farmer_id=item_data.farmer_id,
                            product_id=item_data.product_id,
                            shop_id=item_data.shop_id
                        )
                    
                    # Update farmer stock sold quantity
                    deduction_data = FarmerStockDeduction(
                        quantity=item_data.quantity,
                        notes=f"Sale via Transaction ID: {transaction_id}"
                    )
                    
                    # Link transaction item to farmer stock
                    transaction_item.farmer_stock_id = farmer_stock.id
                    
                    # Deduct stock
                    FarmerStockService.deduct_stock(
                        db=db,
                        stock_id=farmer_stock.id,
                        deduction_data=deduction_data,
                        performed_by_id=performed_by_id,
                        transaction_id=transaction_id
                    )
                    
                    # ... rest of your transaction item creation code ...



                                        from datetime import date, datetime
                    from decimal import Decimal
                    from enum import Enum
                    from typing import Optional, List
                    from pydantic import BaseModel, Field, validator
                    
                    class StockModeEnum(str, Enum):
                        declared = "declared"
                        implicit = "implicit"
                    
                    class StockStatusEnum(str, Enum):
                        active = "active"
                        inactive = "inactive"
                        archived = "archived"
                    
                    class FarmerStockBase(BaseModel):
                        farmer_id: int
                        product_id: int
                        shop_id: int
                        entry_date: Optional[date] = None
                        notes: Optional[str] = None
                    
                    class FarmerStockCreate(FarmerStockBase):
                        declared_qty: Decimal
                        unit_price: Optional[Decimal] = None
                    
                    class FarmerStockLateDeclaration(BaseModel):
                        farmer_id: int
                        product_id: int
                        shop_id: int
                        entry_date: date
                        declared_qty: Decimal
                        unit_price: Optional[Decimal] = None
                        notes: Optional[str] = None
                    
                    class FarmerStockDeduction(BaseModel):
                        quantity: Decimal
                        notes: Optional[str] = None
                    
                    class FarmerStockCarryForward(BaseModel):
                        target_date: date
                        notes: Optional[str] = None
                    
                    class FarmerStockUpdate(BaseModel):
                        declared_qty: Optional[Decimal] = None
                        unit_price: Optional[Decimal] = None
                        notes: Optional[str] = None
                    
                    class FarmerStockOut(BaseModel):
                        id: int
                        farmer_id: int
                        product_id: int
                        shop_id: int
                        declared_qty: Optional[Decimal] = None
                        sold_qty: Decimal
                        unit_price: Optional[Decimal] = None
                        mode: StockModeEnum
                        declared_at: Optional[datetime] = None
                        declared_by_id: Optional[int] = None
                        carry_forward: bool
                        carried_from_date: Optional[date] = None
                        entry_date: date
                        notes: Optional[str] = None
                        balance_qty: Optional[Decimal] = None
                        sold_value: Optional[Decimal] = None
                        is_oversold: bool
                        completion_percentage: Optional[float] = None
                        status: StockStatusEnum
                        created_at: datetime
                        updated_at: datetime
                    
                        class Config:
                            orm_mode = True
                    
                    class FarmerStockAuditOut(BaseModel):
                        id: int
                        farmer_stock_id: int
                        performed_by_id: Optional[int] = None
                        action_type: str
                        old_values: Optional[dict] = None
                        new_values: Optional[dict] = None
                        transaction_id: Optional[int] = None
                        notes: Optional[str] = None
                        timestamp: datetime
                    
                        class Config:
                            orm_mode = True


                            3. Additional Database Recommendations

                            CREATE OR REPLACE FUNCTION farmer_stock_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO farmer_stock_audit(farmer_stock_id, action_type, new_values, timestamp)
        VALUES(NEW.id, 'db_insert', row_to_json(NEW), NOW());
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO farmer_stock_audit(farmer_stock_id, action_type, old_values, new_values, timestamp)
        VALUES(NEW.id, 'db_update', row_to_json(OLD), row_to_json(NEW), NOW());
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO farmer_stock_audit(farmer_stock_id, action_type, old_values, timestamp)
        VALUES(OLD.id, 'db_delete', row_to_json(OLD), NOW());
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER farmer_stock_audit_insert_update
AFTER INSERT OR UPDATE ON farmer_stock
FOR EACH ROW EXECUTE FUNCTION farmer_stock_audit_trigger();

CREATE TRIGGER farmer_stock_audit_delete
AFTER DELETE ON farmer_stock
FOR EACH ROW EXECUTE FUNCTION farmer_stock_audit_trigger();


-- Example partitioning by month
CREATE TABLE farmer_stock_partitioned (
    LIKE farmer_stock INCLUDING ALL
) PARTITION BY RANGE (entry_date);

-- Create partitions for each month
CREATE TABLE farmer_stock_y2023m08 PARTITION OF farmer_stock_partitioned
FOR VALUES FROM ('2023-08-01') TO ('2023-09-01');


