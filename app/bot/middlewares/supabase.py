from typing import Callable, Dict, Any, Awaitable

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject

from app.bot.utils.supabase import SupabaseStorage


class SupabaseMiddleware(BaseMiddleware):
    """Middleware for passing SupabaseStorage to handlers."""

    def __init__(self, supabase: SupabaseStorage) -> None:
        self.supabase = supabase

    async def __call__(
            self,
            handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
            event: TelegramObject,
            data: Dict[str, Any],
    ) -> Any:
        data["supabase"] = self.supabase
        return await handler(event, data)
