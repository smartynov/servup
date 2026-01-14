"""
API routes for server setup generator.
Implements REST API for users, modules, configurations, and script generation.
"""
import hashlib
import json
import os
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from models import db, User, Module, Configuration
from generator import ScriptGenerator

# Create API router
api_router = APIRouter(prefix='/api')

# Directory for storing generated scripts
SCRIPTS_DIR = '/app/scripts'
os.makedirs(SCRIPTS_DIR, exist_ok=True)


# Pydantic models for request/response validation
class UserCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=32)
    groups: str = Field(default='', max_length=256)
    ssh_keys: str = Field(default='')

    @validator('username')
    def validate_username(cls, v):
        if not ScriptGenerator.validate_username(v):
            raise ValueError('Invalid username format')
        return v

    @validator('ssh_keys')
    def validate_ssh_keys(cls, v):
        if v:
            keys = [k.strip() for k in v.split('\n') if k.strip()]
            for key in keys:
                if not ScriptGenerator.validate_ssh_key(key):
                    raise ValueError(f'Invalid SSH key format: {key[:50]}...')
        return v


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=1, max_length=32)
    groups: Optional[str] = Field(None, max_length=256)
    ssh_keys: Optional[str] = None

    @validator('username')
    def validate_username(cls, v):
        if v and not ScriptGenerator.validate_username(v):
            raise ValueError('Invalid username format')
        return v


class ModuleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: str = Field(default='')
    bash_code: str = Field(..., min_length=1)
    priority: int = Field(default=100)
    enabled: bool = Field(default=True)
    dependencies: str = Field(default='')
    requires_input: bool = Field(default=False)
    input_label: str = Field(default='')
    input_default: str = Field(default='')


class ModuleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    description: Optional[str] = None
    bash_code: Optional[str] = Field(None, min_length=1)
    priority: Optional[int] = None
    enabled: Optional[bool] = None
    dependencies: Optional[str] = None
    requires_input: Optional[bool] = None
    input_label: Optional[str] = None
    input_default: Optional[str] = None


class GenerateRequest(BaseModel):
    name: str = Field(default='')
    user_ids: List[int] = Field(default=[])
    module_ids: List[int] = Field(default=[])
    module_inputs: dict = Field(default={})  # {module_id: input_value}
    hostname: str = Field(default='')
    timezone: str = Field(default='UTC')


# Dependency to get database session
def get_db():
    """Get database session"""
    session = db.get_session()
    try:
        yield session
    finally:
        session.close()


# ============================================================================
# User Management Routes
# ============================================================================

@api_router.get('/users')
def get_users(session: Session = Depends(get_db)):
    """Get all users"""
    users = session.query(User).order_by(User.created_at.desc()).all()
    return [user.to_dict() for user in users]


@api_router.get('/users/{user_id}')
def get_user(user_id: int, session: Session = Depends(get_db)):
    """Get user by ID"""
    user = session.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return user.to_dict()


@api_router.post('/users')
def create_user(user_data: UserCreate, session: Session = Depends(get_db)):
    """Create new user"""
    user = User(
        username=user_data.username,
        groups=user_data.groups,
        ssh_keys=user_data.ssh_keys
    )
    session.add(user)
    try:
        session.commit()
        session.refresh(user)
        return user.to_dict()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@api_router.put('/users/{user_id}')
def update_user(user_id: int, user_data: UserUpdate, session: Session = Depends(get_db)):
    """Update user"""
    user = session.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')

    if user_data.username is not None:
        user.username = user_data.username
    if user_data.groups is not None:
        user.groups = user_data.groups
    if user_data.ssh_keys is not None:
        user.ssh_keys = user_data.ssh_keys

    try:
        session.commit()
        session.refresh(user)
        return user.to_dict()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@api_router.delete('/users/{user_id}')
def delete_user(user_id: int, session: Session = Depends(get_db)):
    """Delete user"""
    user = session.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')

    try:
        session.delete(user)
        session.commit()
        return {'message': 'User deleted successfully'}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Module Management Routes
# ============================================================================

@api_router.get('/modules')
def get_modules(session: Session = Depends(get_db)):
    """Get all modules"""
    modules = session.query(Module).order_by(Module.priority).all()
    return [module.to_dict() for module in modules]


@api_router.get('/modules/{module_id}')
def get_module(module_id: int, session: Session = Depends(get_db)):
    """Get module by ID"""
    module = session.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail='Module not found')
    return module.to_dict()


@api_router.post('/modules')
def create_module(module_data: ModuleCreate, session: Session = Depends(get_db)):
    """Create new module"""
    # Check if module with same name exists
    existing = session.query(Module).filter(Module.name == module_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail='Module with this name already exists')

    module = Module(
        name=module_data.name,
        description=module_data.description,
        bash_code=module_data.bash_code,
        priority=module_data.priority,
        enabled=module_data.enabled,
        dependencies=module_data.dependencies,
        requires_input=module_data.requires_input,
        input_label=module_data.input_label,
        input_default=module_data.input_default
    )
    session.add(module)
    try:
        session.commit()
        session.refresh(module)
        return module.to_dict()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@api_router.put('/modules/{module_id}')
