#!/usr/bin/env python3
"""Diagnóstico de integridade entre funis e ofertas."""

from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FUNNELS_CSV = ROOT / "supabase" / "funnels_utf8.csv"
OFFERS_CSV = ROOT / "supabase" / "offer_mappings_full_fixed.csv"


def normalize(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def main() -> None:
    funnels = read_csv(FUNNELS_CSV)
    offers = read_csv(OFFERS_CSV)

    funnel_ids = {row["id"] for row in funnels}

    invalid_funnel_rows = [row for row in offers if row.get("funnel_id") and row["funnel_id"] not in funnel_ids]
    missing_funnel_rows = [row for row in offers if not row.get("funnel_id")]
    missing_project_rows = [row for row in offers if not row.get("project_id")]
    missing_product_rows = [row for row in offers if not row.get("nome_produto")]
    missing_offer_rows = [row for row in offers if not row.get("nome_oferta")]

    offers_by_funnel = Counter(row["funnel_id"] for row in offers if row.get("funnel_id"))
    funnels_without_offers = [row for row in funnels if row["id"] not in offers_by_funnel]

    duplicate_groups: dict[tuple[str, str, str, str], list[dict[str, str]]] = defaultdict(list)
    for row in offers:
        key = (
            normalize(row.get("project_id")),
            normalize(row.get("funnel_id")),
            normalize(row.get("nome_produto")),
            normalize(row.get("nome_oferta")),
        )
        duplicate_groups[key].append(row)

    duplicate_groups = {key: rows for key, rows in duplicate_groups.items() if len(rows) > 1}

    generic_offer_names = {
        "auto-importado",
        "auto-importado de vendas existentes",
        "importado das vendas",
    }
    generic_offers = [row for row in offers if normalize(row.get("nome_oferta")) in generic_offer_names]

    remediation = {
        "check_invalid_funnel_sql": (
            "SELECT om.project_id, om.funnel_id, COUNT(*) "
            "FROM public.offer_mappings om "
            "LEFT JOIN public.funnels f ON f.id = om.funnel_id "
            "WHERE om.funnel_id IS NOT NULL AND f.id IS NULL "
            "GROUP BY om.project_id, om.funnel_id ORDER BY COUNT(*) DESC;"
        ),
        "backfill_by_legacy_name_sql": (
            "UPDATE public.offer_mappings om "
            "SET funnel_id = f.id, updated_at = now() "
            "FROM public.funnels f "
            "WHERE om.project_id = f.project_id "
            "AND om.funnel_id IS NULL "
            "AND om.id_funil IS NOT NULL "
            "AND btrim(lower(om.id_funil)) = btrim(lower(f.name));"
        ),
        "reassign_invalid_funnel_sql_template": (
            "UPDATE public.offer_mappings om "
            "SET funnel_id = :target_funnel_id::uuid, updated_at = now() "
            "WHERE om.project_id = :project_id::uuid "
            "AND (om.funnel_id IS NULL OR NOT EXISTS ("
            "SELECT 1 FROM public.funnels f WHERE f.id = om.funnel_id));"
        ),
    }

    report = {
        "totals": {"funnels": len(funnels), "offers": len(offers)},
        "integrity": {
            "offers_missing_funnel_id": len(missing_funnel_rows),
            "offers_with_invalid_funnel_id": len(invalid_funnel_rows),
            "offers_missing_project_id": len(missing_project_rows),
            "offers_missing_nome_produto": len(missing_product_rows),
            "offers_missing_nome_oferta": len(missing_offer_rows),
            "funnels_without_offers": len(funnels_without_offers),
        },
        "duplicates": {
            "groups": len(duplicate_groups),
            "extra_rows": sum(len(rows) - 1 for rows in duplicate_groups.values()),
        },
        "semantics": {
            "generic_offer_names": len(generic_offers),
            "by_origem": Counter(row.get("origem") or "(vazio)" for row in offers),
        },
        "samples": {
            "invalid_funnel_ids": Counter(row["funnel_id"] for row in invalid_funnel_rows),
            "funnels_without_offers": [
                {"id": row["id"], "name": row.get("name", "")} for row in funnels_without_offers[:10]
            ],
            "top_duplicate_groups": [
                {
                    "count": len(rows),
                    "project_id": rows[0].get("project_id", ""),
                    "funnel_id": rows[0].get("funnel_id", ""),
                    "nome_produto": rows[0].get("nome_produto", ""),
                    "nome_oferta": rows[0].get("nome_oferta", ""),
                }
                for rows in sorted(duplicate_groups.values(), key=len, reverse=True)[:10]
            ],
        },
        "remediation": remediation,
    }

    print(json.dumps(report, ensure_ascii=False, indent=2, default=lambda value: dict(value)))


if __name__ == "__main__":
    main()
