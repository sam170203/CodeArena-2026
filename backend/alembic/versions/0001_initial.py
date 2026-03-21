from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=120), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
        sa.UniqueConstraint("email")
    )
    op.create_table(
        "duels",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("initiator_id", sa.String(length=36), nullable=True),
        sa.Column("opponent_id", sa.String(length=36), nullable=True),
        sa.Column("problem_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("winner_id", sa.String(length=36), nullable=True),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_table(
        "submissions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("duel_id", sa.String(length=36), nullable=True),
        sa.Column("room_id", sa.String(length=36), nullable=True),
        sa.Column("problem_id", sa.String(length=36), nullable=False),
        sa.Column("language", sa.String(length=16), nullable=True),
        sa.Column("code", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=True),
        sa.Column("stdout", sa.Text(), nullable=True),
        sa.Column("stderr", sa.Text(), nullable=True),
        sa.Column("runtime_ms", sa.Integer(), nullable=True),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_table(
        "rooms",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("host_id", sa.String(length=36), nullable=True),
        sa.Column("problem_id", sa.String(length=36), nullable=True),
        sa.Column("title", sa.String(length=100), nullable=True),
        sa.Column("max_participants", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("room_id", sa.String(length=36), nullable=True),
        sa.Column("duel_id", sa.String(length=36), nullable=True),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id")
    )


def downgrade():
    op.drop_table("chat_messages")
    op.drop_table("rooms")
    op.drop_table("submissions")
    op.drop_table("duels")
    op.drop_table("users")
