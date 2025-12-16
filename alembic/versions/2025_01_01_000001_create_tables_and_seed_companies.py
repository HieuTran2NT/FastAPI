
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '000001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'companies',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('mode', sa.String(length=50), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=True),
    )

    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True),
        sa.Column('username', sa.String(length=50), nullable=False, unique=True),
        sa.Column('first_name', sa.String(length=100), nullable=True),
        sa.Column('last_name', sa.String(length=100), nullable=True),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('is_admin', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('company_id', sa.Integer(), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
    )

    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('summary', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('todo','in_progress','done', name='taskstatus'), nullable=False, server_default='todo'),
        sa.Column('priority', sa.Enum('low','medium','high', name='taskpriority'), nullable=False, server_default='medium'),
        sa.Column('company_id', sa.Integer(), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('owner_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
    )

    # Seed companies
    op.execute('''
        INSERT INTO companies (id, name, description, mode, rating) VALUES
        (1, 'Contoso', 'Demo company Contoso', 'standard', 5),
        (2, 'Fabrikam', 'Demo company Fabrikam', 'standard', 4);
    ''')


def downgrade():
    op.execute("DROP TYPE IF EXISTS taskstatus CASCADE;")
    op.execute("DROP TYPE IF EXISTS taskpriority CASCADE;")
    op.drop_table('tasks')
    op.drop_table('users')
    op.drop_table('companies')
