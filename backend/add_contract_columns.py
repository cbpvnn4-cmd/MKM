from app.database.database import engine
from sqlalchemy import text

# List of columns to add to contracts table
columns_to_add = [
    "seller_company_name VARCHAR",
    "seller_address TEXT",
    "seller_phone VARCHAR",
    "seller_email VARCHAR",
    "seller_authorized_person VARCHAR",
    "buyer_name VARCHAR",
    "buyer_address TEXT",
    "buyer_phone VARCHAR",
    "buyer_email VARCHAR",
    "buyer_representative VARCHAR",
    "project_name VARCHAR",
    "project_location TEXT",
    "building_type VARCHAR",
    "num_floors INTEGER",
    "usage_type VARCHAR",
    "warranty_period VARCHAR",
    "seller_obligations TEXT",
    "buyer_obligations TEXT",
    "general_terms TEXT",
    "total_amount_text VARCHAR",
    "price_includes TEXT"
]

with engine.connect() as conn:
    for column_def in columns_to_add:
        try:
            sql = f"ALTER TABLE contracts ADD COLUMN {column_def}"
            conn.execute(text(sql))
            print(f"Added column: {column_def.split()[0]}")
        except Exception as e:
            print(f"Column {column_def.split()[0]} already exists or error: {e}")
    
    conn.commit()

print("\nAll contract columns added successfully!")