def update_module(module_id: int, module_data: ModuleUpdate, session: Session = Depends(get_db)):
    """Update module"""
    module = session.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail='Module not found')

    # Update fields if provided
    if module_data.name is not None:
        module.name = module_data.name
    if module_data.description is not None:
        module.description = module_data.description
    if module_data.bash_code is not None:
        module.bash_code = module_data.bash_code
    if module_data.priority is not None:
        module.priority = module_data.priority
    if module_data.enabled is not None:
        module.enabled = module_data.enabled
    if module_data.dependencies is not None:
        module.dependencies = module_data.dependencies
    if module_data.requires_input is not None:
        module.requires_input = module_data.requires_input
    if module_data.input_label is not None:
        module.input_label = module_data.input_label
    if module_data.input_default is not None:
        module.input_default = module_data.input_default

    module.updated_at = datetime.utcnow()

    try:
        session.commit()
        session.refresh(module)
        return module.to_dict()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@api_router.delete('/modules/{module_id}')
def delete_module(module_id: int, session: Session = Depends(get_db)):
    """Delete module"""
    module = session.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail='Module not found')

    try:
        session.delete(module)
        session.commit()
        return {'message': 'Module deleted successfully'}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Script Generation Routes
# ============================================================================

@api_router.post('/generate')
def generate_script(request: GenerateRequest, session: Session = Depends(get_db)):
    """Generate bash script from configuration"""
    try:
        # Fetch users
        users = []
        if request.user_ids:
            users = session.query(User).filter(User.id.in_(request.user_ids)).all()

        # Fetch modules
        modules = []
        if request.module_ids:
            modules = session.query(Module).filter(
                Module.id.in_(request.module_ids),
                Module.enabled == True
            ).all()

        # Generate script
        generator = ScriptGenerator()
        script_content = generator.generate(
            users=users,
            modules=modules,
            module_inputs={int(k): v for k, v in request.module_inputs.items()},
            hostname=request.hostname,
            timezone=request.timezone
        )

        # Generate unique hash
        hash_input = f"{script_content}{datetime.utcnow().isoformat()}"
        script_hash = hashlib.sha256(hash_input.encode()).hexdigest()[:16]

        # Save configuration
        config = Configuration(
            name=request.name,
            hash=script_hash,
            hostname=request.hostname,
            timezone=request.timezone,
            script_content=script_content,
            module_inputs=json.dumps(request.module_inputs)
        )

        # Add relationships
        config.users = users
        config.modules = modules

        session.add(config)
        session.commit()
        session.refresh(config)

        # Save script to file
        script_path = os.path.join(SCRIPTS_DIR, f"{script_hash}.sh")
        with open(script_path, 'w') as f:
            f.write(script_content)

        return {
            'success': True,
            'configuration_id': config.id,
            'hash': script_hash,
            'script': script_content,
            'download_url': f'/scripts/{script_hash}.sh',
            'curl_command': f'curl -sL http://YOUR_SERVER/scripts/{script_hash}.sh | bash'
        }

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Configuration History Routes
# ============================================================================

@api_router.get('/configurations')
def get_configurations(session: Session = Depends(get_db)):
    """Get all saved configurations"""
    configs = session.query(Configuration).order_by(Configuration.created_at.desc()).all()
    return [config.to_dict() for config in configs]


@api_router.get('/configurations/{config_id}')
def get_configuration(config_id: int, session: Session = Depends(get_db)):
    """Get configuration by ID"""
    config = session.query(Configuration).filter(Configuration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail='Configuration not found')
    return config.to_dict(include_script=True)


@api_router.delete('/configurations/{config_id}')
def delete_configuration(config_id: int, session: Session = Depends(get_db)):
    """Delete configuration"""
    config = session.query(Configuration).filter(Configuration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail='Configuration not found')

    # Delete script file
    script_path = os.path.join(SCRIPTS_DIR, f"{config.hash}.sh")
    if os.path.exists(script_path):
        os.remove(script_path)

    try:
        session.delete(config)
        session.commit()
        return {'message': 'Configuration deleted successfully'}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Script Download Route
# ============================================================================

@api_router.get('/scripts/{script_hash}', response_class=PlainTextResponse)
def download_script(script_hash: str, session: Session = Depends(get_db)):
    """Download generated script by hash"""
    # Validate hash format
    if not script_hash.endswith('.sh'):
        raise HTTPException(status_code=400, detail='Invalid script format')

    script_hash = script_hash[:-3]  # Remove .sh extension

    # Find configuration
    config = session.query(Configuration).filter(Configuration.hash == script_hash).first()
    if not config:
        raise HTTPException(status_code=404, detail='Script not found')

    return config.script_content


# ============================================================================
# Statistics Route
# ============================================================================

@api_router.get('/stats')
def get_stats(session: Session = Depends(get_db)):
    """Get system statistics"""
    user_count = session.query(User).count()
    module_count = session.query(Module).count()
    config_count = session.query(Configuration).count()
    enabled_modules = session.query(Module).filter(Module.enabled == True).count()

    return {
        'users': user_count,
        'modules': module_count,
        'enabled_modules': enabled_modules,
        'configurations': config_count
    }
