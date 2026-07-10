import json
from typing import List, Optional
from pydantic import BaseModel, Field
from google import genai


class CleanOrder(BaseModel):
    order_date: Optional[str] = Field(default=None, description="YYYY-MM-DD or null")
    order_placed_by: Optional[str] = None
    po_number: Optional[str] = None
    vendor: Optional[str] = None
    category: Optional[str] = None
    catalog_no: Optional[str] = None
    item_name: str
    units_ordered: Optional[int] = None
    price_per_unit: Optional[float] = None
    total_price: Optional[float] = None
    final_price: Optional[float] = None
    availability: Optional[str] = None
    expected_delivery_date: Optional[str] = Field(default=None, description="YYYY-MM-DD or null")
    order_number: Optional[str] = None
    delivery_date: Optional[str] = Field(default=None, description="YYYY-MM-DD or null")
    status: str = "Ordered"
    received_by: Optional[str] = None
    date_paid: Optional[str] = Field(default=None, description="YYYY-MM-DD or null")
    amount_paid: Optional[float] = None
    cc_invoice: Optional[str] = None


class SkippedRow(BaseModel):
    row_number: int
    reason: str


class CleanImportResult(BaseModel):
    orders: List[CleanOrder]
    skipped_rows: List[SkippedRow]


def clean_orders_with_gemini(rows: list[dict]) -> CleanImportResult:
    client = genai.Client()

    prompt = f"""
You are cleaning a messy lab inventory order spreadsheet.

Return only valid JSON matching the schema.

Rules:
- Extract real product orders only.
- Skip services, software, subscriptions, Microsoft, monthly/annual charges, summaries, totals, blank rows, and month-only rows.
- If one logical order is spread across nearby cells, combine it into one order.
- Do not invent missing values.
- Dates must be YYYY-MM-DD or null.
- catalog_no should preserve letters/dashes exactly.
- item_name is required. If no item_name, skip the row.
- status should default to "Ordered" unless row clearly says Delivered/Received/Paid.
- If final price includes tax/freight, put it in final_price.
- If only total price exists, use total_price and leave final_price null unless clearly final.

Rows:
{json.dumps(rows, default=str)}
"""

    interaction = client.interactions.create(
        model="gemini-3.5-flash",
        input=prompt,
        response_format={
            "type": "text",
            "mime_type": "application/json",
            "schema": CleanImportResult.model_json_schema(),
        },
    )

    return CleanImportResult.model_validate_json(interaction.output_text)