import asyncio
from datetime import datetime, timezone


class QueueManager:
    def __init__(self):
        self._queues: dict[str, asyncio.Queue] = {}

    def create(self, claim_id: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._queues[claim_id] = q
        return q

    def get(self, claim_id: str) -> asyncio.Queue | None:
        return self._queues.get(claim_id)

    async def push(self, claim_id: str, step: str, status: str, message: str) -> None:
        q = self._queues.get(claim_id)
        if q is None:
            return
        event = {
            "step": step,
            "status": status,
            "message": message,
            "ts": datetime.now(timezone.utc).isoformat(),
        }
        await q.put(event)

    async def close(self, claim_id: str) -> None:
        q = self._queues.get(claim_id)
        if q is not None:
            await q.put(None)

    def cleanup(self, claim_id: str) -> None:
        self._queues.pop(claim_id, None)


queue_manager = QueueManager()
