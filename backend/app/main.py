from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.transcribe_router import transcribe_router
from api.router import router

app = FastAPI()


def include_router(app):
    app.include_router(
        transcribe_router,
        prefix="/api",
        tags=["User Backend"],
    )

    app.include_router(
        router,
        prefix="/api",
        tags=["DataBase Management"],
    )

def start_application():
    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    include_router(app)
    return app


app = start_application()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run('main:app')
