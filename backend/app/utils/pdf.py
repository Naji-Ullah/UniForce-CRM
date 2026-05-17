"""Backend PDF rendering with ReportLab.

A single, small helper that turns a title + metadata + tabular sections into a
clean, branded A4 document returned as bytes (streamed straight to the client,
never written to disk).
"""
from datetime import datetime, timezone
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

_INK = colors.HexColor("#0F172A")
_MUTED = colors.HexColor("#64748B")
_LINE = colors.HexColor("#E2E8F0")
_HEAD = colors.HexColor("#F1F5F9")


def _styles():
    ss = getSampleStyleSheet()
    ss.add(ParagraphStyle("Brand", parent=ss["Title"], fontSize=20, textColor=_INK, spaceAfter=2))
    ss.add(ParagraphStyle("Sub", parent=ss["Normal"], fontSize=10, textColor=_MUTED))
    ss.add(ParagraphStyle("H2", parent=ss["Heading2"], fontSize=13, textColor=_INK, spaceBefore=14))
    return ss


def build_pdf(
    *,
    organization_name: str,
    title: str,
    meta: dict[str, str],
    sections: list[tuple[str, list[str], list[list]]],
) -> bytes:
    """`sections` = list of (heading, column_headers, rows)."""
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=20 * mm, bottomMargin=18 * mm,
        leftMargin=18 * mm, rightMargin=18 * mm,
        title=title,
    )
    ss = _styles()
    story = [
        Paragraph(organization_name, ss["Brand"]),
        Paragraph(title, ss["Sub"]),
        Spacer(1, 6 * mm),
    ]

    meta = {**meta, "Generated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}
    meta_rows = [[Paragraph(f"<b>{k}</b>", ss["Sub"]), Paragraph(str(v), ss["Sub"])] for k, v in meta.items()]
    mt = Table(meta_rows, colWidths=[40 * mm, 130 * mm])
    mt.setStyle(TableStyle([("BOTTOMPADDING", (0, 0), (-1, -1), 3), ("TOPPADDING", (0, 0), (-1, -1), 3)]))
    story += [mt, Spacer(1, 4 * mm)]

    for heading, headers, rows in sections:
        story.append(Paragraph(heading, ss["H2"]))
        data = [headers] + (rows or [["—"] * len(headers)])
        tbl = Table(data, repeatRows=1, hAlign="LEFT")
        tbl.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), _HEAD),
                    ("TEXTCOLOR", (0, 0), (-1, 0), _INK),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("GRID", (0, 0), (-1, -1), 0.4, _LINE),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAFAFA")]),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story += [Spacer(1, 2 * mm), tbl]

    story += [
        Spacer(1, 12 * mm),
        Paragraph("Shizuka University CRM — confidential academic record", ss["Sub"]),
    ]
    doc.build(story)
    return buf.getvalue()
