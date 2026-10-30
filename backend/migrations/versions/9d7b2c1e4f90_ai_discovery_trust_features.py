"""Add AI discovery, saved searches and owner verification.

Revision ID: 9d7b2c1e4f90
Revises: f78c0c7a44bc
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "9d7b2c1e4f90"
down_revision: Union[str, Sequence[str], None] = "f78c0c7a44bc"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("users", sa.Column("owner_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("verified_by", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key(
        "fk_users_verified_by_users", "users", "users",
        ["verified_by"], ["id"], ondelete="SET NULL"
    )
    op.create_table(
        "saved_searches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("listing_type", sa.String(length=20), nullable=False),
        sa.Column("query_text", sa.Text(), nullable=True),
        sa.Column("filters_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.CheckConstraint(
            "listing_type IN ('property', 'food', 'marketplace')",
            name="ck_saved_search_listing_type",
        ),
    )
    op.create_index("ix_saved_searches_user_id", "saved_searches", ["user_id"])
    op.create_table(
        "ai_search_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("query_text", sa.Text(), nullable=False),
        sa.Column("listing_type", sa.String(length=20), nullable=False),
        sa.Column("criteria_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.CheckConstraint(
            "listing_type IN ('property', 'food', 'marketplace')",
            name="ck_ai_search_listing_type",
        ),
    )
    op.create_index("ix_ai_search_events_user_id", "ai_search_events", ["user_id"])

def downgrade() -> None:
    op.drop_index("ix_ai_search_events_user_id", table_name="ai_search_events")
    op.drop_table("ai_search_events")
    op.drop_index("ix_saved_searches_user_id", table_name="saved_searches")
    op.drop_table("saved_searches")
    op.drop_constraint("fk_users_verified_by_users", "users", type_="foreignkey")
    op.drop_column("users", "verified_at")
    op.drop_column("users", "verified_by")
    op.drop_column("users", "owner_verified")
