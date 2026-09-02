from fastapi import APIRouter

from app.routers import (
    ai,
    business_registrations,
    conflicts,
    datasets,
    destinations,
    evidence,
    health,
    locations,
    metrics,
    observations,
    sources,
)

api_v1_router = APIRouter(prefix="/api/v1")

# Mount all resource routers under /api/v1
api_v1_router.include_router(health.router)
api_v1_router.include_router(destinations.router)
api_v1_router.include_router(locations.router)
api_v1_router.include_router(sources.router)
api_v1_router.include_router(datasets.router)
api_v1_router.include_router(metrics.router)
api_v1_router.include_router(observations.router)
api_v1_router.include_router(evidence.router)
api_v1_router.include_router(business_registrations.router)
api_v1_router.include_router(ai.router)
api_v1_router.include_router(conflicts.router)


