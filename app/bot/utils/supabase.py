from datetime import datetime, timezone

from supabase import AsyncClient, acreate_client

from app.config import SupabaseConfig

TABLE_NAME = "users"
CHAT_ID_FIELD = "chat_id"


class SupabaseStorage:
    """Async wrapper for querying user subscription data from Supabase."""

    def __init__(self, client: AsyncClient) -> None:
        self.client = client

    async def get_subscription(self, user_id: int) -> dict | None:
        """
        Fetches subscription fields (sub, expiry_time) for a user by chat_id.

        :param user_id: Telegram user ID.
        :return: Dict with 'sub' and 'days_left', or None if not found.
        """
        response = await (
            self.client
            .table(TABLE_NAME)
            .select("sub, expiry_time")
            .eq(CHAT_ID_FIELD, user_id)
            .maybe_single()
            .execute()
        )

        if not response or not response.data:
            return None

        data = response.data
        sub = data.get("sub") or "-"

        expiry_time = data.get("expiry_time")
        if expiry_time is not None:
            expiry_ts = int(expiry_time) / 1000
            now_ts = datetime.now(timezone.utc).timestamp()
            days_left = max(0, int((expiry_ts - now_ts) / 86400))
        else:
            days_left = "-"

        return {"sub": sub, "days_left": days_left}


async def create_supabase_storage(config: SupabaseConfig) -> SupabaseStorage:
    client = await acreate_client(config.URL, config.KEY)
    return SupabaseStorage(client)
