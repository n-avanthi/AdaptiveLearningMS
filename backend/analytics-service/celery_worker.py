from celery import Celery

celery = Celery(
    'analytics_tasks',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

celery.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    task_track_started=True,  # Track task state
    task_ignore_result=False,  # Ensure results are stored
    task_acks_late=False,     # Acknowledge tasks early
    worker_prefetch_multiplier=1,  # Reduce prefetching to avoid overloading
    task_default_queue='celery',   # Explicitly set default queue
)

import tasks