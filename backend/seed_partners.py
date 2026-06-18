#!/usr/bin/env python3
"""Script to seed the database with test partners."""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database.database import engine
from app.models.partners import Partner

def create_test_partners():
    """Create test partners in the database."""
    with Session(engine) as db:
        # Check if we already have partners
        existing_count = db.query(Partner).count()
        if existing_count > 0:
            print(f"Database already has {existing_count} partners. Skipping seed.")
            return

        test_partners = [
            {
                "name": "أحمد محمد السالم",
                "national_id": "1234567890",
                "phone": "+966501234567",
                "email": "ahmed.salem@example.com",
                "is_active": True
            },
            {
                "name": "فاطمة علي الزهراني",
                "national_id": "2345678901",
                "phone": "+966502345678",
                "email": "fatima.zahrani@example.com",
                "is_active": True
            },
            {
                "name": "خالد عبدالله المطيري",
                "national_id": "3456789012",
                "phone": "+966503456789",
                "email": "khalid.muttairi@example.com",
                "is_active": False
            },
            {
                "name": "نورا سعد القحطاني",
                "national_id": "4567890123",
                "phone": "+966504567890",
                "email": "nora.qahtani@example.com",
                "is_active": True
            },
            {
                "name": "محمد عبدالعزيز الشمري",
                "national_id": "5678901234",
                "phone": "+966505678901",
                "email": "mohammed.shamri@example.com",
                "is_active": True
            }
        ]

        created_partners = []
        for partner_data in test_partners:
            partner = Partner(**partner_data)
            db.add(partner)
            created_partners.append(partner_data["name"])

        try:
            db.commit()
            print(f"Successfully created {len(created_partners)} test partners:")
            for name in created_partners:
                print(f"  - {name}")
        except Exception as e:
            db.rollback()
            print(f"Error creating test partners: {e}")
            return

if __name__ == "__main__":
    create_test_partners()