from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict
from datetime import date, datetime
from decimal import Decimal

from app.database.database import get_db
from app.services.financial import (
    calculate_monthly_net_profit,
    calculate_partner_distributions,
    get_inventory_report,
    get_monthly_retirement_report,
    get_systems_integration_report,
    get_dashboard_overview,
)

router = APIRouter()

@router.get("/profit-loss")
def get_profit_loss_report(
    month: int,
    year: int,
    db: Session = Depends(get_db)
):
    """
    Generate profit and loss report for a specific month
    """
    try:
        report = calculate_monthly_net_profit(db, month, year)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


@router.get("/partner-distributions")
def get_partner_distribution_report(
    month: int,
    year: int,
    reserve_percentage: Decimal = Decimal('30.00'),
    db: Session = Depends(get_db)
):
    """
    Generate partner distribution report for a specific month
    """
    try:
        report = calculate_partner_distributions(db, month, year, reserve_percentage)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


@router.get("/inventory")
def get_inventory_report_endpoint(
    db: Session = Depends(get_db)
):
    """
    Generate inventory report
    """
    try:
        report = get_inventory_report(db)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


@router.get("/balance-sheet")
def get_balance_sheet_report(
    db: Session = Depends(get_db)
):
    """
    Generate balance sheet report (simplified)
    """
    try:
        # This is a simplified version - in a real implementation, you would calculate
        # assets, liabilities, and equity based on actual financial data
        return {
            "report_date": datetime.now().date(),
            "assets": {
                "cash": 0,
                "accounts_receivable": 0,
                "inventory": 0,
                "total_assets": 0
            },
            "liabilities": {
                "accounts_payable": 0,
                "loans": 0,
                "total_liabilities": 0
            },
            "equity": {
                "retained_earnings": 0,
                "partner_equity": 0,
                "total_equity": 0
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


@router.get("/monthly-retirement")
def get_monthly_retirement_report_endpoint(
    month: int,
    year: int,
    retirement_rate: float = 5.0,
    db: Session = Depends(get_db)
):
    """
    Generate monthly retirement report with partner retirement contributions
    """
    try:
        report = get_monthly_retirement_report(db, month, year, retirement_rate)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating retirement report: {str(e)}")


@router.get("/systems-integration")
def get_systems_integration_report_endpoint(
    system_filter: str = "all",
    date_range: str = "7days",
    db: Session = Depends(get_db)
):
    """
    Generate systems integration report with data flow analysis
    """
    try:
        report = get_systems_integration_report(db, system_filter, date_range)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating systems integration report: {str(e)}")


@router.get("/dashboard-overview")
def get_dashboard_overview_endpoint(
    db: Session = Depends(get_db)
):
    """
    Provide aggregated metrics for the main dashboard.
    """
    try:
        return get_dashboard_overview(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating dashboard overview: {str(e)}")
