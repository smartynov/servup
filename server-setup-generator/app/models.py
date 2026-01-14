"""
Database models for server setup generator.
Uses SQLAlchemy with SQLite backend.
"""
import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
import json

Base = declarative_base()

# Association tables for many-to-many relationships
configuration_modules = Table(
    'configuration_modules',
    Base.metadata,
    Column('configuration_id', Integer, ForeignKey('configurations.id', ondelete='CASCADE')),
    Column('module_id', Integer, ForeignKey('modules.id', ondelete='CASCADE'))
)

configuration_users = Table(
    'configuration_users',
    Base.metadata,
    Column('configuration_id', Integer, ForeignKey('configurations.id', ondelete='CASCADE')),
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'))
)


class User(Base):
    """User model - represents a user to be created on the server"""
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    username = Column(String(64), nullable=False)
    groups = Column(String(256), default='')  # Comma-separated groups
    ssh_keys = Column(Text, default='')  # Multiple SSH keys, newline-separated
    created_at = Column(DateTime, default=datetime.utcnow)

    # Many-to-many relationship with configurations
    configurations = relationship(
        'Configuration',
        secondary=configuration_users,
        back_populates='users'
    )

    def to_dict(self):
        """Convert user to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'groups': self.groups,
            'ssh_keys': self.ssh_keys,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    @property
    def groups_list(self):
        """Get groups as list"""
        return [g.strip() for g in self.groups.split(',') if g.strip()]

    @property
    def ssh_keys_list(self):
        """Get SSH keys as list"""
        return [k.strip() for k in self.ssh_keys.split('\n') if k.strip()]


class Module(Base):
    """Module model - represents an action/module that can be executed"""
    __tablename__ = 'modules'

    id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False, unique=True)
    description = Column(Text, default='')
    bash_code = Column(Text, nullable=False)
    priority = Column(Integer, default=100)  # Lower = executes first
    enabled = Column(Boolean, default=True)
    dependencies = Column(String(512), default='')  # Comma-separated module names
    requires_input = Column(Boolean, default=False)  # Does this module need user input?
    input_label = Column(String(128), default='')  # Label for input field
    input_default = Column(String(256), default='')  # Default value for input
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Many-to-many relationship with configurations
    configurations = relationship(
        'Configuration',
        secondary=configuration_modules,
        back_populates='modules'
    )

    def to_dict(self):
        """Convert module to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'bash_code': self.bash_code,
            'priority': self.priority,
            'enabled': self.enabled,
            'dependencies': self.dependencies,
            'requires_input': self.requires_input,
            'input_label': self.input_label,
            'input_default': self.input_default,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    @property
    def dependencies_list(self):
        """Get dependencies as list"""
        return [d.strip() for d in self.dependencies.split(',') if d.strip()]


class Configuration(Base):
    """Configuration model - represents a saved configuration/generation"""
    __tablename__ = 'configurations'

    id = Column(Integer, primary_key=True)
    name = Column(String(128), default='')
    hash = Column(String(64), unique=True, nullable=False)  # Unique hash for URL
    hostname = Column(String(128), default='')
    timezone = Column(String(64), default='UTC')
    script_content = Column(Text, nullable=False)
    module_inputs = Column(Text, default='{}')  # JSON: {module_id: input_value}
    created_at = Column(DateTime, default=datetime.utcnow)

    # Many-to-many relationships
    users = relationship(
        'User',
        secondary=configuration_users,
        back_populates='configurations'
    )
    modules = relationship(
        'Module',
        secondary=configuration_modules,
        back_populates='configurations'
    )

    def to_dict(self, include_script=False):
        """Convert configuration to dictionary"""
        result = {
            'id': self.id,
            'name': self.name,
            'hash': self.hash,
            'hostname': self.hostname,
            'timezone': self.timezone,
            'module_inputs': json.loads(self.module_inputs) if self.module_inputs else {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'users': [u.to_dict() for u in self.users],
            'modules': [m.to_dict() for m in self.modules]
        }
        if include_script:
            result['script_content'] = self.script_content
        return result


class Database:
    """Database manager class"""

    def __init__(self, db_url=None):
        """Initialize database connection"""
        if db_url is None:
            db_url = os.getenv('DATABASE_URL', 'sqlite:////app/data/app.db')
        self.engine = create_engine(db_url, echo=False)
        self.SessionLocal = sessionmaker(bind=self.engine)

    def create_tables(self):
        """Create all tables"""
        Base.metadata.create_all(self.engine)

    def get_session(self):
        """Get database session"""
        return self.SessionLocal()

    def init_default_modules(self):
        """Initialize default modules if they don't exist"""
        session = self.get_session()
        try:
            # Check if modules already exist
            if session.query(Module).count() > 0:
                return

            # Default modules
            default_modules = [
                {
                    'name': 'Install Docker',
                    'description': 'Install Docker CE and add users to docker group',
                    'bash_code': '''# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh
systemctl enable docker
systemctl start docker''',
                    'priority': 10,
                    'enabled': True
                },
                {
                    'name': 'Install vim',
                    'description': 'Install vim text editor',
                    'bash_code': '''# Install vim
apt-get update
apt-get install -y vim''',
                    'priority': 20,
                    'enabled': True
                },
                {
                    'name': 'Install net-tools',
                    'description': 'Install network tools (ifconfig, netstat, etc.)',
                    'bash_code': '''# Install net-tools
apt-get update
apt-get install -y net-tools''',
                    'priority': 21,
                    'enabled': True
                },
                {
                    'name': 'Install htop',
                    'description': 'Install htop system monitor',
                    'bash_code': '''# Install htop
apt-get update
apt-get install -y htop''',
                    'priority': 22,
                    'enabled': True
                },
                {
                    'name': 'Configure sudoers',
                    'description': 'Enable passwordless sudo for sudo group',
                    'bash_code': '''# Configure passwordless sudo
echo '%sudo ALL=(ALL:ALL) NOPASSWD:ALL' > /etc/sudoers.d/sudo-nopasswd
chmod 0440 /etc/sudoers.d/sudo-nopasswd''',
                    'priority': 30,
                    'enabled': True
                },
                {
                    'name': 'Disable SSH password authentication',
                    'description': 'Disable password authentication for SSH (key-only)',
                    'bash_code': '''# Disable SSH password authentication
sed -i 's/^#*PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config.d/*.conf 2>/dev/null || true
systemctl restart sshd || systemctl restart ssh''',
                    'priority': 40,
                    'enabled': True
                },
                {
                    'name': 'Set hostname',
                    'description': 'Set system hostname',
                    'bash_code': '''# Set hostname
hostnamectl set-hostname "{input}"
echo "127.0.0.1 {input}" >> /etc/hosts''',
                    'priority': 50,
                    'enabled': True,
                    'requires_input': True,
                    'input_label': 'Hostname',
                    'input_default': 'server01'
                },
                {
                    'name': 'Set timezone',
                    'description': 'Configure system timezone',
                    'bash_code': '''# Set timezone
timedatectl set-timezone {input}''',
                    'priority': 51,
                    'enabled': True,
                    'requires_input': True,
                    'input_label': 'Timezone',
                    'input_default': 'UTC'
                }
            ]

            for module_data in default_modules:
                module = Module(**module_data)
                session.add(module)

            session.commit()
            print("Default modules initialized successfully")

        except Exception as e:
            session.rollback()
            print(f"Error initializing default modules: {e}")
        finally:
            session.close()


# Global database instance
db = Database()
