from abc import ABC, abstractmethod
from typing import Optional, BinaryIO
import uuid
import os
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class StorageProvider(ABC):
    """Abstract base class for storage providers."""

    @abstractmethod
    async def upload(
        self,
        bucket_name: str,
        object_name: str,
        data: BinaryIO,
        content_type: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> str:
        """Upload a file to storage."""
        pass

    @abstractmethod
    async def download(self, bucket_name: str, object_name: str) -> Optional[bytes]:
        """Download a file from storage."""
        pass

    @abstractmethod
    async def delete(self, bucket_name: str, object_name: str) -> bool:
        """Delete a file from storage."""
        pass

    @abstractmethod
    async def generate_signed_url(
        self, bucket_name: str, object_name: str, expires_in: int = 3600
    ) -> Optional[str]:
        """Generate a signed URL for temporary access."""
        pass

    @abstractmethod
    async def exists(self, bucket_name: str, object_name: str) -> bool:
        """Check if a file exists in storage."""
        pass


class MinIOStorageProvider(StorageProvider):
    """MinIO storage provider implementation."""

    def __init__(self):
        try:
            import minio
            from minio import Minio
            from minio.error import S3Error
            
            self.minio = minio
            self.Minio = Minio
            self.S3Error = S3Error
        except ImportError:
            raise ImportError("MinIO client library not installed. Please install with: pip install minio")

        self.client = Minio(
            settings.s3_endpoint.replace("http://", "").replace("https://", ""),
            access_key=settings.s3_access_key,
            secret_key=settings.s3_secret_key,
            secure=settings.s3_secure,
        )

    async def upload(
        self,
        bucket_name: str,
        object_name: str,
        data: BinaryIO,
        content_type: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> str:
        """Upload a file to MinIO."""
        try:
            if not self.client.bucket_exists(bucket_name):
                self.client.make_bucket(bucket_name)
            
            self.client.put_object(
                bucket_name=bucket_name,
                object_name=object_name,
                data=data,
                length=-1,
                content_type=content_type or "application/octet-stream",
                metadata=metadata or {},
            )
            return object_name
        except self.S3Error as e:
            logger.error(f"Failed to upload file to MinIO: {e}")
            raise

    async def download(self, bucket_name: str, object_name: str) -> Optional[bytes]:
        """Download a file from MinIO."""
        try:
            response = self.client.get_object(bucket_name, object_name)
            data = response.read()
            response.close()
            response.release_conn()
            return data
        except self.S3Error as e:
            logger.error(f"Failed to download file from MinIO: {e}")
            return None

    async def delete(self, bucket_name: str, object_name: str) -> bool:
        """Delete a file from MinIO."""
        try:
            self.client.remove_object(bucket_name, object_name)
            return True
        except self.S3Error as e:
            logger.error(f"Failed to delete file from MinIO: {e}")
            return False

    async def generate_signed_url(
        self, bucket_name: str, object_name: str, expires_in: int = 3600
    ) -> Optional[str]:
        """Generate a signed URL for temporary access."""
        try:
            url = self.client.presigned_get_object(
                bucket_name, object_name, expires=expires_in
            )
            return url
        except self.S3Error as e:
            logger.error(f"Failed to generate signed URL: {e}")
            return None

    async def exists(self, bucket_name: str, object_name: str) -> bool:
        """Check if a file exists in MinIO."""
        try:
            objects = self.client.list_objects(bucket_name, object_name, max_keys=1)
            return any(obj.object_name == object_name for obj in objects)
        except self.S3Error:
            return False


class LocalStorageProvider(StorageProvider):
    """Local filesystem storage provider for development."""

    def __init__(self, base_path: str = "/tmp/joblane-storage"):
        self.base_path = base_path
        os.makedirs(self.base_path, exist_ok=True)

    async def upload(
        self,
        bucket_name: str,
        object_name: str,
        data: BinaryIO,
        content_type: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> str:
        """Upload a file to local storage."""
        bucket_path = os.path.join(self.base_path, bucket_name)
        os.makedirs(bucket_path, exist_ok=True)
        
        file_path = os.path.join(bucket_path, object_name)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, "wb") as f:
            f.write(data.read())
        
        return object_name

    async def download(self, bucket_name: str, object_name: str) -> Optional[bytes]:
        """Download a file from local storage."""
        file_path = os.path.join(self.base_path, bucket_name, object_name)
        
        if not os.path.exists(file_path):
            return None
        
        with open(file_path, "rb") as f:
            return f.read()

    async def delete(self, bucket_name: str, object_name: str) -> bool:
        """Delete a file from local storage."""
        file_path = os.path.join(self.base_path, bucket_name, object_name)
        
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False

    async def generate_signed_url(
        self, bucket_name: str, object_name: str, expires_in: int = 3600
    ) -> Optional[str]:
        """Generate a signed URL (not applicable for local storage)."""
        return f"/storage/{bucket_name}/{object_name}"

    async def exists(self, bucket_name: str, object_name: str) -> bool:
        """Check if a file exists in local storage."""
        file_path = os.path.join(self.base_path, bucket_name, object_name)
        return os.path.exists(file_path)


# Storage provider factory
async def get_storage_provider() -> StorageProvider:
    """Get the appropriate storage provider based on configuration."""
    if settings.s3_endpoint and "minio" in settings.s3_endpoint:
        return MinIOStorageProvider()
    else:
        return LocalStorageProvider()


# Helper functions
async def generate_object_name(prefix: str = "uploads", extension: Optional[str] = None) -> str:
    """Generate a unique object name."""
    unique_id = str(uuid.uuid4())
    if extension:
        return f"{prefix}/{unique_id}.{extension}"
    return f"{prefix}/{unique_id}"